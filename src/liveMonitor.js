const { SlpLiveStream, SlpRealTime } = require("@vinceau/slp-realtime");

async function startLiveMonitoring(address, port, onEventCallback) {
    const livestream = new SlpLiveStream();
    const realtime = new SlpRealTime();

    try {
        await livestream.start(address, port);
        console.log("Successfully connected to live stream!");

        realtime.setStream(livestream);

        // Subscribe to game start
        realtime.game.start$.subscribe(() => {
            console.log("Game started!");
            onEventCallback("gameStart", {});
        });

        // Subscribe to stock changes
        realtime.stock.countChange$.subscribe((payload) => {
            console.log(`Player ${payload.playerIndex + 1} stocks: ${payload.stocksRemaining}`);
            onEventCallback("stockChange", payload);
        });

        // Subscribe to combos
        realtime.combo.end$.subscribe((payload) => {
            console.log("Combo detected:", payload);
            onEventCallback("combo", payload);
        });

    } catch (err) {
        console.error("Failed to connect to live stream:", err.message);
    }
}

module.exports = { startLiveMonitoring };