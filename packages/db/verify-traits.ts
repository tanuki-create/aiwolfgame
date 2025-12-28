import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_5GNXWZzBSva6@ep-weathered-voice-a1jd9mgf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const personas = await sql`
    SELECT name, personality, speaking_style, skill_level
    FROM ai_personas 
    ORDER BY id
    LIMIT 10
  `;
  
  console.log('📊 Sample personas with new traits:\n');
  
  personas.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} (${p.skill_level})`);
    console.log(`   Personality: ${p.personality}`);
    console.log(`   Speaking:    ${p.speaking_style}\n`);
  });
  
  await sql.end();
}

main().catch(console.error);
