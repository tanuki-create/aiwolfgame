import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_5GNXWZzBSva6@ep-weathered-voice-a1jd9mgf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const PERSONALITY_TRAITS = {
  aggressive: ['aggressive and outspoken', 'active and energetic', 'bold and assertive'],
  cautious: ['cautious and reserved', 'quiet and observant', 'thoughtful and reserved'],
  analytical: ['analytical and thoughtful', 'strategic and calculating', 'logical and methodical'],
};

const SPEAKING_STYLES = {
  aggressive: ['speaks enthusiastically', 'talks quickly and confidently', 'uses direct language'],
  cautious: ['speaks briefly', 'uses measured tone', 'chooses words carefully'],
  analytical: ['speaks with detail', 'uses logical arguments', 'provides thorough analysis'],
};

async function main() {
  console.log('🎭 Starting personality trait injection...');
  
  const sql = postgres(DATABASE_URL);
  
  try {
    const personas = await sql`SELECT id, name, personality, speaking_style, skill_level, play_style FROM ai_personas ORDER BY id`;
    console.log(`📊 Found ${personas.length} personas`);
    
    if (personas.length === 0) {
      console.log('⚠️  No personas found.');
      process.exit(0);
    }
    
    const dist = { aggressive: 0, cautious: 0, analytical: 0 };
    
    for (let i = 0; i < personas.length; i++) {
      const p = personas[i];
      const mod = i % 10;
      const type = mod < 3 ? 'aggressive' : mod < 7 ? 'analytical' : 'cautious';
      dist[type]++;
      
      const newPersonality = PERSONALITY_TRAITS[type][i % PERSONALITY_TRAITS[type].length];
      const newSpeaking = SPEAKING_STYLES[type][i % SPEAKING_STYLES[type].length];
      
      await sql`
        UPDATE ai_personas 
        SET personality = ${newPersonality}, speaking_style = ${newSpeaking}
        WHERE id = ${p.id}
      `;
      
      if ((i + 1) % 10 === 0) {
        console.log(`✅ Updated ${i + 1}/${personas.length}...`);
      }
    }
    
    console.log(`\n🎉 Complete! Distribution: Aggressive ${dist.aggressive}, Analytical ${dist.analytical}, Cautious ${dist.cautious}`);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
