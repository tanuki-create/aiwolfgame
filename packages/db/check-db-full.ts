import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_5GNXWZzBSva6@ep-weathered-voice-a1jd9mgf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('🗄️  DATABASE FULL OVERVIEW\n');
  console.log('=' .repeat(60));
  
  // 1. List all tables
  console.log('\n📊 TABLES:');
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  tables.forEach(t => console.log(`  - ${t.table_name}`));
  
  // 2. ai_personas details
  console.log('\n\n📋 AI_PERSONAS TABLE:');
  const personaCount = await sql`SELECT COUNT(*) as count FROM ai_personas`;
  console.log(`  Total: ${personaCount[0].count} personas`);
  
  const bySkill = await sql`
    SELECT skill_level, COUNT(*) as count 
    FROM ai_personas 
    GROUP BY skill_level 
    ORDER BY skill_level
  `;
  console.log('\n  By Skill Level:');
  bySkill.forEach(s => console.log(`    ${s.skill_level}: ${s.count}`));
  
  const byPersonality = await sql`
    SELECT 
      CASE 
        WHEN personality LIKE '%aggressive%' OR personality LIKE '%active%' OR personality LIKE '%bold%' THEN 'aggressive'
        WHEN personality LIKE '%cautious%' OR personality LIKE '%quiet%' OR personality LIKE '%reserved%' THEN 'cautious'
        WHEN personality LIKE '%analytical%' OR personality LIKE '%strategic%' OR personality LIKE '%logical%' THEN 'analytical'
        ELSE 'other'
      END as type,
      COUNT(*) as count
    FROM ai_personas
    GROUP BY type
    ORDER BY type
  `;
  console.log('\n  By Personality Type:');
  byPersonality.forEach(p => console.log(`    ${p.type}: ${p.count}`));
  
  const usage = await sql`
    SELECT 
      MIN(usage_count) as min_used,
      MAX(usage_count) as max_used,
      AVG(usage_count)::numeric(10,2) as avg_used
    FROM ai_personas
  `;
  console.log('\n  Usage Stats:');
  console.log(`    Min: ${usage[0].min_used}, Max: ${usage[0].max_used}, Avg: ${usage[0].avg_used}`);
  
  // 3. Sample personas
  console.log('\n\n👤 SAMPLE PERSONAS (first 5):');
  const samples = await sql`
    SELECT name, skill_level, personality, speaking_style
    FROM ai_personas
    ORDER BY id
    LIMIT 5
  `;
  samples.forEach((p, i) => {
    console.log(`\n  ${i + 1}. ${p.name} (${p.skill_level})`);
    console.log(`     Personality: ${p.personality}`);
    console.log(`     Speaking: ${p.speaking_style}`);
  });
  
  // 4. Check other tables if they exist
  const hasGameStates = tables.some(t => t.table_name === 'game_states');
  const hasLogs = tables.some(t => t.table_name === 'public_messages' || t.table_name === 'game_logs');
  
  if (hasGameStates) {
    const gameCount = await sql`SELECT COUNT(*) as count FROM game_states`;
    console.log(`\n\n🎮 GAME_STATES: ${gameCount[0].count} games`);
  }
  
  if (hasLogs) {
    const logTable = tables.find(t => t.table_name === 'public_messages' || t.table_name === 'game_logs')?.table_name;
    if (logTable) {
      const logCount = await sql`SELECT COUNT(*) as count FROM ${sql(logTable)}`;
      console.log(`\n📝 ${logTable.toUpperCase()}: ${logCount[0].count} messages`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  await sql.end();
}

main().catch(console.error);
