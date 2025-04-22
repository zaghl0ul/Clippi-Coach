import { startLiveMonitoring } from './liveMonitor.js';
import { provideLiveCommentary } from './liveCommentary.js';
import { getConfig } from './utils/configManager.js';
import './utils/logger.js';

async function main() {
    console.log("Initializing Slippi Coach...");
    
    // Validate API key
    const apiKey = getConfig('API_KEY');
    if (!apiKey || apiKey === 'your_api_key_here' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        console.error('ERROR: Please set a valid API key in the .env file');
        console.error('Instructions: Update the .env file in the root directory with API_KEY=your_actual_api_key');
        process.exit(1);
    }
    
    // Connection parameters - matching your Dolphin Netplay configuration
    const address = "127.0.0.1";
    const port = 2626; // Exact port from your Dolphin Netplay Setup

    console.log(`Starting live monitoring on ${address}:${port}...`);
    console.log("Waiting for Slippi games...");

    try {
        startLiveMonitoring(address, port, async (eventType, eventData) => {
            try {
                if (eventType === "combo") {
                    await provideLiveCommentary(apiKey, [JSON.stringify(eventData)]);
                }
            } catch (eventError) {
                console.error(`Error processing ${eventType} event:`, eventError.message);
            }
        });
        
        console.log("Slippi Coach is now running! Press Ctrl+C to exit.");
    } catch (connectionError) {
        console.error(`Failed to start monitoring: ${connectionError.message}`);
        console.log("Check that:");
        console.log("1. Slippi Dolphin is running with Netplay Setup configured");
        console.log("2. Direct Connection is selected (as shown in your setup)");
        console.log("3. Port 2626 is specified in the Netplay configuration");
        console.log("4. You've pressed the 'Connect' button in the Netplay Setup");
        process.exit(1);
    }
}

main().catch(err => {
    console.error(`Unexpected error: ${err.message}`);
    console.error("Stack trace:", err.stack);
    process.exit(1);
});