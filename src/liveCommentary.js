// src/liveCommentary.js modification
import { generateTemplateCommentary } from './templateCommentarySystem.js';

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
    if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
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

// Helper function for style-specific system prompts
function getSystemPromptForStyle(style) {
  switch (style) {
    case COMMENTARY_STYLES.TECHNICAL:
      return 'You are a technical Melee commentator with deep frame data knowledge. Provide concise, insightful commentary in a single short sentence.';
    case COMMENTARY_STYLES.HYPE:
      return 'You are an energetic Melee commentator who builds excitement. Provide a short, enthusiastic comment in a single sentence.';
    default:
      return 'You are a professional Super Smash Bros. Melee commentator. Provide a single, brief commentary line.';
  }
}