import type { Persona } from '../types/player.js';

/**
 * Speech characteristics based on personality
 */
export interface SpeechTraits {
  baseInterval: number;      // Base time between speeches (ms)
  intervalVariance: number;  // Random variance (ms)
  reactionChance: number;    // Probability to react to messages (0-1)
  mentionReactionBoost: number; // Multiplier when mentioned
  minTimeSinceLastSpeech: number; // Minimum cooldown (ms)
  maxMessageLength: number;  // Preferred message length (tokens)
}

/**
 * Extract speech traits from personality description
 */
export function getSpeechTraits(persona: Persona): SpeechTraits {
  const personality = persona.personality.toLowerCase();
  const speakingStyle = persona.speakingStyle.toLowerCase();
  
  // Default traits
  let traits: SpeechTraits = {
    baseInterval: 8000,      // 8 seconds
    intervalVariance: 5000,  // ±5 seconds
    reactionChance: 0.3,     // 30% chance to react
    mentionReactionBoost: 3, // 3x when mentioned
    minTimeSinceLastSpeech: 3000, // 3 seconds minimum
    maxMessageLength: 100,   // ~100 tokens
  };

  // Aggressive/Active personalities - speak more often
  if (personality.includes('aggressive') || 
      personality.includes('active') || 
      personality.includes('outspoken') ||
      personality.includes('energetic') ||
      speakingStyle.includes('enthusiastic')) {
    traits.baseInterval = 5000;       // 5 seconds
    traits.intervalVariance = 3000;   // ±3 seconds
    traits.reactionChance = 0.5;      // 50% chance
    traits.minTimeSinceLastSpeech = 2000; // 2 seconds
  }

  // Cautious/Reserved personalities - speak less often
  if (personality.includes('cautious') || 
      personality.includes('reserved') || 
      personality.includes('quiet') ||
      personality.includes('shy') ||
      speakingStyle.includes('brief')) {
    traits.baseInterval = 12000;      // 12 seconds
    traits.intervalVariance = 8000;   // ±8 seconds
    traits.reactionChance = 0.15;     // 15% chance
    traits.minTimeSinceLastSpeech = 5000; // 5 seconds
    traits.maxMessageLength = 60;     // Shorter messages
  }

  // Analytical personalities - medium frequency, longer messages
  if (personality.includes('analytical') || 
      personality.includes('thoughtful') || 
      personality.includes('strategic') ||
      speakingStyle.includes('detailed')) {
    traits.baseInterval = 10000;      // 10 seconds
    traits.intervalVariance = 5000;   // ±5 seconds
    traits.reactionChance = 0.35;     // 35% chance
    traits.maxMessageLength = 150;    // Longer, detailed messages
  }

  // Skill level adjustments
  if (persona.skillLevel === 'BEGINNER') {
    // Beginners speak less strategically
    traits.reactionChance *= 0.8;
  } else if (persona.skillLevel === 'ADVANCED') {
    // Advanced players are more responsive
    traits.reactionChance *= 1.2;
    traits.mentionReactionBoost *= 1.5;
  }

  return traits;
}

/**
 * Calculate actual speech delay with variance
 */
export function calculateSpeechDelay(traits: SpeechTraits): number {
  const variance = (Math.random() - 0.5) * 2 * traits.intervalVariance;
  return Math.max(
    traits.minTimeSinceLastSpeech,
    traits.baseInterval + variance
  );
}

/**
 * Check if AI should react to a message
 */
export function shouldReactToMessage(
  traits: SpeechTraits,
  isMentioned: boolean,
  timeSinceLastSpeech: number
): boolean {
  // Don't react if spoke too recently
  if (timeSinceLastSpeech < traits.minTimeSinceLastSpeech) {
    return false;
  }

  let chance = traits.reactionChance;
  
  if (isMentioned) {
    chance *= traits.mentionReactionBoost;
  }

  // Cap at 90%
  chance = Math.min(0.9, chance);

  return Math.random() < chance;
}

