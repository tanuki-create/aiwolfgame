import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_5GNXWZzBSva6@ep-weathered-voice-a1jd9mgf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('🗄️  DATABASE SUMMARY\n');
  
  // Tables
  const tables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
  `;
  console.log('📊 Tables:');
  tables.forEach(t => console.log(`  - ${t.table_name}`));
  
  // Personas count
  const count = await sql`SELECT COUNT(*) FROM ai_personas`;
  console.log(`\n👥 ai_personas: ${count[0].count} records`);
  
  // Skill distribution
  const skills = await sql`
    SELECT skill_level, COUNT(*) as cnt 
    FROM ai_personas GROUP BY skill_level
  `;
  console.log('\n📈 By Skill:');
  skills.forEach(s => console.log(`  ${s.skill_level}: ${s.cnt}`));
  
  await sql.end();
}

main().catch(console.error);
