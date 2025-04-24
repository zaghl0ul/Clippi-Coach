// src/templateCommentarySystem.js
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
      return generateGameStartTemplate(event);
    case 'gameEnd':
      return generateGameEndTemplate(event);
    default:
      return 'The match continues!';
  }
}

function generateComboTemplate(event) {
  const { playerCharacter, moves, damage, isHuman } = event;
  const performer = isHuman ? 'Player' : 'CPU';
  
  const templates = [
    `${performer}'s ${playerCharacter} lands a ${moves}-hit combo for ${damage.toFixed(1)}%!`,
    `${moves} hits from ${playerCharacter} dealing ${damage.toFixed(1)}% damage!`,
    `${playerCharacter} extends the punish with a ${moves}-piece for ${damage.toFixed(1)}%!`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateStockLostTemplate(event) {
  const { playerCharacter, remainingStocks, isHuman } = event;
  const player = isHuman ? 'Player' : 'CPU';
  
  const templates = [
    `${player}'s ${playerCharacter} loses a stock! ${remainingStocks} remaining.`,
    `${playerCharacter} gets sent to the blast zone! ${remainingStocks} stocks left.`,
    `Down goes ${playerCharacter}! ${remainingStocks} stocks remaining.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

// Implement other template generators similarly
// ...

export default { generateTemplateCommentary };