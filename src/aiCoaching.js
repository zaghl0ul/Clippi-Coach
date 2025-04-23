// src/aicoaching.js - Updated with OpenAI integration & LM Studio Fix
import dotenv from 'dotenv';
dotenv.config();

import { characterNames } from './utils/slippiUtils.js';
// Remove executeOpenAIRequest if ONLY using local LLM for this function
// import { executeOpenAIRequest } from './utils/api/openaiHandler.js';
import axios from 'axios';

/**
 * Generates comprehensive coaching advice using AI (Local or OpenAI)
 *
 * @param {string} apiKey - API Key ('local' for LM Studio, otherwise assumes OpenAI)
 * @param {Object} matchData - Structured match statistics and player data
 * @returns {Promise<string>} - The generated coaching advice
 */
export async function generateCoachingAdvice(apiKey, matchData) {
    if (!matchData || !matchData.characters || !matchData.damageDealt || !matchData.stockLosses) {
        console.warn("[AI Coaching] Insufficient match data provided.");
        return "Cannot generate coaching advice: Missing essential match data (characters, damage, stocks).";
    }

    const prompt = createAdvancedCoachingPrompt(matchData);
    // Get endpoint from environment or default
    const localEndpoint = process.env.LM_STUDIO_ENDPOINT || 'http://localhost:1234/v1';

    try {
        if (apiKey === 'local') {
            console.log(`[LOCAL_LLM] Sending coaching request to: ${localEndpoint}`);
            // Use the local LLM via OpenAI compatible endpoint
            const response = await axios.post(`${localEndpoint}/chat/completions`, {
                model: 'local-model', // Or specific model name if needed
                messages: [
                    // System prompt is part of createAdvancedCoachingPrompt output now
                    // { role: 'system', content: 'You are an elite-level Super Smash Bros. Melee coach...' },
                    { role: 'user', content: prompt } // Send the built prompt as user content
                ],
                max_tokens: 1500, // Adjust as needed
                temperature: 0.7
                // Add other compatible parameters if needed (top_p, etc.)
            });

            // Extract content based on OpenAI compatible format
            if (response.data?.choices && response.data.choices.length > 0 && response.data.choices[0].message?.content) {
                 const advice = response.data.choices[0].message.content.trim();
                 console.log(`[LOCAL_LLM] Coaching advice generated successfully.`);
                 return advice; // --- RETURN HERE for local success ---
            } else {
                console.error('[LOCAL_LLM] Unexpected coaching response structure:', JSON.stringify(response.data, null, 2));
                throw new Error('Local LLM coaching response format invalid');
            }
        } else {
             // --- This is where OpenAI logic would go ---
             // Example if supporting OpenAI:
             // const { executeOpenAIRequest } = await import('./utils/api/openaiHandler.js'); // Dynamic import if needed
             // const advice = await executeOpenAIRequest(apiKey, prompt, { model: 'gpt-4', maxTokens: 1500, temperature: 0.6 });
             // return advice;

             // If ONLY supporting local, throw the error clearly
             console.error("Configuration Error: API Key is not 'local', but OpenAI path is not implemented or API key is invalid.");
             throw new Error('Non-local API key provided, but OpenAI handling is not configured in generateCoachingAdvice.');
        }
    } catch (error) {
        console.error('[AI Coaching] Error generating coaching advice:', error.message);
        if (error.response?.data) {
           console.error('[AI Coaching] Error details:', JSON.stringify(error.response.data, null, 2));
        }
        // Re-throw or return a user-friendly error message
        // Consider returning a static error message instead of throwing?
        // return "Failed to generate coaching advice due to an internal error.";
        throw new Error(`Coaching advice generation failed: ${error.message}`);
    }
}

/**
 * Creates a sophisticated coaching prompt with enhanced technical focus
 *
 * @param {Object} matchData - Match statistics and player data
 * @returns {string} - The formatted prompt for the LLM
 */
function createAdvancedCoachingPrompt(matchData) {
    // Extract character names for more meaningful analysis
    const characterInfo = matchData.characters
        ? matchData.characters.map((charId, idx) => {
            const charName = typeof charId === 'string'
                ? charId
                : (characterNames[charId] || `ID ${charId}`); // Handle potential non-string IDs

            return {
                playerNumber: idx + 1,
                character: charName,
                damageDealt: matchData.damageDealt?.[idx] ?? 0, // Use nullish coalescing for safety
                stocksLost: matchData.stockLosses?.[idx] ?? 0
            };
        })
        : [];

    if (characterInfo.length === 0) {
        return "Error: No player character information found in match data.";
    }

    // Calculate derived statistics for deeper analysis
    const derivedStats = characterInfo.map(player => {
        return {
            ...player,
            damageEfficiency: player.stocksLost > 0
                ? (player.damageDealt / player.stocksLost).toFixed(1)
                : (player.damageDealt > 0 ? 'Perfect (0 stocks lost)' : 'N/A'), // More informative
            performanceRating: calculatePerformanceRating(
                player.damageDealt,
                player.stocksLost
            )
        };
    });

    // Build technically sophisticated prompt
    return `
You are an elite-level Super Smash Bros. Melee coach with comprehensive knowledge of frame data, character matchups, and competitive meta-game strategy.

Your task is to analyze the following match data and provide detailed, actionable coaching advice.

## Match Statistics:
${characterInfo.map(p =>
        `Player ${p.playerNumber} (${p.character}):
- Damage Dealt: ${p.damageDealt.toFixed(1)}
- Stocks Lost: ${p.stocksLost}
- Damage Efficiency: ${derivedStats.find(d => d.playerNumber === p.playerNumber)?.damageEfficiency || 'N/A'}` // Add safety check
    ).join('\n\n')}

## Matchup Analysis:
${characterInfo.length >= 2
        ? `${characterInfo[0].character} vs ${characterInfo[1].character}`
        : 'Insufficient data for matchup analysis'}

## Derived Performance Metrics:
${derivedStats.map(p => {
    const rating = p.performanceRating || { score: 'N/A', insight: 'Could not calculate rating' }; // Safety check
    return `Player ${p.playerNumber} (${p.character}):
- Performance Rating: ${rating.score}/10
- Key Insight: ${rating.insight}`;
    }).join('\n\n')}

Provide detailed coaching advice covering these areas:
1. Character-specific technical execution (wavedashing, L-canceling, shield pressure, edge-guarding techniques)
2. Neutral game assessment and improvement strategies
3. Punish game optimization opportunities
4. Matchup-specific adaptations and counterplay
5. Mental game considerations

For each area, include:
- Specific, actionable techniques to practice
- Frame-perfect execution guidelines where relevant
- Common mistakes to avoid
- Advanced techniques that top players utilize in this matchup

Your advice should be technically precise, mentioning specific frame data, advanced techniques, and matchup knowledge relevant to competitive play. Format the response clearly using markdown.
`;
}


/**
 * Calculates a performance rating based on match statistics
 * Used to generate more nuanced coaching advice
 *
 * @param {number} damageDealt - Total damage dealt by player
 * @param {number} stocksLost - Total stocks lost by player
 * @returns {Object} - Performance rating and insight
 */
function calculatePerformanceRating(damageDealt, stocksLost) {
    // Default values for error cases
    if (typeof damageDealt !== 'number' || typeof stocksLost !== 'number' || isNaN(damageDealt) || isNaN(stocksLost)) {
        console.warn(`Invalid input for calculatePerformanceRating: damage=${damageDealt}, stocks=${stocksLost}`);
        return {
            score: 5, // Return a neutral score
            insight: 'Insufficient or invalid data for performance analysis'
        };
    }

    // Calculate base score from damage/stock ratio
    // Handle division by zero gracefully
    const damagePerStock = stocksLost > 0 ? damageDealt / stocksLost : (damageDealt > 0 ? Infinity : 0);

    let score;
    if (damagePerStock === Infinity) {
        score = 10; // Perfect score if damage dealt and no stocks lost
    } else if (damagePerStock === 0 && stocksLost > 0) {
        score = 1; // Lowest score if stocks lost with zero damage
    } else if (damagePerStock === 0 && stocksLost === 0){
        score = 5; // Neutral score if no interaction
    }
     else {
        // Normalized score between 1-10 (adjust scale factor as needed)
        score = Math.min(10, Math.max(1, Math.floor(damagePerStock / 20))); // Adjusted scale factor
    }


    // Generate insights based on performance metrics
    let insight = '';
    if (score >= 9) {
        insight = 'Exceptional damage efficiency. Focus on consistency and adapting to opponent counterplay.';
    } else if (score >= 7) {
        insight = 'Strong performance. Look to optimize punish extensions and edgeguards for even greater efficiency.';
    } else if (score >= 5) {
        insight = 'Solid performance. Improve neutral game positioning and defensive option selection to create more openings.';
    } else if (score >= 3) {
        insight = 'Below average efficiency. Work on reducing unnecessary risks, improving recovery mixups, and capitalizing more on openings.';
    } else {
        insight = 'Significant improvement needed. Focus on fundamental mechanics, neutral spacing, defensive DI/techs, and avoiding early stock losses.';
    }

    // Include the calculated damage per stock in the insight for clarity
    insight += ` (Damage per stock: ${damagePerStock === Infinity ? 'Perfect' : damagePerStock.toFixed(1)})`;

    return { score, insight };
}