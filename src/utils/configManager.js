// This file contains functions to manage configuration settings, including reading from and writing to the .env file for API keys and other settings.

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG_FILE = path.join(__dirname, '../../.env');

export function getConfig(key) {
    return process.env[key];
}

export function setConfig(key, value) {
    const envContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    const newEnvContent = envContent.split('\n').map(line => {
        if (line.startsWith(key)) {
            return `${key}=${value}`;
        }
        return line;
    }).join('\n');

    fs.writeFileSync(CONFIG_FILE, newEnvContent, 'utf8');
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