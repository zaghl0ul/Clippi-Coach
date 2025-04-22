// This file includes utility functions specifically for handling Slippi data, such as parsing frame data and extracting player statistics.

function parseFrameData(frameData) {
    // Extract relevant information from frame data
    const players = frameData.players.map(player => ({
        stocks: player.post.stocks,
        percent: player.post.percent,
        characterId: player.characterId,
        actionStateId: player.post.actionStateId,
    }));
    return players;
}

function extractPlayerStatistics(frames) {
    const stats = frames.reduce((acc, frame) => {
        frame.players.forEach((player, index) => {
            if (!acc[index]) {
                acc[index] = { damageDealt: 0, stockLosses: 0 };
            }
            acc[index].damageDealt += player.post.damage; // Assuming post.damage exists
            if (player.post.stocks < acc[index].stocks) {
                acc[index].stockLosses++;
            }
            acc[index].stocks = player.post.stocks; // Update current stocks
        });
        return acc;
    }, []);
    return stats;
}

function getMatchDuration(metadata) {
    return metadata.lastFrame || metadata.duration || 0;
}

export { parseFrameData, extractPlayerStatistics, getMatchDuration };