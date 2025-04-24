// Test script to verify aiCoaching fixes
import { generateCoachingAdvice } from './src/aiCoaching.js';

// Mock LLM provider
const mockProvider = {
  name: 'Test Provider',
  generateCompletion: async (prompt) => {
    console.log('Mock provider received prompt:', prompt.substring(0, 150) + '...');
    return 'Mock coaching advice generated successfully!';
  }
};

// Mock match data
const testMatchData = {
  characters: ['Fox', 'Marth'],
  damageDealt: [254.6, 167.3],
  stockLosses: [2, 3],
  playerTypes: [0, 0] // Both human players
};

async function testCoaching() {
  console.log('Testing coaching generation...');
  try {
    const advice = await generateCoachingAdvice(mockProvider, testMatchData);
    console.log('\nGenerated coaching advice:', advice);
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCoaching();
