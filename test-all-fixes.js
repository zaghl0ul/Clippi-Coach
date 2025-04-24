// Test script to verify all implemented fixes
import { createLLMProvider } from './src/utils/llmProviders.js';
import { generateCoachingAdvice } from './src/aiCoaching.js';
import { COMMENTARY_STYLES } from './src/utils/constants.js';
import { COMMENTARY_MODES } from './src/hybridCommentary.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// For testing, read API key from .env
const API_KEY = process.env.API_KEY || 'local';
const LM_STUDIO_ENDPOINT = process.env.LM_STUDIO_ENDPOINT || 'http://localhost:1234/v1';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function runAllTests() {
  console.log("🧪 SLIPPI COACH TEST SCRIPT 🧪");
  console.log("=============================");
  console.log(`Current configuration: API_KEY=${API_KEY}`);
  
  // 1. Test constant imports
  console.log("\n✅ COMMENTARY_STYLES imported successfully");
  console.log(COMMENTARY_STYLES);
  console.log("\n✅ COMMENTARY_MODES imported successfully");
  console.log(COMMENTARY_MODES);
  
  // 2. Test LLM provider creation based on configured API_KEY
  try {
    let provider;
    
    if (API_KEY === 'local') {
      console.log(`\nCreating Local LLM provider with endpoint: ${LM_STUDIO_ENDPOINT}`);
      provider = createLLMProvider('local', {
        endpoint: LM_STUDIO_ENDPOINT
      });
    } else if (GEMINI_API_KEY) {
      console.log("\nCreating Google Gemini provider");
      provider = createLLMProvider('gemini', {
        apiKey: GEMINI_API_KEY
      });
    } else {
      console.log("\nCreating default provider with API key");
      provider = createLLMProvider('openai', {
        apiKey: API_KEY
      });
    }
    
    console.log(`✅ Provider created: ${provider.name}`);
    
    // 3. Test sample coaching request
    console.log("\nTesting coaching function with mock data...");
    
    const mockMatchData = {
      characters: ['Fox', 'Marth'],
      damageDealt: [324.5, 289.2],
      stockLosses: [2, 3]
    };
    
    // Only test with provider if we're sure it's properly configured
    if (provider) {
      const advice = await generateCoachingAdvice(provider, mockMatchData);
      console.log("\nCoaching advice generated successfully!");
      console.log("Preview: " + advice.substring(0, 100) + "...");
    } else {
      console.log("\n❌ Skipping provider test as no valid provider was created");
    }
    
    console.log("\n✅ All tests completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

// Run the tests
runAllTests();