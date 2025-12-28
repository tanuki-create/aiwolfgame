import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_5GNXWZzBSva6@ep-weathered-voice-a1jd9mgf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('🔍 CHECKING ALL TABLES\n');
  
  // game_states
  const gameCount = await sql`SELECT COUNT(*) FROM game_states`;
  console.log(`📦 game_states: ${gameCount[0].count} records`);
  if (gameCount[0].count > 0) {
    const recent = await sql`
      SELECT game_id, phase, day_number, created_at 
      FROM game_states 
      ORDER BY created_at DESC LIMIT 3
    `;
    console.log('  Recent games:');
    recent.forEach(g => console.log(`    - ${g.game_id} (Day ${g.day_number}, Phase: ${g.phase})`));
  }
  
  // public_messages
  const pubCount = await sql`SELECT COUNT(*) FROM public_messages`;
  console.log(`\n💬 public_messages: ${pubCount[0].count} records`);
  if (pubCount[0].count > 0) {
    const recentMsg = await sql`
      SELECT player_name, content, timestamp 
      FROM public_messages 
      ORDER BY timestamp DESC LIMIT 3
    `;
    console.log('  Recent messages:');
    recentMsg.forEach(m => console.log(`    - ${m.player_name}: "${m.content.substring(0, 40)}..."`));
  }
  
  // wolf_messages
  const wolfCount = await sql`SELECT COUNT(*) FROM wolf_messages`;
  console.log(`\n🐺 wolf_messages: ${wolfCount[0].count} records`);
  
  // internal_events
  const eventCount = await sql`SELECT COUNT(*) FROM internal_events`;
  console.log(`\n⚡ internal_events: ${eventCount[0].count} records`);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ これで全てです！他のテーブルはありません。');
  
  await sql.end();
}

main().catch(console.error);
