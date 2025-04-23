// implement-openai.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File path definitions
const API_DIR = path.join(__dirname, 'src', 'utils', 'api');

/**
 * Creates necessary directories
 */
function createDirectories() {
  if (!fs.existsSync(API_DIR)) {
    fs.mkdirSync(API_DIR, { recursive: true });
    console.log(`Created directory: ${API_DIR}`);
  }
}

/**
 * Writes implementation files
 */
function writeImplementationFiles() {
  // Write OpenAI handler
  const handlerPath = path.join(API_DIR, 'openaiHandler.js');
  fs.writeFileSync(handlerPath, getOpenAIHandlerCode());
  console.log(`Created OpenAI handler: ${handlerPath}`);
  
  // Write test script
  const testPath = path.join(__dirname, 'openai-test.js');
  fs.writeFileSync(testPath, getTestCode());
  console.log(`Created test script: ${testPath}`);
  
  // Update .env file
  updateEnvFile();
}

/**
 * Updates .env file with OpenAI key placeholder
 */
function updateEnvFile() {
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Add OPENAI_API_KEY if not present
    if (!envContent.includes('OPENAI_API_KEY=')) {
      envContent += '\nOPENAI_API_KEY=your_openai_key_here';
      fs.writeFileSync(envPath, envContent);
      console.log('Updated .env file with OpenAI API key placeholder');
    }
  } else {
    // Create new .env file
    envContent = 'OPENAI_API_KEY=your_openai_key_here\n';
    fs.writeFileSync(envPath, envContent);
    console.log('Created new .env file with OpenAI API key placeholder');
  }
}

/**
 * Returns OpenAI handler code
 */
function getOpenAIHandlerCode() {
  return `// src/utils/api/openaiHandler.js
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
    model = 'meta-llama-3.1-70b-instruct', // Can be upgraded to gpt-4 for more advanced analysis
    maxTokens = 1024,
    temperature = 0.7,
    topP = 1.0,
    frequencyPenalty = 0,
    presencePenalty = 0,
    logRequest = false
  } = options;

  if (logRequest) {
    console.log(\`[OPENAI] Executing request to model \${model} with \${maxTokens} max tokens\`);
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
          'Authorization': \`Bearer \${apiKey}\`
        }
      }
    );

    // Extract content using standard OpenAI response format
    if (response.data?.choices && response.data.choices.length > 0) {
      return response.data.choices?.[0]?.message?.content?.trim() || '⚠️ No response';
.data.choices[0].message.content;
    } else {
      console.error('[OPENAI] Unexpected response structure:', JSON.stringify(response.data, null, 2));
      return 'Unable to generate content due to unexpected API response format.';
    }
  } catch (error) {
    console.error('[OPENAI] API request failed:', error.message);
    if (error.response?.data) {
      console.error('[OPENAI] Error details:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(\`OpenAI request failed: \${error.message}\`);
  }
}
`;
}

/**
 * Returns test script code
 */
function getTestCode() {
  return `// openai-test.js
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
  
  console.log(\`\\nTest prompt: "\${prompt}"\`);
  console.log("\\nSending request to OpenAI...");
  
  try {
    console.time("Request duration");
    const result = await executeOpenAIRequest(apiKey, prompt, {
      model: 'meta-llama-3.1-70b-instruct',
      maxTokens: 500,
      temperature: 0.7,
      logRequest: true
    });
    console.timeEnd("Request duration");
    
    console.log("\\n=== RESPONSE ===\\n");
    console.log(result);
    console.log("\\n================\\n");
    
    console.log("Integration test successful!");
  } catch (error) {
    console.error("\\nTest failed:", error.message);
    
    if (error.response?.data) {
      console.error("API error details:", JSON.stringify(error.response.data, null, 2));
    }
    
    console.log("\\nPossible solutions:");
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
`;
}

/**
 * Main implementation function
 */
async function implementOpenAIIntegration() {
  console.log("OPENAI API INTEGRATION IMPLEMENTATION");
  console.log("====================================");
  
  try {
    // Create directories
    createDirectories();
    
    // Write implementation files
    writeImplementationFiles();
    
    console.log("\nImplementation complete!");
    console.log("\nNext steps:");
    console.log("1. Update your .env file with your OpenAI API key");
    console.log("2. Run test script: node openai-test.js");
    console.log("3. Update your Slippi Coach modules to use the OpenAI implementation");
    console.log("\nExample module update:");
    console.log("import { executeOpenAIRequest } from './utils/api/openaiHandler.js';");
    console.log("\nInstead of using Gemini API, use:");
    console.log("const analysis = await executeOpenAIRequest(process.env.OPENAI_API_KEY, prompt, {...});");
  } catch (error) {
    console.error("Implementation failed:", error.message);
  }
}

// Run implementation
implementOpenAIIntegration().catch(console.error);