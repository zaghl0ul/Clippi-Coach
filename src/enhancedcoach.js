// Enhanced Slippi Coach implementation based on official Slippi patterns
import { createRequire } from 'module';
import os from 'os';
import fs from 'fs';
import path from 'path';

// Import lodash for functional utilities
const require = createRequire(import.meta.url);
const _ = require('lodash');
const chokidar = require('chokidar');
const { SlippiGame } = require('@slippi/slippi-js');

// Import our coaching modules
import { provideLiveCommentary } from './liveCommentary.js';
import { generateCoachingAdvice } from './aicoaching.js';
import { getConfig } from './utils/configManager.js';
import { characterNames } from './utils/slippiUtils.js';
import './utils/logger.js';

// Event throttling delay
const EVENT_THRESHOLD = 3000; // ms between events

/**
 * Enhanced Slippi Coach with robust file detection
 */
class EnhancedSlippiCoach {
  constructor(apiKey, slippiDirectory = null) {
    // Set directory path based on OS if not provided
    this.slippiDirectory = slippiDirectory || this._getDefaultSlippiDirectory();
    this.apiKey = apiKey;
    
    // Game tracking state
    this.gameByPath = {};
    this.watcher = null;
    this.isMonitoring = false;
    this.lastEventTime = 0;
    
    // Game state tracking
    this.activeGames = new Set();
    this.completedGames = new Set();
  }
  
  _getDefaultSlippiDirectory() {
    const platform = process.platform;
    const homeDir = os.homedir();
    
    switch (platform) {
      case 'win32':
        return path.join(homeDir, 'Documents', 'Slippi');
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'Slippi');
      case 'linux':
        return path.join(homeDir, '.config', 'Slippi');
      default:
        return path.join(homeDir, 'Slippi');
    }
  }
  
  async start() {
    if (this.isMonitoring) {
      return;
    }
    
    console.log(`Starting Slippi Coach with directory monitoring: ${this.slippiDirectory}`);
    
    // Verify Slippi directory exists
    if (!fs.existsSync(this.slippiDirectory)) {
      throw new Error(`Slippi directory not found: ${this.slippiDirectory}`);
    }
    
    // Set up chokidar to watch for file changes
    this.watcher = chokidar.watch(this.slippiDirectory, {
      depth: 0,
      persistent: true,
      usePolling: true,
      ignoreInitial: false, // Allow initial processing of existing files
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      }
    });
    
    console.log("Watcher initialized. Setting up event handlers...");
    
    // Handle new and changed files
    this.watcher.on('add', (filePath) => this._handleFileChange(filePath));
    this.watcher.on('change', (filePath) => this._handleFileChange(filePath));
    
    // Handle file removal (renamed or deleted)
    this.watcher.on('unlink', (filePath) => this._handleFileRemoval(filePath));
    
    // Handle errors
    this.watcher.on('error', (error) => {
      console.error(`Watcher error: ${error}`);
    });
    
    this.isMonitoring = true;
    console.log("Enhanced Slippi Coach is now running!");
    console.log("Monitoring for Slippi games...");
  }
  
  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.isMonitoring = false;
    console.log("Enhanced Slippi Coach stopped");
  }
  
  /**
   * Handles file change events
   * @param {string} filePath Path to the changed file
   */
  async _handleFileChange(filePath) {
    // Skip non-slp files
    if (!filePath.endsWith('.slp')) {
      return;
    }
    
    const start = Date.now();
    
    try {
      // Get or create the game instance
      let gameState = _.get(this.gameByPath, [filePath, 'state']);
      let game = _.get(this.gameByPath, [filePath, 'game']);
      
      if (!game) {
        console.log(`Processing Slippi file: ${filePath}`);
        
        // Create new game instance with real-time processing
        game = new SlippiGame(filePath, { processOnTheFly: true });
        
        // Create fresh game state
        gameState = {
          settings: null,
          latestFrameProcessed: -999,
          players: [],
          stockEvents: [],
          comboEvents: [],
          lastStockCounts: [4, 4, 4, 4]
        };
        
        // Store in our tracking map
        this.gameByPath[filePath] = {
          game,
          state: gameState
        };
      }
      
      // Get current game data
      const settings = game.getSettings() || {};
      const latestFrame = game.getLatestFrame();
      const gameEnd = game.getGameEnd();
      
      // Process game start if not yet processed
      if (!gameState.settings && settings && settings.players) {
        this._handleGameStart(filePath, settings);
        gameState.settings = settings;
        
        // Initialize player data
        if (settings.players && Array.isArray(settings.players)) {
          gameState.players = settings.players.map((player, index) => {
            const characterId = player.characterId || 0;
            const character = characterNames[characterId] || 'Unknown';
            
            return {
              index,
              port: player.port || index + 1,
              characterId,
              character,
              playerType: player.type // 0=human, 1=CPU
            };
          });
        }
      }
      
      // Process frame data if game has started
      if (gameState.settings && latestFrame && latestFrame.frame > gameState.latestFrameProcessed) {
        this._processFrameData(filePath, latestFrame);
        gameState.latestFrameProcessed = latestFrame.frame;
      }
      
      // Process game end
      if (gameEnd && !this.completedGames.has(filePath)) {
        this._handleGameEnd(filePath, gameEnd);
      }
      
      console.log(`Read took: ${Date.now() - start} ms`);
      
    } catch (err) {
      // Handle file read errors (likely file locks)
      if (!err.message || !err.message.includes("already been finalized")) {
        console.error(`Error processing ${filePath}: ${err.message}`);
      }
    }
  }
  
  /**
   * Handle file removal (game completed and renamed by Slippi)
   * @param {string} filePath Path to the removed file
   */
  _handleFileRemoval(filePath) {
    // Skip non-slp files
    if (!filePath.endsWith('.slp')) {
      return;
    }
    
    // Check if we were tracking this game
    if (this.gameByPath[filePath]) {
      const gameState = this.gameByPath[filePath].state;
      
      console.log(`File removed or renamed: ${filePath}`);
      
      // If this was an active game, generate final analysis
      if (this.activeGames.has(filePath) && !this.completedGames.has(filePath)) {
        this._generateGameAnalysis(filePath);
        this.completedGames.add(filePath);
      }
      
      // Remove from active games
      this.activeGames.delete(filePath);
      
      // Clean up resources
      // We keep it in gameByPath to allow final processing
    }
  }
  
  /**
   * Handle game start event
   * @param {string} filePath Path to the game file
   * @param {object} settings Game settings
   */
  _handleGameStart(filePath, settings) {
    console.log(`\n[Game Start] New game detected at ${filePath}`);
    
    // Mark as active game
    this.activeGames.add(filePath);
    
    // Extract player information
    if (settings.players && Array.isArray(settings.players)) {
      console.log("Matchup:");
      settings.players.forEach((player, index) => {
        const characterId = player.characterId || 0;
        const character = characterNames[characterId] || 'Unknown';
        console.log(`Player ${player.port}: ${character}`);
      });
    }
    
    // Reset tracking data for this game
    const gameState = this.gameByPath[filePath].state;
    gameState.stockEvents = [];
    gameState.comboEvents = [];
    gameState.lastStockCounts = [4, 4, 4, 4];
  }
  
  /**
   * Process new frame data
   * @param {string} filePath Path to the game file
   * @param {object} latestFrame Latest frame data
   */
  _processFrameData(filePath, latestFrame) {
    const gameState = this.gameByPath[filePath].state;
    
    // Skip if no players in frame (early or invalid frames)
    if (!latestFrame.players) return;
    
    // Display significant frame updates (about 1 second of gameplay)
    if (latestFrame.frame % 60 === 0) {
      console.log(`Frame update: ${latestFrame.frame}`);
      
      // Display current percentages and stocks
      _.forEach(gameState.players, (player) => {
        const frameData = _.get(latestFrame, ["players", player.index]);
        if (!frameData) return;
        
        console.log(
          `[Port ${player.port}] ${frameData.post.percent.toFixed(1)}% | ` + 
          `${frameData.post.stocksRemaining} stocks`
        );
      });
    }
    
    // Check for stock changes
    this._checkStockChanges(filePath, latestFrame);
    
    // Check for combos if we have stats
    try {
      const stats = this.gameByPath[filePath].game.getStats();
      if (stats && stats.combos && stats.combos.length > 0) {
        this._processNewCombos(filePath, stats.combos);
      }
    } catch (err) {
      // Ignore stats processing errors
    }
  }
  
  /**
   * Check for stock changes in the latest frame
   * @param {string} filePath Path to the game file
   * @param {object} latestFrame Latest frame data
   */
  _checkStockChanges(filePath, latestFrame) {
    const gameState = this.gameByPath[filePath].state;
    
    // Check each player's stock count
    latestFrame.players.forEach((player, playerIndex) => {
      if (!player || !player.post || player.post.stocksRemaining === undefined) return;
      
      const currentStocks = player.post.stocksRemaining;
      const previousStocks = gameState.lastStockCounts[playerIndex];
      
      // Detect stock lost
      if (currentStocks < previousStocks) {
        const stocksLost = previousStocks - currentStocks;
        this._handleStockLost(filePath, playerIndex, stocksLost, latestFrame);
      }
      
      // Update the tracked stock count
      gameState.lastStockCounts[playerIndex] = currentStocks;
    });
  }
  
  /**
   * Handle stock loss event
   * @param {string} filePath Path to the game file
   * @param {number} playerIndex Player who lost stock
   * @param {number} stocksLost Number of stocks lost
   * @param {object} frame Frame data
   */
  async _handleStockLost(filePath, playerIndex, stocksLost, frame) {
    const now = Date.now();
    const gameState = this.gameByPath[filePath].state;
    
    // Throttle events to avoid excessive processing
    if (now - this.lastEventTime < EVENT_THRESHOLD) {
      return;
    }
    
    this.lastEventTime = now;
    
    // Record the stock lost event
    const event = {
      time: now,
      frame: frame.frame,
      playerIndex,
      stocksLost,
      remainingStocks: gameState.lastStockCounts[playerIndex]
    };
    
    gameState.stockEvents.push(event);
    
    const playerData = gameState.players[playerIndex];
    const playerName = playerData ? 
      `Player ${playerData.port} (${playerData.character})` : 
      `Player ${playerIndex + 1}`;
    
    console.log(`${playerName} lost a stock! Remaining stocks: ${gameState.lastStockCounts[playerIndex]}`);
    
    // Generate live commentary for significant events
    try {
      const eventData = JSON.stringify({
        type: "stockLost",
        playerIndex,
        stocksLost,
        remainingStocks: gameState.lastStockCounts[playerIndex],
        playerCharacter: playerData?.character || "Unknown"
      });
      
      await provideLiveCommentary(this.apiKey, [eventData]);
    } catch (err) {
      console.error("Failed to generate commentary:", err.message);
    }
  }
  
  /**
   * Process new combos from stats
   * @param {string} filePath Path to the game file
   * @param {Array} combos Combo array from stats
   */
  _processNewCombos(filePath, combos) {
    if (!combos || combos.length === 0) return;

    const gameState = this.gameByPath[filePath].state;

    // Find combos we haven't processed yet
    const newCombos = combos.filter(combo => 
        combo.moves && 
        combo.moves.length >= 3 && // Only consider "real" combos with at least 3 moves
        !gameState.comboEvents.some(existingCombo => 
            existingCombo.playerIndex === combo.playerIndex && 
            existingCombo.startFrame === combo.startFrame
        )
    );

    // Process each new combo
    newCombos.forEach(async combo => {
        const now = Date.now();

        // Throttle events to avoid excessive processing
        if (now - this.lastEventTime < EVENT_THRESHOLD) {
            return;
        }

        this.lastEventTime = now;

        // Calculate percent if undefined
        if (combo.percent === undefined) {
            combo.percent = combo.endPercent - combo.startPercent;
        }

        // Record the combo event
        gameState.comboEvents.push({
            playerIndex: combo.playerIndex,
            startFrame: combo.startFrame,
            endFrame: combo.endFrame,
            moves: combo.moves.length,
            damage: combo.percent
        });

        const playerData = gameState.players[combo.playerIndex];
        const attackerName = playerData ? 
            `Player ${playerData.port} (${playerData.character})` : 
            `Player ${combo.playerIndex + 1}`;

        console.log(`${attackerName} performed a ${combo.moves.length}-hit combo for ${combo.percent.toFixed(1)}% damage!`);

        // Generate live commentary for significant combos
        try {
            const eventData = JSON.stringify({
                type: "combo",
                playerIndex: combo.playerIndex,
                moves: combo.moves.length,
                damage: combo.percent,
                playerCharacter: playerData?.character || "Unknown"
            });

            await provideLiveCommentary(this.apiKey, [eventData]);
        } catch (err) {
            console.error("Failed to generate commentary:", err.message);
        }
    });
}
  
  /**
   * Handle game end event
   * @param {string} filePath Path to the game file
   * @param {object} gameEnd Game end data
   */
  _handleGameEnd(filePath, gameEnd) {
    console.log("\n[Game End] Game has completed");
    
    // Display end type
    const endTypes = {
      1: "TIME!",
      2: "GAME!",
      7: "No Contest"
    };
    
    const endMessage = _.get(endTypes, gameEnd.gameEndMethod) || "Unknown";
    const lrasText = gameEnd.gameEndMethod === 7 ? ` | Quitter Index: ${gameEnd.lrasInitiatorIndex}` : "";
    console.log(`End Type: ${endMessage}${lrasText}`);
    
    // Generate game analysis
    this._generateGameAnalysis(filePath);
    
    // Mark as completed
    this.completedGames.add(filePath);
    this.activeGames.delete(filePath);
  }
  
  /**
   * Generate comprehensive game analysis
   * @param {string} filePath Path to the game file
   */
  async _generateGameAnalysis(filePath) {
    const gameData = this.gameByPath[filePath];
    if (!gameData) return;
    
    const gameState = gameData.state;
    if (!gameState.players || gameState.players.length === 0) return;
    
    console.log("\nGenerating end-game analysis...");
    
    // Calculate final game statistics
    const stocksLostByPlayer = {};
    
    gameState.stockEvents.forEach(event => {
      if (!stocksLostByPlayer[event.playerIndex]) {
        stocksLostByPlayer[event.playerIndex] = 0;
      }
      stocksLostByPlayer[event.playerIndex] += event.stocksLost;
    });
    
    // Calculate combo statistics
    const combosByPlayer = {};
    let totalDamage = {};
    
    gameState.comboEvents.forEach(combo => {
      if (!combosByPlayer[combo.playerIndex]) {
        combosByPlayer[combo.playerIndex] = [];
        totalDamage[combo.playerIndex] = 0;
      }
      
      combosByPlayer[combo.playerIndex].push(combo);
      totalDamage[combo.playerIndex] += combo.damage;
    });
    
    // Prepare data for AI coaching
    const matchData = {
      damageDealt: gameState.players.map((p, idx) => totalDamage[idx] || 0),
      stockLosses: gameState.players.map((p, idx) => stocksLostByPlayer[idx] || 0),
      characters: gameState.players.map(p => p.character)
    };
    
    // Display match summary
    console.log("\n===== MATCH SUMMARY =====");
    gameState.players.forEach((player, index) => {
      console.log(`Player ${player.port} (${player.character}):`);
      console.log(`  Stocks Lost: ${stocksLostByPlayer[index] || 0}`);
      console.log(`  Total Damage Dealt: ${totalDamage[index]?.toFixed(1) || 0}`);
      console.log(`  Significant Combos: ${combosByPlayer[index]?.length || 0}`);
    });
    
    // Generate AI coaching advice
    try {
      console.log("\nGenerating coaching advice...");
      const advice = await generateCoachingAdvice(this.apiKey, matchData);
      console.log("\n===== COACHING ADVICE =====");
      console.log(advice);
      console.log("===========================\n");
    } catch (err) {
      console.error(`Failed to generate coaching advice: ${err.message}`);
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log("Initializing Enhanced Slippi Coach...");
  
  // Validate API key
  const apiKey = getConfig('API_KEY');
  if (!apiKey || apiKey === 'your_api_key_here' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.error('ERROR: Please set a valid API key in the .env file');
    console.error('Instructions: Update the .env file in the root directory with API_KEY=your_actual_api_key');
    process.exit(1);
  }
  
  try {
    // Create coach instance
    const coach = new EnhancedSlippiCoach(apiKey);
    
    // Handle application shutdown
    process.on('SIGINT', () => {
      console.log("\nShutting down Enhanced Slippi Coach...");
      coach.stop();
      process.exit(0);
    });
    
    // Start monitoring
    await coach.start();
    
    console.log("Enhanced Slippi Coach is now running!");
    console.log("Monitoring Slippi directory for games...");
    console.log("Press Ctrl+C to exit.");
    
  } catch (err) {
    console.error(`Failed to initialize coach: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`Unexpected error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});