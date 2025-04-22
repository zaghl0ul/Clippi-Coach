import { startLiveMonitoring } from './liveMonitor.js';
import { provideLiveCommentary } from './liveCommentary.js';
import { getConfig } from './utils/configManager.js';

async function main() {
    const apiKey = getConfig('API_KEY'); // Use getConfig to retrieve the API key
    const address = "127.0.0.1"; // Replace with your Slippi relay or console address
    const port = 1667; // Default Slippi port

    console.log(`[${new Date().toISOString()}] Starting live monitoring...`);

    startLiveMonitoring(address, port, async (eventType, eventData) => {
        if (eventType === "combo") {
            await provideLiveCommentary(apiKey, [JSON.stringify(eventData)]);
        }
    });
}

main().catch(err => {
    console.error(`[${new Date().toISOString()}] Unexpected error: ${err.message}`);
});