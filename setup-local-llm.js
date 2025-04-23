// setup-local-llm.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import dotenv from 'dotenv';

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.join(__dirname, '.env');

// Load environment variables
dotenv.config({ path: ENV_PATH });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupLocalLLM() {
  console.log("Slippi Coach - Local LLM Configuration Setup");
  console.log("===========================================");
  console.log("This script will help you configure Slippi Coach to use a local LLM via LM Studio.");
  console.log("Make sure you have LM Studio running with the server enabled (default port: 1234)");
  console.log("");
  
  const useLocalLLM = await question("Do you want to use a local LLM through LM Studio? (y/n): ");
  
  let envContent = '';
  if (fs.existsSync(ENV_PATH)) {
    envContent = fs.readFileSync(ENV_PATH, 'utf8');
  }
  
  // Update or add API_KEY based on user choice
  if (useLocalLLM.toLowerCase() === 'y') {
    // Ask for custom endpoint
    const customEndpoint = await question("Enter LM Studio endpoint (leave blank for default http://localhost:1234): ");
    const endpoint = customEndpoint.trim() || 'http://localhost:1234';
    
    // Update API_KEY to 'local'
    if (envContent.includes('API_KEY=')) {
      // Save original key in case user wants to switch back
      if (!envContent.includes('OPENAI_API_KEY_BACKUP=') && !envContent.includes('API_KEY=local')) {
        const match = envContent.match(/API_KEY=([^\n]*)/);
        if (match && match[1] && match[1] !== 'local' && match[1] !== 'your_api_key_here') {
          envContent = envContent.replace(/API_KEY=([^\n]*)/, `API_KEY=local\nOPENAI_API_KEY_BACKUP=${match[1]}`);
        } else {
          envContent = envContent.replace(/API_KEY=([^\n]*)/, 'API_KEY=local');
        }
      } else {
        envContent = envContent.replace(/API_KEY=([^\n]*)/, 'API_KEY=local');
      }
    } else {
      envContent += 'API_KEY=local\n';
    }
    
    // Add or update LM_STUDIO_ENDPOINT
    if (envContent.includes('LM_STUDIO_ENDPOINT=')) {
      envContent = envContent.replace(/LM_STUDIO_ENDPOINT=([^\n]*)/, `LM_STUDIO_ENDPOINT=${endpoint}`);
    } else {
      envContent += `LM_STUDIO_ENDPOINT=${endpoint}\n`;
    }
    
    console.log("\nConfiguring for local LLM through LM Studio");
    console.log(`Endpoint: ${endpoint}`);
  } else {
    // User wants to use OpenAI - restore from backup if available
    if (envContent.includes('OPENAI_API_KEY_BACKUP=')) {
      const match = envContent.match(/OPENAI_API_KEY_BACKUP=([^\n]*)/);
      if (match && match[1]) {
        envContent = envContent.replace(/API_KEY=([^\n]*)/, `API_KEY=${match[1]}`);
        console.log("\nRestored OpenAI API key from backup");
      }
    } else {
      // Prompt for OpenAI key if no backup
      const apiKey = await question("Enter your OpenAI API key: ");
      if (apiKey.trim()) {
        if (envContent.includes('API_KEY=')) {
          envContent = envContent.replace(/API_KEY=([^\n]*)/, `API_KEY=${apiKey.trim()}`);
        } else {
          envContent += `API_KEY=${apiKey.trim()}\n`;
        }
      }
    }
  }
  
  // Write updated content back to .env
  fs.writeFileSync(ENV_PATH, envContent);
  
  console.log("\nConfiguration updated successfully!");
  console.log("Restart your application to apply the changes.");
  console.log("\nNext steps:");
  
  if (useLocalLLM.toLowerCase() === 'y') {
    console.log("1. Download LM Studio from https://lmstudio.ai if you haven't already");
    console.log("2. Load a model in LM Studio (recommended: Mistral 7B, Llama-3 8B, or similar)");
    console.log("3. Start the server in LM Studio (Settings > Server tab > Start)");
    console.log("4. Run your Slippi Coach application");
  } else {
    console.log("1. Ensure your OpenAI API key has been set correctly");
    console.log("2. Run your Slippi Coach application");
  }
  
  rl.close();
}

function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Run the setup
setupLocalLLM().catch(err => {
  console.error("Error during setup:", err);
  rl.close();
});