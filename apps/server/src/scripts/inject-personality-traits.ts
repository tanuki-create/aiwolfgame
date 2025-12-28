/**
 * Script to inject personality traits into existing personas
 * This updates the personality and speakingStyle fields to include
 * keywords that the speechTraits system recognizes.
 */

import { PersonaStore } from '@aiwolf/db';

// Load environment variables directly
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5GNXWZzBSva6@ep-weathered-voice-a1jd9mgf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

/**
 * Personality trait templates
 */
const PERSONALITY_TRAITS = {
  aggressive: [
    'aggressive and outspoken',
    'active and energetic',
    'bold and assertive',
    'enthusiastic and vocal',
    'confident and outgoing',
  ],
  cautious: [
    'cautious and reserved',
    'quiet and observant',
    'thoughtful and reserved',
    'careful and shy',
    'measured and introverted',
  ],
  analytical: [
    'analytical and thoughtful',
    'strategic and calculating',
    'logical and methodical',
    'perceptive and detailed',
    'rational and systematic',
  ],
};

const SPEAKING_STYLES = {
  aggressive: [
    'speaks enthusiastically with many exclamations',
    'talks quickly and confidently',
    'uses direct and assertive language',
    'expresses opinions boldly',
    'interrupts when excited',
  ],
  cautious: [
    'speaks briefly and carefully',
    'uses measured and quiet tone',
    'chooses words cautiously',
    'speaks only when necessary',
    'prefers listening to talking',
  ],
  analytical: [
    'speaks with detailed explanations',
    'uses logical and structured arguments',
    'provides thorough analysis',
    'references facts and observations',
    'speaks methodically',
  ],
};

/**
 * Determine personality type based on various factors
 */
function determinePersonalityType(
  index: number,
  name: string,
  currentPersonality: string,
  playStyle: string,
  skillLevel: string
): 'aggressive' | 'cautious' | 'analytical' {
  // Check existing personality/playStyle for hints
  const combined = `${currentPersonality} ${playStyle}`.toLowerCase();
  
  // If already has strong indicators, preserve them
  if (combined.includes('aggressive') || combined.includes('bold') || combined.includes('active')) {
    return 'aggressive';
  }
  if (combined.includes('cautious') || combined.includes('careful') || combined.includes('reserved')) {
    return 'cautious';
  }
  if (combined.includes('analytical') || combined.includes('strategic') || combined.includes('logical')) {
    return 'analytical';
  }

  // Otherwise, distribute based on index for variety
  // 30% aggressive, 40% analytical, 30% cautious
  const mod = index % 10;
  
  if (mod < 3) {
    return 'aggressive';
  } else if (mod < 7) {
    return 'analytical';
  } else {
    return 'cautious';
  }
}

/**
 * Generate enhanced personality description
 */
function enhancePersonality(
  type: 'aggressive' | 'cautious' | 'analytical',
  originalPersonality: string
): string {
  // Pick a trait template
  const traitTemplates = PERSONALITY_TRAITS[type];
  const baseTrait = traitTemplates[Math.floor(Math.random() * traitTemplates.length)];
  
  // Combine with original if it adds value
  const original = originalPersonality.trim();
  if (original && original.length > 10 && !original.toLowerCase().includes(type)) {
    return `${baseTrait}, ${original}`;
  }
  
  return baseTrait;
}

/**
 * Generate enhanced speaking style
 */
function enhanceSpeakingStyle(
  type: 'aggressive' | 'cautious' | 'analytical',
  originalStyle: string
): string {
  // Pick a speaking style template
  const styleTemplates = SPEAKING_STYLES[type];
  const baseStyle = styleTemplates[Math.floor(Math.random() * styleTemplates.length)];
  
  // Combine with original if it adds value
  const original = originalStyle.trim();
  if (original && original.length > 10 && !original.toLowerCase().includes(type)) {
    return `${baseStyle}; ${original}`;
  }
  
  return baseStyle;
}

/**
 * Main injection function
 */
async function injectPersonalityTraits() {
  console.log('🎭 Starting personality trait injection...\n');

  const personaStore = new PersonaStore(DATABASE_URL);
  console.log('📦 PersonaStore created');
  
  await personaStore.initialize();
  console.log('✅ PersonaStore initialized');

  // Get all existing personas
  console.log('🔍 Fetching all personas...');
  const allPersonas = await personaStore.getAllPersonas();
  console.log(`📊 Found ${allPersonas.length} personas in database\n`);

  if (allPersonas.length === 0) {
    console.log('⚠️  No personas found. Run generate-personas first.');
    process.exit(0);
  }

  // Track distribution
  const distribution = {
    aggressive: 0,
    cautious: 0,
    analytical: 0,
  };

  let updated = 0;

  // Process each persona
  for (let i = 0; i < allPersonas.length; i++) {
    const persona = allPersonas[i];
    
    // Determine personality type
    const type = determinePersonalityType(
      i,
      persona.name,
      persona.personality,
      persona.play_style,
      persona.skill_level
    );
    
    distribution[type]++;

    // Enhance personality and speaking style
    const enhancedPersonality = enhancePersonality(type, persona.personality);
    const enhancedSpeakingStyle = enhanceSpeakingStyle(type, persona.speaking_style);

    // Update in database
    await personaStore.updatePersonalityTraits(
      persona.id,
      enhancedPersonality,
      enhancedSpeakingStyle
    );

    updated++;

    // Log progress
    if (updated % 10 === 0 || updated === allPersonas.length) {
      console.log(`✅ Updated ${updated}/${allPersonas.length} personas...`);
    }
  }

  console.log('\n🎉 Personality trait injection complete!\n');
  console.log('📊 Distribution:');
  console.log(`   Aggressive: ${distribution.aggressive} (${((distribution.aggressive / allPersonas.length) * 100).toFixed(1)}%)`);
  console.log(`   Analytical: ${distribution.analytical} (${((distribution.analytical / allPersonas.length) * 100).toFixed(1)}%)`);
  console.log(`   Cautious:   ${distribution.cautious} (${((distribution.cautious / allPersonas.length) * 100).toFixed(1)}%)`);
  console.log('');

  process.exit(0);
}

// Run
console.log('🚀 Script starting...');
injectPersonalityTraits().catch((error) => {
  console.error('❌ Error injecting personality traits:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

