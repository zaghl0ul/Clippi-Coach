// src/liveCommentary.js - Updated with OpenAI integration & LM Studio Fix
import axios from 'axios'; // Make sure axios is imported
import dotenv from 'dotenv'; // Import dotenv
dotenv.config(); // Load environment variables

import { characterNames } from './utils/slippiUtils.js';
// You might still need executeOpenAIRequest if you intend to support BOTH local and OpenAI
// import { executeOpenAIRequest } from './utils/api/openaiHandler.js';

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
 * @param {string} apiKey - API Key ('local' for LM Studio, otherwise assumes OpenAI)
 * @param {Array} events - Gameplay events to comment on
 * @param {Object} options - Configuration options for commentary
 * @returns {Promise<string>} - The generated commentary
 */
export async function provideLiveCommentary(apiKey, events, options = {}) {
    if (!events || events.length === 0) return ''; // Return empty string instead of undefined

    const {
        commentaryStyle = COMMENTARY_STYLES.TECHNICAL,
        maxLength = 150,
        playerContext = null,
        gameState = null,
        temperature = 0.75,
        // Get endpoint from options or fallback to env/default
        localEndpoint = options.localEndpoint || process.env.LM_STUDIO_ENDPOINT || 'http://localhost:1234/v1'
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
         commentaryCache.delete(cacheKey); // Remove expired entry
    }

    // Build structured commentary prompt with technical depth
    const prompt = buildTechnicalCommentaryPrompt(events, commentaryStyle, playerContext, gameState);

    try {
        if (apiKey === 'local') {
            console.log(`[LOCAL_LLM] Sending commentary request to: ${localEndpoint}`);
            try {
                // Use the correct LM Studio endpoint structure (/v1/chat/completions)
                const response = await axios.post(`${localEndpoint}/chat/completions
`, {
                    model: 'local-model', // LM Studio usually ignores this, but good practice
                    messages: [
                        // System prompt needs to be defined or extracted from buildTechnicalCommentaryPrompt
                        { role: 'system', content: 'You are a professional Super Smash Bros. Melee commentator with deep technical knowledge.' }, // Example System Prompt
                        { role: 'user', content: prompt } // Send the built prompt as user content
                    ],
                    max_tokens: maxLength,
                    temperature: temperature
                    // Add other compatible parameters if needed (top_p, etc.)
                });

                // Extract content based on OpenAI compatible format
                if (response.data?.choices && response.data.choices.length > 0 && response.data.choices[0].message?.content) {
                    const commentary = response.data.choices[0].message.content.trim();

                    // Cache the result
                    if (commentary) {
                       commentaryCache.set(cacheKey, { commentary, timestamp: Date.now() });
                       // Trim cache if it grows too large
                       if (commentaryCache.size > 100) {
                           const oldestKey = [...commentaryCache.keys()]
                               .sort((a, b) => commentaryCache.get(a).timestamp - commentaryCache.get(b).timestamp)[0];
                           commentaryCache.delete(oldestKey);
                       }
                    }

                    console.log(`🎙️ LOCAL LLM COMMENTARY (${commentaryStyle}): ${commentary || 'No response.'}`);
                    return commentary; // --- RETURN HERE for local success ---
                } else {
                    console.error('[LOCAL_LLM] Unexpected commentary response structure:', JSON.stringify(response.data, null, 2));
                    throw new Error('Local LLM response format invalid');
                }
            } catch (err) {
                console.error('[LOCAL_LLM] Error generating commentary:', err.message);
                 if (err.response?.data) {
                     console.error('[LOCAL_LLM] Error details:', JSON.stringify(err.response.data, null, 2));
                 }
                 // Don't re-throw immediately, let the outer catch handle it for fallback
                 throw new Error('Local LLM request failed');
            }
        } else {
            // --- This is where OpenAI logic would go ---
            // If you want dual support, implement OpenAI call here using executeOpenAIRequest
            // Example:
            // const commentary = await executeOpenAIRequest(apiKey, prompt, { model: 'gpt-3.5-turbo', maxTokens: maxLength, temperature });
            // ... cache logic ...
            // console.log(`🎙️ OPENAI COMMENTARY (${commentaryStyle}): ${commentary || 'No response.'}`);
            // return commentary;

            // If ONLY supporting local, throw the error clearly
             console.error("Configuration Error: API Key is not 'local', but OpenAI path is not implemented or API key is invalid.");
             throw new Error('Non-local API key provided, but OpenAI handling is not configured in provideLiveCommentary.');
        }

    } catch (err) {
        // This catch block now handles errors from both local and potential OpenAI paths
        handleCommentaryError(err);
        // Consider a fallback template commentary here if needed
        // return generateTemplateCommentary(events, options.gameState); // Example fallback
        return 'Error generating commentary.'; // Return an error message or empty string
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
            console.warn(`Failed to parse event for prompt: ${e.message}`);
            return { rawEvent: evt }; // Include raw event on parse failure
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
    // Note: The system prompt is handled separately in the API call now
    return `
${styleInstructions}

Recent gameplay events to commentate:
${JSON.stringify(parsedEvents, null, 2)}
${playerContextStr}
${gameStateStr}

Respond with a single natural-sounding commentary line that would be spoken by a professional commentator. Focus on the most technically interesting or significant aspect of these events. Keep it concise.
`;
}


/**
 * Get commentary style-specific instructions
 *
 * @param {string} style - Commentary style
 * @returns {string} - Style-specific instructions
 */
function getStyleInstructions(style) {
    // (Keep the existing switch statement for styles: TECHNICAL, HYPE, EDUCATIONAL, ANALYTICAL)
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
            let event;
            try {
                event = typeof evt === 'string' ? JSON.parse(evt) : evt;
            } catch {
                return { type: 'parse_error' }; // Handle parse errors gracefully
            }
            return {
                type: event.type,
                playerIndex: event.playerIndex,
                // Only include core event-specific fields
                ...(event.type === 'combo' ? { moves: event.moves, damage: event.damage } : {}),
                ...(event.type === 'stockLost' ? { stocksLost: event.stocksLost, remainingStocks: event.remainingStocks } : {})
                // Add other relevant fields for other event types
            };
        });

        // Combine with style for unique key
        return `${style}:${JSON.stringify(essentialData)}`;
    } catch (e) {
        // Fallback for any unexpected parsing issues
        console.warn(`Error generating cache key: ${e.message}`);
        return `${style}:${Date.now()}`; // Use timestamp as a less effective fallback
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
    // Avoid logging stack trace for common API errors unless debugging
    // console.error(err.stack);
}

// Export the commentary style constants for use in other modules
export { COMMENTARY_STYLES }; // <-- CORRECT EXPORT NAME

// Remove the self-calling main function if it exists from previous testing
// async function main() { ... }
// main().catch(...)