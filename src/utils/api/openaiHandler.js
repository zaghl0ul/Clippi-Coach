// src/utils/api/openaiHandler.js
import axios from 'axios';

/**
 * Executes OpenAI API request with optimized parameters for Slippi technical analysis
 * 
 * @param {string} apiKey - OpenAI API key
 * @param {string} prompt - Technical analysis prompt
 * @param {Object} options - Configuration parameters
 * @returns {Promise<string>} - Generated text from OpenAI
 */
export async function executeOpenAIRequest(apiKey, prompt, options = {}) {
  // Default parameters optimized for technical Slippi analysis
  const {
    model = 'gpt-3.5-turbo', // Can be upgraded to gpt-4 for more advanced analysis
    maxTokens = 1024,
    temperature = 0.7,
    topP = 1.0,
    frequencyPenalty = 0,
    presencePenalty = 0,
    logRequest = false
  } = options;

  if (logRequest) {
    console.log(`[OPENAI] Executing request to model ${model} with ${maxTokens} max tokens`);
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: 'You are an expert Super Smash Bros. Melee technical analyst and coach with deep knowledge of frame data, competitive play, and technical execution.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    // Extract content using standard OpenAI response format
    if (response.data?.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      console.error('[OPENAI] Unexpected response structure:', JSON.stringify(response.data, null, 2));
      return 'Unable to generate content due to unexpected API response format.';
    }
  } catch (error) {
    console.error('[OPENAI] API request failed:', error.message);
    if (error.response?.data) {
      console.error('[OPENAI] Error details:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`OpenAI request failed: ${error.message}`);
  }
}
