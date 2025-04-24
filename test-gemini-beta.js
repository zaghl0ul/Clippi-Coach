// Test script for the Gemini provider with v1beta API endpoint
import { createLLMProvider } from './src/utils/llmProviders.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use the GEMINI_API_KEY from .env or fallback to API_KEY
const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

// Available models:
// - gemini-pro
// - gemini-1.0-pro
// - gemini-1.5-pro
// - gemini-1.5-flash

async function testGeminiBeta() {
  console.log("🧪 GEMINI API v1beta TEST 🧪");
  console.log("=============================");
  
  if (!API_KEY) {
    console.error("❌ No API key found. Please set GEMINI_API_KEY or API_KEY in your .env file.");
    return;
  }
  
  // Create provider with the v1beta endpoint
  const provider = createLLMProvider('gemini', {
    apiKey: API_KEY,
    model: 'gemini-pro'
  });
  
  console.log(`Created ${provider.name} provider`);
  console.log(`Model: ${provider.model}`);
  console.log(`API Version: ${provider.apiVersion}`);
  console.log(`Endpoint: ${provider.endpoint}`);
  
  try {
    // Test connection
    console.log("\nTesting connection...");
    const testResult = await provider.testConnection();
    
    if (testResult.success) {
      console.log(`✅ Success! Response: "${testResult.response}"`);
      
      // Try a more complex example
      console.log("\nTesting Melee commentary generation...");
      const meleeSampleEvent = {
        type: "combo",
        playerIndex: 0,
        playerCharacter: "Fox",
        moves: 4,
        damage: 54.3
      };
      
      const meleeSamplePrompt = `Provide technical commentary on this Melee event: ${JSON.stringify(meleeSampleEvent)}`;
      
      const commentary = await provider.generateCompletion(meleeSamplePrompt, {
        maxTokens: 150,
        temperature: 0.7,
        systemPrompt: 'You are an expert Super Smash Bros. Melee commentator with deep knowledge of frame data and technical execution.'
      });
      
      console.log("\nGenerated Commentary:");
      console.log(`"${commentary}"`);
      
    } else {
      console.log(`❌ Connection test failed: ${testResult.error}`);
    }
  } catch (error) {
    console.error("Error during test:", error.message);
    if (error.response?.data) {
      console.error("Response details:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

testGeminiBeta();