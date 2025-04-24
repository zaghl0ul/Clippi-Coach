// src/liveCommentary.js
import { generateTemplateCommentary } from './templateCommentarySystem.js';
import { COMMENTARY_STYLES, CACHE_EXPIRY } from './utils/constants.js';

// Cache for commentaries to reduce duplicate API calls
const commentaryCache = new Map();

/**
 * Provides live commentary based on gameplay events
 * 
 * @param {Object} llmProvider - LLM provider instance
 * @param {Array} events - Gameplay events to comment on
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - Generated commentary
 */
export async function provideLiveCommentary(llmProvider, events, options = {}) {
  if (!events || events.length === 0) return '';
  
  const {
    commentaryStyle = COMMENTARY_STYLES.TECHNICAL,
    maxLength = 100,
    gameState = null,
    temperature = 0.75,
  } = options;
  
  // Parse and prepare the first event for processing
  let event;
  try {
    event = typeof events[0] === 'string' ? JSON.parse(events[0]) : events[0];
  } catch (e) {
    console.warn('Error parsing event:', e.message);
    return 'Exciting match action!';
  }
  
  // Generate cache key for deduplication
  const cacheKey = generateCacheKey(event, commentaryStyle);
  if (commentaryCache.has(cacheKey)) {
    const cached = commentaryCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_EXPIRY.COMMENTARY) {
      return cached.commentary;
    }
    commentaryCache.delete(cacheKey);
  }
  
  // If no LLM provider is available, use template system
  if (!llmProvider) {
    const commentary = generateTemplateCommentary(event, gameState);
    
    // Cache template results too
    if (commentary) {
      commentaryCache.set(cacheKey, {
        commentary,
        timestamp: Date.now()
      });
    }
    
    console.log(`🎙️ TEMPLATE COMMENTARY: ${commentary}`);
    return commentary;
  }
  
  // Build LLM prompt with appropriate context and style
  const prompt = buildTechnicalCommentaryPrompt(event, commentaryStyle, null, gameState);
  
  try {
    console.log(`[${llmProvider.name}] Generating commentary...`);
    
    // Use provider abstraction for consistent interface
    const commentary = await llmProvider.generateCompletion(prompt, {
      maxTokens: maxLength,
      temperature,
      systemPrompt: getSystemPromptForStyle(commentaryStyle)
    });
    
    // Cache successful results
    if (commentary) {
      commentaryCache.set(cacheKey, {
        commentary,
        timestamp: Date.now()
      });
    }
    
    console.log(`🎙️ ${llmProvider.name.toUpperCase()} COMMENTARY: ${commentary || 'No response'}`);
    return commentary || 'Exciting gameplay!';
  } catch (err) {
    console.error('Error generating commentary:', err.message);
    
    // Graceful fallback to templates on error
    const fallbackCommentary = generateTemplateCommentary(event, gameState);
    console.log(`🎙️ FALLBACK: ${fallbackCommentary}`);
    return fallbackCommentary;
  }
}

/**
 * Helper function for style-specific system prompts
 * 
 * @param {string} style - Commentary style
 * @returns {string} - System prompt for the style
 */
function getSystemPromptForStyle(style) {
  switch (style) {
    case COMMENTARY_STYLES.TECHNICAL:
      return 'You are a technical Melee commentator with deep frame data knowledge. Provide concise, insightful commentary in a single short sentence.';
    case COMMENTARY_STYLES.HYPE:
      return 'You are an energetic Melee commentator who builds excitement. Provide a short, enthusiastic comment in a single sentence.';
    case COMMENTARY_STYLES.CASUAL:
      return 'You are a casual-friendly Melee commentator making the game accessible to viewers. Provide a simple, clear comment that explains what happened.';
    case COMMENTARY_STYLES.ANALYTICAL:
      return 'You are an analytical Melee commentator focusing on strategy and decision making. Provide a short, insightful comment about the strategic implications.';
    default:
      return 'You are a professional Super Smash Bros. Melee commentator. Provide a single, brief commentary line.';
  }
}

/**
 * Builds a prompt for commentary generation
 * 
 * @param {Object} event - Event to commentate
 * @param {string} style - Commentary style
 * @param {Object} eventContext - Additional event context
 * @param {Object} gameState - Game state
 * @returns {string} - Formatted prompt
 */
function buildTechnicalCommentaryPrompt(event, style, eventContext = null, gameState = null) {
  // Base system instruction
  let promptBase = `You are an expert Super Smash Bros. Melee commentator with deep knowledge of frame data, 
competitive play, and technical execution. Your commentary style is "${style}".

Provide brief, technically accurate, and insightful commentary for the following event.
`;

  // Add game state context if available
  if (gameState) {
    promptBase += `
Game State Context:
${JSON.stringify(gameState, null, 2)}
`;
  }

  // Add event data
  promptBase += `
Current event: ${JSON.stringify(event, null, 2)}
`;

  // Add event-specific instructions for technical accuracy
  switch(event.type) {
    case 'combo':
      promptBase += `
For this combo, focus on:
- Frame advantage of the starter move
- Technical execution quality
- DI expectations and opponent counterplay opportunities
- Follow-up potential based on percent and positioning

Provide a single, concise line of commentary (30-60 characters) that would be spoken by a professional commentator.
`;
      break;
      
    case 'stockLost':
      promptBase += `
For this stock loss, focus on:
- Kill confirm technical execution
- Percent thresholds for the character matchup
- Stage positioning factors
- Potential DI or technical escape options

Provide a single, concise line of commentary (30-60 characters) that would be spoken by a professional commentator.
`;
      break;
      
    case 'actionState':
      promptBase += `
For this technical execution, focus on:
- Frame-perfect timing requirements
- Positional advantages gained
- Risk/reward assessment
- Follow-up opportunities created

Provide a single, concise line of commentary (30-60 characters) that would be spoken by a professional commentator.
`;
      break;
      
    default:
      promptBase += `
Provide a single, concise line of commentary (30-60 characters) that would be spoken by a professional commentator.
Focus on technical execution, strategic implications, and competitive relevance.
`;
  }
  
  return promptBase;
}

/**
 * Generates a cache key for commentary deduplication
 * 
 * @param {Object} event - Event to generate key for
 * @param {string} style - Commentary style
 * @returns {string} - Cache key
 */
function generateCacheKey(event, style) {
  const eventType = event.type || 'unknown';
  const playerIndex = event.playerIndex !== undefined ? event.playerIndex : 'na';
  const additionalKey = (() => {
    switch (eventType) {
      case 'combo':
        return `${event.moves || '?'}-${event.damage || '?'}`;
      case 'stockLost':
        return `${event.remainingStocks || '?'}`;
      case 'actionState':
        return `${event.subType || 'generic'}`;
      default:
        return 'default';
    }
  })();
  
  return `${eventType}-${playerIndex}-${additionalKey}-${style}`;
}

export default { provideLiveCommentary };