// src/templateCommentarySystem.js
import { STAGE_NAMES } from './utils/constants.js';

/**
 * Generates template-based commentary without requiring an LLM
 * @param {Object|string} event - Event to generate commentary for
 * @param {Object} gameState - Optional game state context
 * @returns {string} - Generated commentary
 */
export function generateTemplateCommentary(event, gameState = null) {
  // Parse the event if it's a string
  if (typeof event === 'string') {
    try {
      event = JSON.parse(event);
    } catch (e) {
      return 'Something interesting just happened!';
    }
  }
  
  // Get event type and select appropriate template
  switch(event.type) {
    case 'combo':
      return generateComboTemplate(event);
    case 'stockLost':
      return generateStockLostTemplate(event);
    case 'actionState':
      return generateActionStateTemplate(event);
    case 'gameStart':
      return generateGameStartTemplate(event, gameState);
    case 'gameEnd':
      return generateGameEndTemplate(event, gameState);
    case 'frameUpdate':
      return generateFrameUpdateTemplate(event, gameState);
    default:
      return 'The match continues!';
  }
}

/**
 * Generate commentary for combos
 * @param {Object} event - Combo event data
 * @returns {string} - Generated commentary
 */
function generateComboTemplate(event) {
  const { playerCharacter, moves, damage, isHuman } = event;
  const performer = isHuman === false ? 'CPU' : 'Player';
  
  // Handle undefined values
  const safeCharacter = playerCharacter || 'Fighter';
  const safeMoves = moves || '?';
  const safeDamage = damage !== undefined ? parseFloat(damage).toFixed(1) : '?';
  
  const templates = [
    `${performer}'s ${safeCharacter} lands a ${safeMoves}-hit combo for ${safeDamage}%!`,
    `${safeMoves} hits from ${safeCharacter} dealing ${safeDamage}% damage!`,
    `${safeCharacter} extends the punish with a ${safeMoves}-piece for ${safeDamage}%!`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate commentary for stock losses
 * @param {Object} event - Stock loss event data
 * @returns {string} - Generated commentary
 */
function generateStockLostTemplate(event) {
  const { playerCharacter, remainingStocks, isHuman } = event;
  const player = isHuman === false ? 'CPU' : 'Player';
  
  // Handle undefined values
  const safeCharacter = playerCharacter || 'Fighter';
  const safeStocks = remainingStocks !== undefined ? remainingStocks : '?';
  
  const templates = [
    `${player}'s ${safeCharacter} loses a stock! ${safeStocks} remaining.`,
    `${safeCharacter} gets sent to the blast zone! ${safeStocks} stocks left.`,
    `Down goes ${safeCharacter}! ${safeStocks} stocks remaining.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate commentary for action states (technical executions)
 * @param {Object} event - Action state event data
 * @returns {string} - Generated commentary
 */
function generateActionStateTemplate(event) {
  const { subType, playerCharacter, details } = event;
  
  // Handle undefined values
  const safeCharacter = playerCharacter || 'Fighter';
  
  switch (subType) {
    case 'wavedash-land':
      const templates = [
        `Perfect wavedash from ${safeCharacter}!`,
        `Clean wavedash to reposition by ${safeCharacter}.`,
        `${safeCharacter} executes a frame-perfect wavedash.`
      ];
      return templates[Math.floor(Math.random() * templates.length)];
      
    case 'l-cancel-attempt':
      const aerialType = details?.aerial || 'aerial';
      const lCancelTemplates = [
        `${safeCharacter} L-cancels that ${aerialType}!`,
        `Nice L-cancel on the ${aerialType} from ${safeCharacter}.`,
        `Quick L-cancel to maintain pressure by ${safeCharacter}.`
      ];
      return lCancelTemplates[Math.floor(Math.random() * lCancelTemplates.length)];
      
    case 'tech':
      const techType = details?.techType || 'tech';
      const techTemplates = [
        `${safeCharacter} techs ${techType}!`,
        `Good ${techType} tech by ${safeCharacter}.`,
        `${safeCharacter} saves position with a ${techType} tech.`
      ];
      return techTemplates[Math.floor(Math.random() * techTemplates.length)];
      
    case 'tech-miss':
      const missTemplates = [
        `${safeCharacter} misses the tech!`,
        `No tech from ${safeCharacter}!`,
        `${safeCharacter} fails to tech that hit.`
      ];
      return missTemplates[Math.floor(Math.random() * missTemplates.length)];
      
    case 'shield':
      const shieldTemplates = [
        `${safeCharacter} shields the attack.`,
        `Quick defensive shield from ${safeCharacter}.`,
        `${safeCharacter} puts up the shield.`
      ];
      return shieldTemplates[Math.floor(Math.random() * shieldTemplates.length)];
      
    case 'grab':
      const grabTemplates = [
        `${safeCharacter} gets the grab!`,
        `Grab opportunity for ${safeCharacter}.`,
        `${safeCharacter} secures a grab.`
      ];
      return grabTemplates[Math.floor(Math.random() * grabTemplates.length)];
      
    case 'recovery':
      const recoveryTemplates = [
        `${safeCharacter} recovers with up-B.`,
        `Recovery attempt from ${safeCharacter}.`,
        `${safeCharacter} uses up-B to get back.`
      ];
      return recoveryTemplates[Math.floor(Math.random() * recoveryTemplates.length)];
      
    default:
      return `Technical execution from ${safeCharacter}!`;
  }
}

/**
 * Generate commentary for game start
 * @param {Object} event - Game start event data
 * @param {Object} gameState - Game state context
 * @returns {string} - Generated commentary
 */
function generateGameStartTemplate(event, gameState = null) {
  // Extract matchup info from event
  const matchup = event.matchup || [];
  const stageId = event.stage;
  const stageName = STAGE_NAMES[stageId] || `Stage ${stageId}`;
  
  // Handle case with less than 2 characters
  if (matchup.length < 2) {
    return `Match starting on ${stageName}!`;
  }
  
  const templates = [
    `Match starting: ${matchup[0]} vs ${matchup[1]} on ${stageName}!`,
    `Here we go! ${matchup[0]} facing off against ${matchup[1]} on ${stageName}.`,
    `Battle begins between ${matchup[0]} and ${matchup[1]} on ${stageName}. Let's see some tech skill!`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate commentary for game end
 * @param {Object} event - Game end event data
 * @param {Object} gameState - Game state context
 * @returns {string} - Generated commentary
 */
function generateGameEndTemplate(event, gameState = null) {
  const { endType, lrasQuitter, winnerIndex } = event;
  
  // Handle LRAS (Leave Run And Start) quitter
  if (endType === "No Contest" && lrasQuitter !== undefined) {
    return `Game ended early - Player ${lrasQuitter + 1} has left the match.`;
  }
  
  // Use game state to determine winner and loser if available
  let winner = "The winner";
  let loser = "the opponent";
  
  if (gameState && gameState.players && winnerIndex !== undefined && winnerIndex !== -1) {
    const winnerPlayer = gameState.players.find(p => p.index === winnerIndex);
    if (winnerPlayer) {
      winner = winnerPlayer.character || "Player " + (winnerPlayer.port || (winnerIndex + 1));
    }
    
    // Find the other player as loser
    const loserPlayer = gameState.players.find(p => p.index !== winnerIndex);
    if (loserPlayer) {
      loser = loserPlayer.character || "Player " + (loserPlayer.port || (loserPlayer.index + 1));
    }
  }
  
  const templates = [
    `Game! ${winner} takes the victory over ${loser}.`,
    `That's it! ${winner} clutches out the win against ${loser}.`,
    `Match complete! ${winner} bests ${loser} in a hard-fought set.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate commentary for frame updates
 * @param {Object} event - Frame update event data
 * @param {Object} gameState - Game state context
 * @returns {string} - Generated commentary
 */
function generateFrameUpdateTemplate(event, gameState = null) {
  // Frame updates typically just provide status commentary
  const frameNum = event.frame;
  const gameMinute = Math.floor(frameNum / 3600);
  const gameSecond = Math.floor((frameNum % 3600) / 60);
  
  // Get player percentages if available
  let percentageText = "";
  if (event.players && Object.keys(event.players).length > 0) {
    const players = Object.entries(event.players);
    if (players.length > 1) {
      percentageText = ` with ${players[0][1].percent}% vs ${players[1][1].percent}%`;
    }
  }
  
  const templates = [
    `${gameMinute}:${gameSecond.toString().padStart(2, '0')} on the clock${percentageText}.`,
    `The match continues at ${gameMinute}:${gameSecond.toString().padStart(2, '0')}${percentageText}.`,
    `${gameMinute} minute${gameMinute !== 1 ? 's' : ''} in${percentageText}, let's see who takes control.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

// Export both the default function and named exports
export default { generateTemplateCommentary };