// src/utils/apiIntegration.js
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { setConfig, getConfig } from './configManager.js';

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Gemini API configuration constants
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro-preview-03-25';
const GEMINI_ENDPOINTS = {
    'gemini-2.5-pro-preview-03-25': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-03-25:generateContent',
    'gemini-pro-vision': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent',
    'gemini-ultra': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-ultra:generateContent'
};

/**
 * Validates and configures the Google API key for Gemini integration
 * Ensures proper environment setup for LLM capabilities
 * 
 * @param {string} apiKey - The API key to validate
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Validation results and configuration info
 */
export async function configureGeminiAPI(apiKey = null, options = {}) {
    // Load environment variables if not already loaded
    dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });
    
    // Use provided API key or get from environment
    const key = apiKey || getConfig('API_KEY');
    
    // Skip validation for proxy URLs
    if (key && key.startsWith('http')) {
        console.log('Using proxy endpoint for AI services');
        return {
            valid: true,
            isProxy: true,
            apiKey: key,
            model: 'proxy-endpoint'
        };
    }
    
    // Validate the API key format for Gemini
    if (!key || typeof key !== 'string' || !key.startsWith('AIza')) {
        console.error('Invalid Google API key format. Keys should start with "AIza"');
        return {
            valid: false,
            error: 'Invalid API key format'
        };
    }
    
    const {
        model = DEFAULT_GEMINI_MODEL,
        validateConnection = true
    } = options;
    
    // Get the appropriate endpoint URL
    const endpoint = GEMINI_ENDPOINTS[model] || GEMINI_ENDPOINTS[DEFAULT_GEMINI_MODEL];
    
    // Test the API key with a simple request if validation is enabled
    if (validateConnection) {
        try {
            const { default: axios } = await import('axios');
            
            // Simple validation request
            await axios.post(
                `${endpoint}?key=${key}`,
                {
                    contents: [
                        {
                            parts: [{ text: "Hello, please respond with 'API key is valid'" }]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 10
                    }
                },
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            
            console.log('✅ Google API key validated successfully');
        } catch (error) {
            console.error('❌ API key validation failed:', error.message);
            if (error.response) {
                console.error('Error details:', error.response.data);
            }
            
            return {
                valid: false,
                error: error.message,
                details: error.response?.data || null
            };
        }
    }
    
    // Update environment config if key is valid and different
    if (key !== getConfig('API_KEY')) {
        setConfig('API_KEY', key);
        console.log('Updated API key in configuration');
    }
    
    return {
        valid: true,
        isProxy: false,
        apiKey: key,
        model,
        endpoint
    };
}

/**
 * Initializes the environment with the provided Google API key
 * Sets up proper configuration for enhanced LLM capabilities
 * 
 * @param {string} apiKey - Google API key to initialize
 * @returns {Promise<boolean>} - Success status
 */
export async function initializeAPIEnvironment(apiKey) {
    try {
        // Validate and configure the API
        const config = await configureGeminiAPI(apiKey);
        
        if (!config.valid) {
            console.error(`Failed to initialize API environment: ${config.error}`);
            return false;
        }
        
        // Update the .env file
        const envPath = path.join(PROJECT_ROOT, '.env');
        let envContent = '';
        
        // Read existing .env file if it exists
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
            
            // Replace existing API_KEY line
            if (envContent.includes('API_KEY=')) {
                envContent = envContent.replace(
                    /API_KEY=.*/,
                    `API_KEY=${apiKey}`
                );
            } else {
                // Add API_KEY line if not present
                envContent += `\nAPI_KEY=${apiKey}`;
            }
        } else {
            // Create new .env file
            envContent = `API_KEY=${apiKey}\n`;
        }
        
        // Write updated content back to .env
        fs.writeFileSync(envPath, envContent, 'utf8');
        
        console.log('✅ API environment initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize API environment:', error.message);
        return false;
    }
}

/**
 * Advanced model parameter optimization for different commentary scenarios
 * 
 * @param {string} scenario - The usage scenario for parameter optimization
 * @returns {Object} - Optimized model parameters
 */
export function getOptimizedParameters(scenario) {
    // Parameter sets optimized for different usage scenarios
    const parameterSets = {
        'live-commentary': {
            temperature: 0.8,    // More creative for live commentary
            topP: 0.95,          // Allow more diverse outputs
            topK: 40,            // Maintain a good range of token options
            maxTokens: 100       // Short and snappy for live commentary
        },
        'technical-analysis': {
            temperature: 0.4,    // More deterministic for technical analysis
            topP: 0.85,          // More focused sampling
            topK: 20,            // More concentrated token selection
            maxTokens: 800       // Longer outputs for detailed analysis
        },
        'coaching': {
            temperature: 0.6,    // Balance of creativity and accuracy
            topP: 0.9,           // Balanced token sampling
            topK: 30,            // Moderate token diversity
            maxTokens: 500       // Medium length for coaching insights
        },
        'combo-description': {
            temperature: 0.7,    // Creative but accurate for combos
            topP: 0.92,          // Allow some flexibility
            topK: 40,            // Wide range for exciting descriptions
            maxTokens: 150       // Brief but rich descriptions
        }
    };
    
    // Return optimized parameters or defaults
    return parameterSets[scenario] || {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxTokens: 256
    };
}

/**
 * Generates a model signature for identifying LLM-enhanced content
 * 
 * @returns {string} - Signature string
 */
export function getModelSignature() {
    return `[Analysis powered by Gemini AI • ${new Date().toISOString().split('T')[0]}]`;
}