import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_5GNXWZzBSva6@ep-weathered-voice-a1jd9mgf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('🔧 Adding personality and speaking_style columns...');
  
  // Add columns if they don't exist
  await sql`
    ALTER TABLE ai_personas 
    ADD COLUMN IF NOT EXISTS personality TEXT DEFAULT 'balanced personality',
    ADD COLUMN IF NOT EXISTS speaking_style TEXT DEFAULT 'speaks naturally'
  `;
  
  console.log('✅ Columns added');
  
  // Verify
  const columns = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'ai_personas'
    ORDER BY ordinal_position
  `;
  
  console.log('\n📊 Updated table structure:');
  columns.forEach(c => console.log(`  - ${c.column_name}`));
  
  await sql.end();
  console.log('\n🎉 Schema migration complete!');
}

main().catch(console.error);
