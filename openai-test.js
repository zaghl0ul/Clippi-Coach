// openai-test.js
import dotenv from 'dotenv';
import { executeOpenAIRequest } from './src/utils/api/openaiHandler.js';
import readline from 'readline';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Tests OpenAI integration with a simple Melee-specific prompt
 */
async function testOpenAIIntegration() {
  console.log("OPENAI API INTEGRATION TEST");
  console.log("===========================");
  
  // Ask for API key if not in environment
  const apiKey = process.env.OPENAI_API_KEY || await promptForAPIKey();
  
  if (!apiKey) {
    console.error("No API key provided. Exiting test.");
    process.exit(1);
  }
  
  // Test prompt for Melee technical content
  const prompt = "Explain wavedashing in Super Smash Bros Melee, including the frame-perfect inputs required.";
  
  console.log(`\nTest prompt: "${prompt}"`);
  console.log("\nSending request to OpenAI...");
  
  try {
    console.time("Request duration");
    const result = await executeOpenAIRequest(apiKey, prompt, {
      model: 'gpt-4.1',
      maxTokens: 500,
      temperature: 0.7,
      logRequest: true
    });
    console.timeEnd("Request duration");
    
    console.log("\n=== RESPONSE ===\n");
    console.log(result);
    console.log("\n================\n");
    
    console.log("Integration test successful!");
  } catch (error) {
    console.error("\nTest failed:", error.message);
    
    if (error.response?.data) {
      console.error("API error details:", JSON.stringify(error.response.data, null, 2));
    }
    
    console.log("\nPossible solutions:");
    console.log("1. Verify your API key is correct");
    console.log("2. Check your OpenAI account has available credits");
    console.log("3. Ensure you have proper network connectivity");
  } finally {
    rl.close();
  }
}

/**
 * Prompts user for OpenAI API key if not in environment
 * @returns {Promise<string>} - OpenAI API key
 */
function promptForAPIKey() {
  return new Promise((resolve) => {
    rl.question("Enter your OpenAI API key: ", (apiKey) => {
      if (apiKey && apiKey.trim()) {
        console.log("Using provided API key");
        resolve(apiKey.trim());
      } else {
        console.log("No API key provided");
        resolve(null);
      }
    });
  });
}

// Run the test
testOpenAIIntegration().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
