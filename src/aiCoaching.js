// src/aicoaching.js - Updated with OpenAI integration
import { characterNames } from './utils/slippiUtils.js';
import { executeOpenAIRequest } from './utils/api/openaiHandler.js';

/**
 * Generates comprehensive coaching advice using OpenAI
 * 
 * @param {string} apiKey - OpenAI API Key for authentication
 * @param {Object} matchData - Structured match statistics and player data
 * @returns {Promise<string>} - The generated coaching advice
 */
export async function generateCoachingAdvice(apiKey, matchData) {
  // Generate technical coaching prompt
  const prompt = createAdvancedCoachingPrompt(matchData);
  
  try {
    // Use OpenAI for coaching generation
    return executeOpenAIRequest(apiKey, prompt, {
      model: 'gpt-4.1',
      maxTokens: 1500, // Appropriate for detailed coaching advice
      temperature: 0.7,
      logRequest: true
    });
  } catch (error) {
    console.error('Error generating coaching advice:', error.message);
    if (error.response) {
      console.error('API error details:', JSON.stringify(error.response.data, null, 2));
    }
    return `Failed to generate coaching advice: ${error.message}`;
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
            : (characterNames[charId] || 'Unknown');
        
        return {
            playerNumber: idx + 1,
            character: charName,
            damageDealt: matchData.damageDealt?.[idx] || 0,
            stocksLost: matchData.stockLosses?.[idx] || 0
        };
      })
    : [];
  
  // Calculate derived statistics for deeper analysis
  const derivedStats = characterInfo.map(player => {
    return {
        ...player,
        damageEfficiency: player.stocksLost > 0 
            ? (player.damageDealt / player.stocksLost).toFixed(1) 
            : 'Perfect',
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
- Damage Efficiency: ${derivedStats.find(d => d.playerNumber === p.playerNumber).damageEfficiency}`
).join('\n\n')}

## Matchup Analysis:
${characterInfo.length >= 2 
? `${characterInfo[0].character} vs ${characterInfo[1].character}` 
: 'Insufficient data for matchup analysis'}

## Derived Performance Metrics:
${derivedStats.map(p => 
`Player ${p.playerNumber} (${p.character}):
- Performance Rating: ${p.performanceRating.score}/10
- Key Insight: ${p.performanceRating.insight}`
).join('\n\n')}

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

Your advice should be technically precise, mentioning specific frame data, advanced techniques, and matchup knowledge relevant to competitive play.
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
  if (typeof damageDealt !== 'number' || typeof stocksLost !== 'number') {
    return {
      score: 5,
      insight: 'Insufficient data for performance analysis'
    };
  }
  
  // Calculate base score from damage/stock ratio
  const damagePerStock = stocksLost > 0 ? damageDealt / stocksLost : damageDealt;
  
  // Normalized score between 1-10
  let score = Math.min(10, Math.max(1, Math.floor(damagePerStock / 25)));
  
  // Generate insights based on performance metrics
  let insight = '';
  if (score >= 9) {
    insight = 'Exceptional damage output with minimal stock losses. Focus on consistency.';
  } else if (score >= 7) {
    insight = 'Strong performance. Optimize punish game for greater damage efficiency.';
  } else if (score >= 5) {
    insight = 'Average performance. Improve neutral game positioning and defensive options.';
  } else if (score >= 3) {
    insight = 'Below average efficiency. Work on reducing unnecessary risks and improving recovery.';
  } else {
    insight = 'Significant improvement needed. Focus on fundamentals and avoiding early stock losses.';
  }
  
  return { score, insight };
}