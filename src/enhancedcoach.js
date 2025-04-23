// Enhanced Slippi Coach implementation based on official Slippi patterns
import { createRequire } from 'module';
import os from 'os';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.API_KEY;
const endpoint = process.env.LM_STUDIO_ENDPOINT;

if (!apiKey || !endpoint) {
  throw new Error('No valid API key or LLM configuration found.');
}


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

// Hierarchical event classification with differential throttling
const EVENT_PRIORITIES = {
  STOCK_LOSS: {
    threshold: 1000, // ms - high priority event
    lastTriggered: 0
  },
  SIGNIFICANT_COMBO: { // 4+ hit combos
    threshold: 1500,
    lastTriggered: 0
  },
  MINOR_COMBO: { // 2-3 hit combos
    threshold: 2500,
    lastTriggered: 0
  },
  NEUTRAL_EXCHANGE: { // position changes, etc.
    threshold: 5000,
    lastTriggered: 0
  },
  FRAME_UPDATE: { // periodic frame updates
    threshold: 10000,
    lastTriggered: 0
  }
};

// Melee action states of interest for advanced detection
const ACTION_STATES = {
  // Techs
  TECH_START: 0xC7,
  TECH_ROLL_LEFT: 0xC9,
  TECH_ROLL_RIGHT: 0xCA,
  
  // Recoveries
  FIRE_FOX_GROUND: 0x159,
  FIRE_FOX_AIR: 0x15A,
  UP_B_GROUND: 0x15B,
  UP_B_AIR: 0x15C,
  
  // Common states
  GRAB: 0xD4,
  DASH: 0x14,
  DASH_ATTACK: 0x15,
  SHIELD: 0xB3,
  SHIELD_BREAK: 0xB6,
  
  // Aerials
  NAIR: 0x41,
  FAIR: 0x42,
  BAIR: 0x43,
  UAIR: 0x44,
  DAIR: 0x45,
  FALL: 0x1D  // Post-aerial state
};

// Track pending events for batched processing
const PENDING_EVENTS_LIMIT = 3;
const BATCH_PROCESSING_INTERVAL = 1500; // ms

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
    
    // Game state tracking
    this.activeGames = new Set();
    this.completedGames = new Set();
    
    // Event buffering for batched processing
    this.pendingEvents = {};
    this.eventProcessorInterval = null;
    this.previousFrames = {}; // Store previous frames for state transition detection
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
  
  /**
   * Check if a specific event type can be triggered based on its throttling threshold
   * @param {string} eventType The type of event to check
   * @param {string} filePath The path to the game file (for game-specific throttling)
   * @returns {boolean} Whether the event can be triggered
   */
  _canTriggerEventType(eventType, filePath) {
    const now = Date.now();
    const eventConfig = EVENT_PRIORITIES[eventType];
    
    if (!eventConfig) {
      console.error(`Unknown event type: ${eventType}`);
      return false;
    }
    
    // Get the game-specific last triggered time
    const gameEventKey = `${filePath}_${eventType}`;
    const lastTriggered = this.gameByPath[filePath]?.state?.lastEventTimes?.[eventType] || 0;
    
    if (now - lastTriggered < eventConfig.threshold) {
      return false;
    }
    
    // Update last triggered time for this event type
    if (this.gameByPath[filePath]?.state) {
      if (!this.gameByPath[filePath].state.lastEventTimes) {
        this.gameByPath[filePath].state.lastEventTimes = {};
      }
      this.gameByPath[filePath].state.lastEventTimes[eventType] = now;
    }
    
    return true;
  }
  
  /**
   * Add an event to the pending events queue for this game
   * @param {string} filePath Path to the game file
   * @param {object} event Event data to add
   */
  _addPendingEvent(filePath, event) {
    if (!this.pendingEvents[filePath]) {
      this.pendingEvents[filePath] = [];
    }
    
    this.pendingEvents[filePath].push(event);
    
    // Start event processor interval if not already running
    if (!this.eventProcessorInterval) {
      this.eventProcessorInterval = setInterval(() => this._processPendingEvents(), BATCH_PROCESSING_INTERVAL);
    }
  }
  
  /**
   * Process pending events from all active games
   */
  async _processPendingEvents() {
    for (const filePath of Object.keys(this.pendingEvents)) {
      const events = this.pendingEvents[filePath] || [];
      if (events.length === 0) continue;
      
      const gameState = this.gameByPath[filePath]?.state;
      if (!gameState) continue;
      
      // Take up to N events for processing
      const eventsToProcess = events.splice(0, PENDING_EVENTS_LIMIT);
      if (eventsToProcess.length > 0) {
        try {
          // Build a comprehensive game context to pass with events
          const contextData = {
            players: gameState.players || [],
            stocks: gameState.lastStockCounts || [],
            percent: [], // Will populate from latest frame data
            frame: gameState.latestFrameProcessed || 0,
            gameTime: Math.floor((gameState.latestFrameProcessed || 0) / 60),
            stageId: gameState.settings?.stageId
          };
          
          // Extract latest percent data for all players if available
          if (this.previousFrames[filePath] && this.previousFrames[filePath].players) {
            contextData.percent = this.previousFrames[filePath].players.map(player => 
              player?.post?.percent || 0
            );
          }
          
          // Process with template-based commentary system
          // No API dependency - purely deterministic output
          await provideLiveCommentary(null, eventsToProcess, contextData);
        } catch (err) {
          console.error(`Error processing events for ${filePath}:`, err.message);
        }
      }
    }
    
    // If no more pending events in any game, clear the interval
    const hasPendingEvents = Object.values(this.pendingEvents).some(events => events.length > 0);
    if (!hasPendingEvents && this.eventProcessorInterval) {
      clearInterval(this.eventProcessorInterval);
      this.eventProcessorInterval = null;
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
    
    if (this.eventProcessorInterval) {
      clearInterval(this.eventProcessorInterval);
      this.eventProcessorInterval = null;
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
          lastStockCounts: [4, 4, 4, 4],
          lastEventTimes: {},    // Track throttling by event type
          pendingCommentary: []  // Buffer for pending commentary events
        };
        
        // Store in our tracking map
        this.gameByPath[filePath] = {
          game,
          state: gameState
        };
        
        // Initialize pending events for this game
        this.pendingEvents[filePath] = [];
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
        // Detect state transitions between frames
        if (gameState.latestFrameProcessed > 0) {
          this._detectStateTransitions(filePath, latestFrame);
        }
        
        // Store previous frame for next comparison
        this.previousFrames[filePath] = latestFrame;
        
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
   * Detect state transitions between frames for deeper commentary
   * @param {string} filePath Path to the game file
   * @param {object} currentFrame Current frame data
   */
  _detectStateTransitions(filePath, currentFrame) {
    const previousFrame = this.previousFrames[filePath];
    if (!previousFrame || !previousFrame.players) return;
    
    // For each player, detect meaningful state changes
    currentFrame.players.forEach((player, playerIndex) => {
      if (!previousFrame.players[playerIndex] || !player.post || !previousFrame.players[playerIndex].post) return;
      
      const prevState = previousFrame.players[playerIndex].post.actionStateId;
      const currentState = player.post.actionStateId;
      
      // Only process if state changed
      if (prevState !== currentState) {
        // Tech detection
        if ([ACTION_STATES.TECH_START, ACTION_STATES.TECH_ROLL_LEFT, ACTION_STATES.TECH_ROLL_RIGHT].includes(currentState)) {
          if (this._canTriggerEventType('NEUTRAL_EXCHANGE', filePath)) {
            const techType = currentState === ACTION_STATES.TECH_START ? 'in-place' : 
                            currentState === ACTION_STATES.TECH_ROLL_LEFT ? 'roll left' : 'roll right';
            
            this._addPendingEvent(filePath, {
              type: "actionState",
              subType: "tech",
              playerIndex,
              frame: currentFrame.frame,
              details: { techType }
            });
          }
        }
        
        // Shield/grab detection
        if (currentState === ACTION_STATES.SHIELD || currentState === ACTION_STATES.GRAB) {
          if (this._canTriggerEventType('NEUTRAL_EXCHANGE', filePath)) {
            this._addPendingEvent(filePath, {
              type: "actionState",
              subType: currentState === ACTION_STATES.SHIELD ? "shield" : "grab",
              playerIndex,
              frame: currentFrame.frame
            });
          }
        }
        
        // Recovery detection
        if ([ACTION_STATES.FIRE_FOX_AIR, ACTION_STATES.UP_B_AIR].includes(currentState)) {
          if (this._canTriggerEventType('NEUTRAL_EXCHANGE', filePath)) {
            this._addPendingEvent(filePath, {
              type: "actionState",
              subType: "recovery",
              playerIndex,
              frame: currentFrame.frame
            });
          }
        }
        
        // Post-aerial landing
        if (currentState === ACTION_STATES.FALL && 
            [ACTION_STATES.NAIR, ACTION_STATES.FAIR, ACTION_STATES.BAIR, 
             ACTION_STATES.UAIR, ACTION_STATES.DAIR].includes(prevState)) {
          
          const aerialMap = {
            [ACTION_STATES.NAIR]: 'neutral air',
            [ACTION_STATES.FAIR]: 'forward air', 
            [ACTION_STATES.BAIR]: 'back air',
            [ACTION_STATES.UAIR]: 'up air', 
            [ACTION_STATES.DAIR]: 'down air'
          };
          
          if (this._canTriggerEventType('NEUTRAL_EXCHANGE', filePath)) {
            this._addPendingEvent(filePath, {
              type: "actionState",
              subType: "aerial",
              playerIndex,
              frame: currentFrame.frame,
              details: { aerial: aerialMap[prevState] || 'aerial' }
            });
          }
        }
      }
    });
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
      
      // Clean up buffered events
      delete this.pendingEvents[filePath];
      delete this.previousFrames[filePath];
      
      // Keep it in gameByPath to allow final processing
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
      
      // Generate a game start commentary event
      const matchupEvent = {
        type: "gameStart",
        matchup: settings.players.map(p => characterNames[p.characterId] || 'Unknown'),
        stage: settings.stageId,
        frame: 0
      };
      
      this._addPendingEvent(filePath, matchupEvent);
    }
    
    // Reset tracking data for this game
    const gameState = this.gameByPath[filePath].state;
    gameState.stockEvents = [];
    gameState.comboEvents = [];
    gameState.lastStockCounts = [4, 4, 4, 4];
    gameState.lastEventTimes = {};
    
    // Initialize frame buffer
    this.previousFrames[filePath] = null;
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
    
    // Generate frame update commentary events (every ~5 seconds)
    if (latestFrame.frame % 300 === 0 && this._canTriggerEventType('FRAME_UPDATE', filePath)) {
      const frameUpdateEvent = {
        type: "frameUpdate",
        frame: latestFrame.frame,
        players: {}
      };
      
      // Display current percentages and stocks
      _.forEach(gameState.players, (player) => {
        const frameData = _.get(latestFrame, ["players", player.index]);
        if (!frameData) return;
        
        const percent = frameData.post.percent.toFixed(1);
        const stocks = frameData.post.stocksRemaining;
        
        console.log(
          `[Port ${player.port}] ${percent}% | ${stocks} stocks`
        );
        
        frameUpdateEvent.players[player.index] = {
          percent: parseFloat(percent),
          stocks
        };
      });
      
      this._addPendingEvent(filePath, frameUpdateEvent);
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
  _handleStockLost(filePath, playerIndex, stocksLost, frame) {
    const gameState = this.gameByPath[filePath].state;
    
    // Stock loss is always high priority - use dedicated throttling
    if (!this._canTriggerEventType('STOCK_LOSS', filePath)) {
      return;
    }
    
    // Record the stock lost event
    const event = {
      time: Date.now(),
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
    
    // Generate live commentary for stock loss event
    this._addPendingEvent(filePath, {
      type: "stockLost",
      playerIndex,
      stocksLost,
      remainingStocks: gameState.lastStockCounts[playerIndex],
      playerCharacter: playerData?.character || "Unknown",
      frame: frame.frame
    });
  }
  
  /**
   * Process new combos from stats
   * @param {string} filePath Path to the game file
   * @param {Array} combos Combo array from stats
   */
  _processNewCombos(filePath, combos) {
    if (!combos || combos.length === 0) return;
    
    const gameState = this.gameByPath[filePath].state;
    
    // Find combos we haven't processed yet - lowered threshold to 2+ hits for more commentary
    const newCombos = combos.filter(combo => 
      combo.moves && 
      combo.moves.length >= 2 && 
      !gameState.comboEvents.some(existingCombo => 
        existingCombo.playerIndex === combo.playerIndex && 
        existingCombo.startFrame === combo.startFrame
      )
    );
    
    // Process each new combo
    newCombos.forEach(combo => {
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
      
      // Categorize combo by size for appropriate throttling
      const comboType = combo.moves.length >= 4 ? 'SIGNIFICANT_COMBO' : 'MINOR_COMBO';
      
      // Skip if throttled for this combo type
      if (!this._canTriggerEventType(comboType, filePath)) {
        return;
      }
      
      console.log(`${attackerName} performed a ${combo.moves.length}-hit combo for ${combo.percent.toFixed(1)}% damage!`);
      
      // Generate structured combo data for commentary
      const comboData = {
        type: "combo",
        playerIndex: combo.playerIndex,
        moves: combo.moves.length,
        damage: combo.percent,
        playerCharacter: playerData?.character || "Unknown",
        startFrame: combo.startFrame,
        endFrame: combo.endFrame,
        moveTypes: combo.moves.map(m => m.moveId).join(',')
      };
      
      // Add to pending events queue for batched processing
      this._addPendingEvent(filePath, comboData);
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
    
    // Add game end event to queue
    const gameState = this.gameByPath[filePath].state;
    if (gameState && gameState.players) {
      this._addPendingEvent(filePath, {
        type: "gameEnd",
        endType: endMessage,
        lrasQuitter: gameEnd.gameEndMethod === 7 ? gameEnd.lrasInitiatorIndex : undefined,
        frame: gameState.latestFrameProcessed
      });
    }
    
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
      const advice = await generateCoachingAdvice('local', matchData); // Use 'local' for the API key
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