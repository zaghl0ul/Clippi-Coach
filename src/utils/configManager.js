// This file contains functions to manage configuration settings, including reading from and writing to the .env file for API keys and other settings.

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const CONFIG_FILE = path.join(__dirname, '../../.env');

export function getConfig(key) {
    const value = process.env[key];
    if (!value || value === 'your_api_key_here' || value === 'YOUR_GEMINI_API_KEY_HERE') {
        console.warn(`Warning: Configuration key "${key}" not properly set in .env file`);
    }
    return value;
}

export function setConfig(key, value) {
    try {
        const envContent = fs.readFileSync(CONFIG_FILE, 'utf8');
        const lines = envContent.split('\n');
        
        let keyExists = false;
        const newLines = lines.map(line => {
            if (line.startsWith(`${key}=`)) {
                keyExists = true;
                return `${key}=${value}`;
            }
            return line;
        });
        
        // If the key doesn't exist, add it
        if (!keyExists) {
            newLines.push(`${key}=${value}`);
        }
        
        fs.writeFileSync(CONFIG_FILE, newLines.join('\n'), 'utf8');
        
        // Also update the current process environment
        process.env[key] = value;
        
        return true;
    } catch (err) {
        console.error(`Failed to update config: ${err.message}`);
        return false;
    }
}

export function loadConfig() {
    return new Promise((resolve, reject) => {
        fs.readFile(CONFIG_FILE, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            const config = {};
            data.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    config[key.trim()] = value.trim();
                }
            });
            resolve(config);
        });
    });
}