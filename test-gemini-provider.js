// Test script for the Gemini provider integration
import { createLLMProvider } from './src/utils/llmProviders.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// For testing, you can either:
// 1. Set GEMINI_API_KEY in your .env file, or
// 2. Pass a key directly here
const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || 'your_gemini_api_key';

async function testGeminiProvider() {
  console.log("Testing Gemini Provider Integration");
  console.log("==================================");
  
  try {
    // Create a Gemini provider instance
    const geminiProvider = createLLMProvider('gemini', {
      apiKey: API_KEY,
      model: 'gemini-pro' // Default model
    });
    
    console.log(`Created ${geminiProvider.name} provider using model: ${geminiProvider.model}`);
    
    // Test connection
    console.log("\nTesting connection...");
    const testResult = await geminiProvider.testConnection();
    
    if (testResult.success) {
      console.log(`✅ Successfully connected to ${testResult.provider}`);
      console.log(`Response: "${testResult.response}"`);
      
      // If connection works, try generating some Melee commentary
      console.log("\nGenerating Melee commentary example...");
      const meleeSampleEvent = {
        type: "combo",
        playerIndex: 0,
        playerCharacter: "Fox",
        moves: 4,
        damage: 54.3
      };
      
      const meleeSamplePrompt = `Provide technical commentary on this Melee event: ${JSON.stringify(meleeSampleEvent)}`;
      
      const commentary = await geminiProvider.generateCompletion(meleeSamplePrompt, {
        maxTokens: 50,
        temperature: 0.7,
        systemPrompt: 'You are an expert Super Smash Bros. Melee commentator with deep knowledge of frame data and technical execution.'
      });
      
      console.log("\nGenerated Commentary:");
      console.log(`"${commentary}"`);
      
    } else {
      console.log(`❌ Failed to connect: ${testResult.error}`);
    }
  } catch (error) {
    console.error("Error during test:", error.message);
  }
}

// Run the test
testGeminiProvider();