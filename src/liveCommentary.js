// src/liveCommentary.js - Updated with OpenAI integration
import { characterNames } from './utils/slippiUtils.js';
import { executeOpenAIRequest } from './utils/api/openaiHandler.js';

// Commentary style constants
const COMMENTARY_STYLES = {
  TECHNICAL: 'technical',  // Frame data, execution quality, optimal strategies
  HYPE: 'hype',            // Exciting, crowd-pleasing commentary
  EDUCATIONAL: 'educational', // Explanatory commentary for learning
  ANALYTICAL: 'analytical'    // In-depth strategic analysis
};

// Cache for commentary to avoid repetition
const commentaryCache = new Map();
const CACHE_EXPIRY = 30000; // 30 seconds

/**
 * Generates real-time commentary for Slippi gameplay events
 * Enhanced with technical depth and advanced game understanding
 * 
 * @param {string} apiKey - OpenAI API Key for authentication
 * @param {Array} events - Gameplay events to comment on
 * @param {Object} options - Configuration options for commentary
 * @returns {Promise<string>} - The generated commentary
 */
export async function provideLiveCommentary(apiKey, events, options) {
  if (!events || events.length === 0) return;

  const {
    commentaryStyle = COMMENTARY_STYLES.TECHNICAL,
    maxLength = 150,
    playerContext = null,
    gameState = null,
    temperature = 0.75
  } = options;

  // Generate a cache key based on event content
  const cacheKey = generateCacheKey(events, commentaryStyle);

  // Check cache first to avoid repetitive commentary
  if (commentaryCache.has(cacheKey)) {
    const cached = commentaryCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
      console.log('Using cached commentary for similar events');
      return cached.commentary;
    }
  }

  // Build structured commentary prompt with technical depth
  const prompt = buildTechnicalCommentaryPrompt(events, commentaryStyle, playerContext, gameState);

  try {
    if (apiKey === 'local') {
      try {
        const response = await axios.post(`${lmStudioEndpoint}/v1/chat/completions`, {
          model: "meta-llama-3.1-70b-instruct",
          messages: [
            { role: "system", content: "You are a professional Melee coach." },
            { role: "user", content: prompt }
          ],
          max_tokens: maxLength,
          temperature
        });
        return response.data.text; // Adjust based on your LLM's response format
      } catch (err) {
        console.error('[LOCAL_LLM] Error generating commentary:', err.message);
        throw new Error('Local LLM request failed');
      }
    }

    throw new Error('No valid API key or LLM configuration found.');

    // Use OpenAI for concise, technically accurate commentary
    const commentary = await executeOpenAIRequest(apiKey, prompt, {
      model: 'meta-llama-3.1-70b-instruct',
      maxTokens: 100, // Keep it concise for real-time commentary
      temperature, 
      logRequest: false
    });

    // Cache the result
    if (commentary) {
      commentaryCache.set(cacheKey, {
        commentary,
        timestamp: Date.now()
      });
      
      // Trim cache if it grows too large
      if (commentaryCache.size > 100) {
        const oldestKey = [...commentaryCache.keys()]
          .sort((a, b) => commentaryCache.get(a).timestamp - commentaryCache.get(b).timestamp)[0];
        commentaryCache.delete(oldestKey);
      }
    }

    // Log the commentary for development
    console.log(`🎙️ LIVE COMMENTARY (${commentaryStyle}): ${commentary || 'No response.'}`);
    return commentary;

  } catch (err) {
    handleCommentaryError(err);
    return '';
  }
}

/**
 * Builds a technical commentary prompt with advanced game understanding
 * 
 * @param {Array} events - Gameplay events to comment on
 * @param {string} style - Commentary style to use
 * @param {Object} playerContext - Additional player information
 * @param {Object} gameState - Current game state information
 * @returns {string} - Structured prompt for the LLM
 */
function buildTechnicalCommentaryPrompt(events, style, playerContext, gameState) {
  // Parse events into structured format for analysis
  const parsedEvents = events.map(evt => {
    try {
      const event = typeof evt === 'string' ? JSON.parse(evt) : evt;
      
      // Enhance event with character names for better context
      if (event.playerIndex !== undefined && event.playerCharacter) {
        const charName = typeof event.playerCharacter === 'string' 
          ? event.playerCharacter
          : (characterNames[event.playerCharacter] || 'Unknown');
              
        event.playerCharacter = charName;
      }
      
      return event;
    } catch (e) {
      return { rawEvent: evt };
    }
  });
  
  // Commentary style instructions
  const styleInstructions = getStyleInstructions(style);
  
  // Add player context if available
  const playerContextStr = playerContext ? 
    `\nPlayer Context:\n${JSON.stringify(playerContext, null, 2)}` : '';
    
  // Add game state if available
  const gameStateStr = gameState ?
    `\nCurrent Game State:\n${JSON.stringify(gameState, null, 2)}` : '';
  
  // Build the complete prompt with technical focus
  return `
You are a professional Super Smash Bros. Melee commentator with deep technical knowledge of frame data, matchups, and competitive strategy.

${styleInstructions}

Recent gameplay events to commentate:
${JSON.stringify(parsedEvents, null, 2)}
${playerContextStr}
${gameStateStr}

Respond with a single natural-sounding commentary line that would be spoken by a professional commentator. Focus on the most technically interesting or significant aspect of these events.
`;
}

/**
 * Get commentary style-specific instructions
 * 
 * @param {string} style - Commentary style
 * @returns {string} - Style-specific instructions
 */
function getStyleInstructions(style) {
  switch (style) {
    case COMMENTARY_STYLES.TECHNICAL:
      return `Your commentary should focus on technical execution details such as:
- Frame-perfect inputs and their effectiveness
- L-cancel timing and efficiency
- Neutral game positioning and stage control
- Specific combo execution quality
- DI/SDI quality and defensive options
- Advanced techniques like wavedashing, shield dropping, etc.
Use precise technical terminology that competitive players would understand.`;
        
    case COMMENTARY_STYLES.HYPE:
      return `Your commentary should be exciting and energetic:
- Emphasize impressive moments and highlight exciting gameplay
- Use dynamic language that conveys the energy of competitive play
- Focus on the drama and tension of the match
- Acknowledge particularly impressive technical execution
Imagine you're commentating for a large tournament crowd.`;
        
    case COMMENTARY_STYLES.EDUCATIONAL:
      return `Your commentary should be educational and help viewers understand what's happening:
- Explain why certain techniques or decisions are effective
- Highlight learning opportunities from the gameplay
- Connect technical execution to strategic outcomes
- Provide context about matchup-specific interactions
- Use terminology that helps newer players understand advanced concepts
Strike a balance between accessibility and technical accuracy.`;
        
    case COMMENTARY_STYLES.ANALYTICAL:
      return `Your commentary should provide deep strategic insights:
- Analyze player decision-making and adaptations
- Evaluate risk/reward of observed gameplay choices
- Predict potential counterplay or adaptation opportunities
- Compare observed strategies to optimal or meta approaches
- Contextualize micro-decisions within the broader match strategy
Focus on the "why" behind gameplay decisions and their effectiveness.`;
        
    default:
      return `Provide natural, insightful commentary that blends technical analysis with engaging delivery.`;
  }
}

/**
 * Generates a cache key for commentary to prevent repetition
 * 
 * @param {Array} events - Events to comment on
 * @param {string} style - Commentary style
 * @returns {string} - Cache key
 */
function generateCacheKey(events, style) {
  try {
    // Extract essential information for caching
    const essentialData = events.map(evt => {
      const event = typeof evt === 'string' ? JSON.parse(evt) : evt;
      return {
        type: event.type,
        playerIndex: event.playerIndex,
        // Only include core event-specific fields
        ...(event.type === 'combo' ? { moves: event.moves, damage: event.damage } : {}),
        ...(event.type === 'stockLost' ? { stocksLost: event.stocksLost, remainingStocks: event.remainingStocks } : {})
      };
    });
    
    // Combine with style for unique key
    return `${style}:${JSON.stringify(essentialData)}`;
  } catch (e) {
    // Fallback for any parsing issues
    return `${style}:${Date.now()}`;
  }
}

/**
 * Handle API errors with appropriate logging
 * 
 * @param {Error} err - The error object
 */
function handleCommentaryError(err) {
  console.error('❌ Error generating commentary:', err.message);
  if (err.response?.data) {
    console.error('Error details:', JSON.stringify(err.response.data, null, 2));
  }
}

// Export the commentary style constants for use in other modules
export const CommentaryStyles = COMMENTARY_STYLES;

// filepath: c:\Users\blood\Desktop\coach clippi\src\enhancedCoach.js
async function processCommentary(contextData) {
    const eventsToProcess = contextData.events || []; // Ensure events are initialized
    if (eventsToProcess.length === 0) {
        console.warn("No events to process for commentary.");
        return;
    }

    await provideLiveCommentary(null, eventsToProcess, contextData);
}

async function main() {
    const contextData = {
        events: [], // Replace with actual events if available
        gameState: {}, // Replace with actual game state if available
    };

    await processCommentary(contextData);
}

main().catch(err => {
    console.error('❌ Error in main function:', err.message);
});