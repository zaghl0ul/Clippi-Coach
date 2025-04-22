// This file manages the generation of live commentary during gameplay. 
// It uses the AI models to provide real-time insights and commentary based on game events.

const axios = require('axios');
const { characterNames } = require('./utils/slippiUtils');

// Function to provide live commentary during gameplay
async function provideLiveCommentary(apiKey, events) {
    if (events.length === 0) return;

    const prompt = `
You are a professional Smash Bros Melee commentator watching a live match.
Based on these recent game events, provide brief, exciting commentary (1-2 sentences max), focusing on player actions and momentum shifts.
Do NOT include the player names or characters, keep it generic ("Player 1", "Fox", etc. are fine if necessary, but focus on the *action*).
Events:
${events.join('\n')}

Be concise, energetic, and insightful!
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent?key=${apiKey}`;
    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        }, {
            headers: { "Content-Type": "application/json" }
        });
        const commentary = response.data.candidates[0].content.parts[0].text;
        console.log(`[${new Date().toISOString()}] 🎙️ LIVE COMMENTARY: ${commentary.trim()}`);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] ❌ Error generating commentary:`, err.response?.data?.error?.message || err.message);
        if (err.response?.data?.error?.details) console.error(`[${new Date().toISOString()}] Error details:`, JSON.stringify(err.response.data.error.details, null, 2));
    }
}

module.exports = {
    provideLiveCommentary
};