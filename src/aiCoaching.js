// This file handles API calls to AI models for generating coaching advice based on the processed Slippi data. 
// It exports functions to send requests and receive responses from the AI services.

import axios from 'axios';

const AI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent';

async function generateCoachingAdvice(apiKey, matchData) {
    const prompt = createCoachingPrompt(matchData);
    
    try {
        const response = await axios.post(`${AI_API_URL}?key=${apiKey}`, {
            contents: [{ parts: [{ text: prompt }] }]
        }, {
            headers: { "Content-Type": "application/json" }
        });
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error generating coaching advice:', error.message);
        throw new Error('Failed to generate coaching advice');
    }
}

function createCoachingPrompt(matchData) {
    return `
You are a professional Smash Bros Melee coach analyzing a completed match.

Match stats:
- Player 1 Damage Dealt: ${matchData.damageDealt[0]}
- Player 2 Damage Dealt: ${matchData.damageDealt[1]}
- Player 1 Stocks Lost: ${matchData.stockLosses[0]}
- Player 2 Stocks Lost: ${matchData.stockLosses[1]}

Provide targeted coaching advice focusing on character-specific strategies and common mistakes.
`;
}

export { generateCoachingAdvice };