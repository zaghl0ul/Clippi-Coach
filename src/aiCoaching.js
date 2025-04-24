// src/aiCoaching.js modification
import { generateFallbackCoaching } from './templateCoachingSystem.js';

export async function generateCoachingAdvice(llmProvider, matchData) {
  if (!matchData || !matchData.characters || !matchData.damageDealt || !matchData.stockLosses) {
    console.warn("[AI Coaching] Insufficient match data provided.");
    return "Cannot generate coaching advice: Missing essential match data (characters, damage, stocks).";
  }
  
  // If no LLM provider, use template-based coaching
  if (!llmProvider) {
    console.log("[Template] Generating coaching advice using templates...");
    return generateFallbackCoaching(matchData);
  }
  
  // Construct advanced coaching prompt
  const prompt = createAdvancedCoachingPrompt(matchData);
  
  try {
    console.log(`[${llmProvider.name}] Generating coaching advice...`);
    
    // Use provider abstraction for coaching generation
    const advice = await llmProvider.generateCompletion(prompt, {
      maxTokens: 800, // Reduced for faster responses
      temperature: 0.7,
      systemPrompt: 'You are an elite-level Super Smash Bros. Melee coach with technical expertise.'
    });
    
    console.log(`[${llmProvider.name}] Coaching advice generated successfully.`);
    return advice || "Unable to generate coaching advice.";
  } catch (error) {
    console.error('[AI Coaching] Error:', error.message);
    
    // Fallback to template coaching
    return generateFallbackCoaching(matchData);
  }
}