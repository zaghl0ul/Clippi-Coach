// test-ai-integration.js
import SlippiAIIntegration, { COMMENTARY_MODES, COACHING_PROFILES } from './src/integratedCommentary.js';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Main test function for AI integration
 */
async function testAIIntegration() {
  console.log("=================================================");
  console.log("SLIPPI AI COMMENTARY AND COACHING INTEGRATION TEST");
  console.log("=================================================");
  
  // Initialize the integration
  const slippiAI = new SlippiAIIntegration();
  
  // Test LLM connectivity
  console.log("\nTesting LLM connectivity...");
  const connectivityTest = await slippiAI.testLLMConnectivity();
  
  if (connectivityTest.success) {
    console.log(`✅ Successfully connected to ${connectivityTest.endpoint}`);
    console.log(`Test response: "${connectivityTest.response}"`);
  } else {
    console.log(`❌ Failed to connect to ${connectivityTest.endpoint}`);
    console.log(`Error: ${connectivityTest.message}`);
    
    // Ask if user wants to configure LLM
    const shouldConfigure = await askQuestion("Would you like to configure the LLM integration now? (y/n): ");
    
    if (shouldConfigure.toLowerCase() === 'y') {
      await configureLLM(slippiAI);
      
      // Test connectivity again after configuration
      const retestConnectivity = await slippiAI.testLLMConnectivity();
      if (!retestConnectivity.success) {
        console.log("\n❌ Still unable to connect. Please check your configuration.");
        console.log("You can run 'node setup-local-llm.js' to reconfigure later.");
        rl.close();
        return;
      }
    } else {
      console.log("\nYou can run 'node setup-local-llm.js' to configure later.");
      rl.close();
      return;
    }
  }
  
  // Main menu
  await displayMenu(slippiAI);
}

/**
 * Display interactive menu for testing different features
 */
async function displayMenu(slippiAI) {
  console.log("\n=================================================");
  console.log("TESTING MENU");
  console.log("=================================================");
  console.log("1. Test Template Commentary");
  console.log("2. Test LLM Commentary");
  console.log("3. Test Hybrid Commentary");
  console.log("4. Test Coaching Analysis");
  console.log("5. Exit");
  
  const choice = await askQuestion("\nSelect an option (1-5): ");
  
  switch (choice) {
    case '1':
      await testTemplateCommentary(slippiAI);
      break;
    case '2':
      await testLLMCommentary(slippiAI);
      break;
    case '3':
      await testHybridCommentary(slippiAI);
      break;
    case '4':
      await testCoachingAnalysis(slippiAI);
      break;
    case '5':
      console.log("Exiting...");
      rl.close();
      return;
    default:
      console.log("Invalid choice. Please try again.");
  }
  
  // Return to menu after test completes
  await displayMenu(slippiAI);
}

/**
 * Test template-based commentary without LLM
 */
async function testTemplateCommentary(slippiAI) {
  console.log("\n-------------------------------------------------");
  console.log("TESTING TEMPLATE COMMENTARY");
  console.log("-------------------------------------------------");
  
  // Create test events
  const events = await createTestEvents();
  
  // Generate commentary with template-only mode
  console.log("\nGenerating template commentary...");
  const commentary = await slippiAI.generateCommentary([events], { 
    commentaryMode: COMMENTARY_MODES.TEMPLATE_ONLY 
  });
  
  console.log("\nTemplate Commentary:");
  console.log(`"${commentary}"`);
}

/**
 * Test LLM-based commentary
 */
async function testLLMCommentary(slippiAI) {
  console.log("\n-------------------------------------------------");
  console.log("TESTING LLM COMMENTARY");
  console.log("-------------------------------------------------");
  
  // Create test events
  const events = await createTestEvents();
  
  // Generate commentary with LLM-only mode
  console.log("\nGenerating LLM commentary...");
  const commentary = await slippiAI.generateCommentary([events], { 
    commentaryMode: COMMENTARY_MODES.LLM_ONLY 
  });
  
  console.log("\nLLM Commentary:");
  console.log(`"${commentary}"`);
}

/**
 * Test hybrid commentary system
 */
async function testHybridCommentary(slippiAI) {
  console.log("\n-------------------------------------------------");
  console.log("TESTING HYBRID COMMENTARY");
  console.log("-------------------------------------------------");
  
  // Create test events
  const events = await createTestEvents();
  
  // Generate commentary with hybrid mode
  console.log("\nGenerating hybrid commentary...");
  const commentary = await slippiAI.generateCommentary([events], { 
    commentaryMode: COMMENTARY_MODES.HYBRID,
    gameState: {
      players: [
        { character: "Fox", port: 1 },
        { character: "Marth", port: 2 }
      ],
      stocks: [3, 2],
      percent: [42.6, 87.3],
      stage: 31, // Battlefield
      frame: 3700
    }
  });
  
  console.log("\nHybrid Commentary:");
  console.log(`"${commentary}"`);
}

/**
 * Test coaching analysis
 */
async function testCoachingAnalysis(slippiAI) {
  console.log("\n-------------------------------------------------");
  console.log("TESTING COACHING ANALYSIS");
  console.log("-------------------------------------------------");
  
  // Get target player
  const targetPlayer = await askQuestion("Which player to focus coaching on? (1/2, or enter for both): ");
  const targetPlayerIndex = targetPlayer === '1' ? 0 : (targetPlayer === '2' ? 1 : null);
  
  // Get coaching profile
  console.log("\nCoaching profiles:");
  console.log("1. Technical Execution");
  console.log("2. Neutral Game");
  console.log("3. Punish Optimization");
  console.log("4. Matchup-Specific");
  console.log("5. Defensive Options");
  console.log("6. Comprehensive");
  
  const profileChoice = await askQuestion("\nSelect a coaching profile (1-6, or enter for comprehensive): ");
  
  let coachingProfile;
  switch (profileChoice) {
    case '1': coachingProfile = COACHING_PROFILES.TECHNICAL_EXECUTION; break;
    case '2': coachingProfile = COACHING_PROFILES.NEUTRAL_GAME; break;
    case '3': coachingProfile = COACHING_PROFILES.PUNISH_OPTIMIZATION; break;
    case '4': coachingProfile = COACHING_PROFILES.MATCHUP_SPECIFIC; break;
    case '5': coachingProfile = COACHING_PROFILES.DEFENSIVE_OPTIONS; break;
    default: coachingProfile = COACHING_PROFILES.COMPREHENSIVE;
  }
  
  // Example match data
  const matchData = {
    characters: ["Fox", "Marth"],
    damageDealt: [423.7, 386.2],
    stockLosses: [2, 3],
    stage: 31 // Battlefield
  };
  
  console.log(`\nMatch Data: ${JSON.stringify(matchData, null, 2)}`);
  console.log(`\nGenerating ${coachingProfile} coaching advice...`);
  
  // Generate coaching advice
  const coaching = await slippiAI.generateCoaching(matchData, {
    coachingProfile,
    targetPlayerIndex
  });
  
  // Display a summary/excerpt of the coaching advice
  console.log("\nCoaching Advice (excerpt):");
  console.log(coaching.substring(0, 500) + "...");
  
  // Ask if user wants to see full coaching
  const showFull = await askQuestion("\nShow full coaching advice? (y/n): ");
  
  if (showFull.toLowerCase() === 'y') {
    console.log("\n=================================================");
    console.log("FULL COACHING ADVICE");
    console.log("=================================================");
    console.log(coaching);
  }
}

/**
 * Helper function to configure LLM integration
 */
async function configureLLM(slippiAI) {
  console.log("\nLLM CONFIGURATION");
  console.log("=================");
  console.log("1. Use LM Studio (local LLM)");
  console.log("2. Use OpenAI API");
  
  const choice = await askQuestion("Select an option (1/2): ");
  
  if (choice === '1') {
    console.log("\nConfiguring LM Studio integration...");
    console.log("Make sure LM Studio is running with the server enabled!");
    
    const endpoint = await askQuestion("Enter LM Studio endpoint (press Enter for default http://localhost:1234/v1): ");
    const finalEndpoint = endpoint.trim() || 'http://localhost:1234/v1';
    
    const success = await slippiAI.setupLocalLLM(finalEndpoint);
    
    if (success) {
      console.log("✅ LM Studio integration configured successfully!");
    } else {
      console.log("❌ Failed to configure LM Studio integration. Check if LM Studio is running.");
    }
  } else if (choice === '2') {
    console.log("\nConfiguring OpenAI API integration...");
    
    const apiKey = await askQuestion("Enter your OpenAI API key: ");
    
    if (!apiKey.trim()) {
      console.log("❌ API key cannot be empty");
      return;
    }
    
    const success = await slippiAI.setupOpenAIAPI(apiKey.trim());
    
    if (success) {
      console.log("✅ OpenAI API integration configured successfully!");
    } else {
      console.log("❌ Failed to configure OpenAI API integration. Check your API key.");
    }
  } else {
    console.log("Invalid option selected");
  }
}

/**
 * Create test events based on user selection
 */
async function createTestEvents() {
  console.log("\nSelect event type to test:");
  console.log("1. Combo");
  console.log("2. Stock Loss");
  console.log("3. Game Start");
  console.log("4. Technical Action (wavedash)");
  
  const eventChoice = await askQuestion("Select event type (1-4): ");
  
  // Default to combo if invalid choice
  let eventType = 'combo';
  
  switch (eventChoice) {
    case '1':
      eventType = 'combo';
      break;
    case '2':
      eventType = 'stockLost';
      break;
    case '3':
      eventType = 'gameStart';
      break;
    case '4':
      eventType = 'actionState';
      break;
  }
  
  // Create appropriate event object
  let event;
  
  if (eventType === 'combo') {
    event = {
      type: "combo",
      playerIndex: 0,
      playerCharacter: "Fox",
      moves: 4,
      damage: 42.5,
      startFrame: 3600,
      endFrame: 3720
    };
  } else if (eventType === 'stockLost') {
    event = {
      type: "stockLost",
      playerIndex: 1,
      playerCharacter: "Marth",
      remainingStocks: 2,
      frame: 4500
    };
  } else if (eventType === 'gameStart') {
    event = {
      type: "gameStart",
      matchup: ["Fox", "Marth"],
      stage: 31, // Battlefield
      frame: 0
    };
  } else if (eventType === 'actionState') {
    event = {
      type: "actionState",
      subType: "wavedash",
      playerIndex: 0,
      playerCharacter: "Fox",
      quality: "perfect",
      frame: 2300
    };
  }
  
  console.log(`Selected event: ${JSON.stringify(event, null, 2)}`);
  return event;
}

/**
 * Helper function to ask questions via command line
 */
function askQuestion(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Run the test
testAIIntegration().catch(error => {
  console.error("Test failed:", error);
  rl.close();
});