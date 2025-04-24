// src/utils/llmProviders.js - LLM Provider Abstraction Layer
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import dotenv from 'dotenv';

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../../.env');

// Load environment variables
dotenv.config({ path: ENV_PATH });

/**
 * Base LLM Provider interface
 * Defines the contract for all LLM providers
 */
class LLMProvider {
  constructor(config) {
    this.name = 'BaseProvider';
    this.config = config || {};
  }
  
  /**
   * Generate completion from prompt
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options) {
    throw new Error('Method must be implemented by subclass');
  }
  
  /**
   * Test connection to provider
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    throw new Error('Method must be implemented by subclass');
  }
}

/**
 * Local LM Studio Provider implementation
 * Interfaces with locally hosted language models via LM Studio
 */
class LMStudioProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'LM Studio';
    this.endpoint = config.endpoint || 'http://localhost:1234/v1';
  }
  
  /**
   * Generate completion using local LM Studio endpoint
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options = {}) {
    const { 
      maxTokens = 100, 
      temperature = 0.7,
      systemPrompt = 'You are a helpful assistant.'
    } = options;
    
    try {
      console.log(`[${this.name}] Sending request to: ${this.endpoint}`);
      
      const response = await axios.post(`${this.endpoint}/chat/completions`, {
        model: 'local-model',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature
      });
      
      // Extract content based on OpenAI compatible format
      if (response.data?.choices && response.data.choices.length > 0 && response.data.choices[0].message?.content) {
        return response.data.choices[0].message.content.trim();
      }
      
      console.error(`[${this.name}] Unexpected response structure:`, JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from LM Studio');
    } catch (error) {
      console.error(`[${this.name}] API Error:`, error.message);
      if (error.response?.data) {
        console.error(`[${this.name}] Response details:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  
  /**
   * Test connection to LM Studio
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      const result = await this.generateCompletion('Test connection', { 
        maxTokens: 10,
        systemPrompt: 'Respond with "Connected" if you can read this.'
      });
      return { 
        success: true, 
        response: result,
        provider: this.name,
        endpoint: this.endpoint
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        provider: this.name
      };
    }
  }
}

/**
 * OpenAI Provider implementation
 * Interfaces with OpenAI API for model inference
 */
class OpenAIProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'OpenAI';
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }
  
  /**
   * Generate completion using OpenAI API
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options = {}) {
    const { 
      maxTokens = 100, 
      temperature = 0.7,
      systemPrompt = 'You are a helpful assistant.'
    } = options;
    
    try {
      console.log(`[${this.name}] Generating using model: ${this.model}`);
      
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data?.choices && response.data.choices.length > 0 && 
          response.data.choices[0].message?.content) {
        return response.data.choices[0].message.content.trim();
      }
      
      console.error(`[${this.name}] Unexpected response structure:`, JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from OpenAI');
    } catch (error) {
      console.error(`[${this.name}] API Error:`, error.message);
      if (error.response?.data) {
        console.error(`[${this.name}] Response details:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  
  /**
   * Test connection to OpenAI
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      const result = await this.generateCompletion('Test connection', { 
        maxTokens: 10,
        systemPrompt: 'Respond with "Connected" if you can read this.'
      });
      return { 
        success: true, 
        response: result,
        provider: this.name,
        model: this.model
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        provider: this.name
      };
    }
  }
}

/**
 * Google Gemini Provider implementation
 * Interfaces with Google's Generative AI API
 */
class GeminiProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'Google Gemini';
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-pro';
    this.apiVersion = 'v1beta';
    this.endpoint = `https://generativelanguage.googleapis.com/${this.apiVersion}/models/${this.model}:generateContent`;
    
    if (!this.apiKey) {
      throw new Error('Google API key is required for Gemini');
    }
  }
  
  /**
   * Generate completion using Google Gemini API
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options = {}) {
    const { 
      maxTokens = 100, 
      temperature = 0.7,
      systemPrompt = 'You are a helpful assistant.'
    } = options;
    
    try {
      console.log(`[${this.name}] Generating using model: ${this.model}`);
      
      // Combine system prompt and user prompt for Gemini
      const combinedPrompt = `${systemPrompt}\n\n${prompt}`;
      
      // Prepare request structure according to v1beta API specs
      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [{ text: combinedPrompt }]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topP: 0.95,
          topK: 40
        }
      };
      
      const response = await axios.post(
        `${this.endpoint}?key=${this.apiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Extract content from Gemini v1beta API response structure
      if (response.data?.candidates && 
          response.data.candidates.length > 0 && 
          response.data.candidates[0].content?.parts && 
          response.data.candidates[0].content.parts.length > 0) {
        const textContent = response.data.candidates[0].content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join('')
          .trim();
          
        return textContent || "No text content found in response";
      }
      
      console.error(`[${this.name}] Unexpected response structure:`, JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from Gemini API');
    } catch (error) {
      console.error(`[${this.name}] API Error:`, error.message);
      if (error.response?.data) {
        console.error(`[${this.name}] Response details:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  
  /**
   * Test connection to Google Gemini API
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      // Use a simple prompt for testing connection
      const result = await this.generateCompletion('Say "Connected successfully" if you can read this', { 
        maxTokens: 20,
        temperature: 0.1,
        systemPrompt: 'You are a helpful assistant.'
      });
      
      return { 
        success: true, 
        response: result,
        provider: this.name,
        model: this.model,
        apiVersion: this.apiVersion
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        provider: this.name,
        model: this.model
      };
    }
  }
}

/**
 * Anthropic Claude Provider implementation
 * Interfaces with Anthropic API for Claude models
 */
class AnthropicProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'Anthropic Claude';
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-2';
    
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }
  }
  
  /**
   * Generate completion using Anthropic API
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options = {}) {
    const { 
      maxTokens = 100, 
      temperature = 0.7,
      systemPrompt = 'You are a helpful assistant.'
    } = options;
    
    try {
      console.log(`[${this.name}] Generating using model: ${this.model}`);
      
      // Format prompt for Claude (including system instructions)
      const formattedPrompt = `${systemPrompt}\n\nHuman: ${prompt}\n\nAssistant:`;
      
      const response = await axios.post('https://api.anthropic.com/v1/complete', {
        model: this.model,
        prompt: formattedPrompt,
        max_tokens_to_sample: maxTokens,
        temperature
      }, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      });
      
      if (response.data?.completion) {
        return response.data.completion.trim();
      }
      
      console.error(`[${this.name}] Unexpected response structure:`, JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from Anthropic');
    } catch (error) {
      console.error(`[${this.name}] API Error:`, error.message);
      if (error.response?.data) {
        console.error(`[${this.name}] Response details:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  
  /**
   * Test connection to Anthropic
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      const result = await this.generateCompletion('Test connection', { 
        maxTokens: 10,
        systemPrompt: 'Respond with "Connected" if you can read this.'
      });
      return { 
        success: true, 
        response: result,
        provider: this.name,
        model: this.model
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        provider: this.name
      };
    }
  }
}

/**
 * Provider Factory
 * Creates appropriate provider instance based on type
 * 
 * @param {string} type - Provider type
 * @param {Object} config - Provider configuration
 * @returns {LLMProvider} - Provider instance
 */
export function createLLMProvider(type, config) {
  switch (type.toLowerCase()) {
    case 'lmstudio':
    case 'local':
      return new LMStudioProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'gemini':
    case 'google':
      return new GeminiProvider(config);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Template-based provider that requires no API connection
 * Fallback for when no LLM is available
 */
export class TemplateProvider extends LLMProvider {
  constructor() {
    super();
    this.name = 'Template System';
  }
  
  /**
   * Generate completion using templates
   * This is just a stub that will be replaced by actual template system
   */
  async generateCompletion(prompt, options = {}) {
    // The actual implementation will be in the respective modules
    return `Template system activated: ${prompt.substring(0, 20)}...`;
  }
  
  /**
   * Test connection (always succeeds since it's local)
   */
  async testConnection() {
    return { 
      success: true, 
      response: "Template system ready",
      provider: this.name
    };
  }
}

/**
 * Interactive provider selection utility
 * Prompts user to choose and configure an LLM provider
 * 
 * @returns {Promise<LLMProvider>} - Selected and configured provider
 */
export async function selectLLMProvider() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise(resolve => rl.question(query, resolve));
  
  try {
    console.log("\n========================================");
    console.log("🤖 SLIPPI COACH LLM PROVIDER SELECTION 🤖");
    console.log("========================================");
    console.log("1. Local LM Studio");
    console.log("2. OpenAI (GPT models)");
    console.log("3. Anthropic (Claude models)");
    console.log("4. Google (Gemini models)");
    console.log("5. Template System (no LLM)");
    
    const selection = await question("\nSelect a provider (1-5): ");
    let provider;
    
    switch (selection.trim()) {
      case '1':
        const endpoint = await question("Enter LM Studio endpoint (default: http://localhost:1234/v1): ");
        provider = createLLMProvider('lmstudio', { 
          endpoint: endpoint.trim() || 'http://localhost:1234/v1' 
        });
        break;
        
      case '2':
        const openaiKey = await question("Enter OpenAI API key: ");
        if (!openaiKey.trim()) {
          console.log("❌ OpenAI API key is required.");
          provider = new TemplateProvider();
          break;
        }
        
        const openaiModel = await question("Enter model name (default: gpt-3.5-turbo): ");
        provider = createLLMProvider('openai', { 
          apiKey: openaiKey.trim(),
          model: openaiModel.trim() || 'gpt-3.5-turbo'
        });
        
        // Update .env with API key
        updateEnvFile('OPENAI_API_KEY', openaiKey.trim());
        break;
        
      case '3':
        const anthropicKey = await question("Enter Anthropic API key: ");
        if (!anthropicKey.trim()) {
          console.log("❌ Anthropic API key is required.");
          provider = new TemplateProvider();
          break;
        }
        
        const anthropicModel = await question("Enter model name (default: claude-2): ");
        provider = createLLMProvider('anthropic', { 
          apiKey: anthropicKey.trim(),
          model: anthropicModel.trim() || 'claude-2'
        });
        
        // Update .env with API key
        updateEnvFile('ANTHROPIC_API_KEY', anthropicKey.trim());
        break;
      
      case '4':
        const geminiKey = await question("Enter Google API key: ");
        if (!geminiKey.trim()) {
          console.log("❌ Google API key is required for Gemini.");
          provider = new TemplateProvider();
          break;
        }
        
        const geminiModel = await question("Enter model name (default: gemini-pro): ");
        provider = createLLMProvider('gemini', { 
          apiKey: geminiKey.trim(),
          model: geminiModel.trim() || 'gemini-pro'
        });
        
        // Update .env with API key
        updateEnvFile('GEMINI_API_KEY', geminiKey.trim());
        break;
        
      case '5':
        provider = new TemplateProvider();
        break;
        
      default:
        console.log("Invalid selection. Defaulting to Template System.");
        provider = new TemplateProvider();
    }
    
    // Test connection
    console.log(`\nTesting connection to ${provider.name}...`);
    const testResult = await provider.testConnection();
    
    if (testResult.success) {
      console.log(`✅ Successfully connected to ${provider.name}`);
      if (testResult.response) {
        console.log(`Response: "${testResult.response}"`);
      }
    } else {
      console.log(`❌ Failed to connect to ${provider.name}: ${testResult.error}`);
      console.log("Defaulting to template-based system without LLM.");
      provider = new TemplateProvider();
    }
    
    rl.close();
    return provider;
  } catch (error) {
    console.error("Error during provider selection:", error.message);
    rl.close();
    return new TemplateProvider(); // Fallback to template system
  }
}

/**
 * Updates .env file with new key-value pair
 * 
 * @param {string} key - Environment variable key
 * @param {string} value - Environment variable value
 */
function updateEnvFile(key, value) {
  try {
    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf8');
    }
    
    const keyExists = envContent.includes(`${key}=`);
    
    if (keyExists) {
      // Update existing key
      const regex = new RegExp(`${key}=.*`, 'g');
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add new key
      envContent += `\n${key}=${value}`;
    }
    
    fs.writeFileSync(ENV_PATH, envContent.trim());
    console.log(`Updated ${key} in .env file`);
  } catch (error) {
    console.error(`Failed to update .env file: ${error.message}`);
  }
}

// Default exports
export default {
  createLLMProvider,
  selectLLMProvider,
  TemplateProvider
};