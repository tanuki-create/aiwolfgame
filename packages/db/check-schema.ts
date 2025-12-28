import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_5GNXWZzBSva6@ep-weathered-voice-a1jd9mgf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const columns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'ai_personas'
    ORDER BY ordinal_position
  `;
  
  console.log('📊 ai_personas table structure:');
  columns.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
  
  const count = await sql`SELECT COUNT(*) as count FROM ai_personas`;
  console.log(`\n📈 Total personas: ${count[0].count}`);
  
  await sql.end();
}

main().catch(console.error);
