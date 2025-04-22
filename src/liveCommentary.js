// This file manages the generation of live commentary during gameplay.
// It supports a proxy endpoint (e.g., Google Apps Script → OpenAI) and falls back to direct Gemini if needed.

import axios from 'axios';

// Sends batched events to the LLM and logs the commentary
async function provideLiveCommentary(apiKey, events) {
    if (!events || events.length === 0) return;

    // Build the commentary prompt
    const prompt = `
You are a professional esports commentator watching a live Super Smash Bros. Melee match.
Here are recent gameplay moments. Provide short, energetic commentary that reacts naturally to the action.
Keep it exciting, human, and full of insight.

Examples:
- "Marth corners Young Link on the right platform and snags a grab!"
- "Fox tries to whiff punish but gets shield grabbed."
- "Player 1 loses center stage after an unsafe nair."

Events:
${events.join('\n')}
`;

    const isProxy = apiKey.startsWith('http');
    let commentary = '';

    try {
        if (isProxy) {
            // Call the Apps Script proxy via GET to avoid CORS/403
            const resp = await axios.get(apiKey, {
                params: { prompt },
                headers: { 'Content-Type': 'application/json' }
            });
            // Apps Script returns raw OpenAI JSON
            const data = typeof resp.data === 'string'
                ? JSON.parse(resp.data)
                : resp.data;
            commentary = data.choices?.[0]?.message?.content?.trim() || '';

        } else {
            // Fallback to direct Gemini API
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent?key=${apiKey}`;
            const resp = await axios.post(
                geminiUrl,
                { contents: [{ parts: [{ text: prompt }] }] },
                { headers: { 'Content-Type': 'application/json' } }
            );
            commentary = resp.data?.candidates?.[0]?.content?.parts[0]?.text || '';
        }

        console.log(`🎙️ LIVE COMMENTARY: ${commentary || 'No response.'}`);

    } catch (err) {
        if (isProxy && err.response?.status === 403) {
            console.error('🚫 Proxy returned 403. Ensure your Apps Script is deployed as a Web App with "Anyone, even anonymous" access and you are calling the /exec URL via GET.');
        } else {
            console.error('❌ Error generating commentary:', err.response?.data?.error?.message || err.message);
            if (err.response?.data?.error?.details) {
                console.error('Details:', JSON.stringify(err.response.data.error.details, null, 2));
            }
        }
    }
}

export { provideLiveCommentary };
