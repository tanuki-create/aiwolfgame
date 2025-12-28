#!/usr/bin/env bun
/**
 * Show AI persona statistics
 */
import { PersonaStore } from '@aiwolf/db';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const personaStore = new PersonaStore(DATABASE_URL!);
  await personaStore.initialize();

  const stats = await personaStore.getStats();

  console.log('\n🎭 AI Persona Statistics');
  console.log('═'.repeat(80));
  console.log(`\n📊 Total Personas: ${stats.total}`);
  console.log('\n📈 By Skill Level:');
  console.log(`   Beginner:     ${stats.bySkill.BEGINNER.toString().padStart(3)} (${((stats.bySkill.BEGINNER / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   Intermediate: ${stats.bySkill.INTERMEDIATE.toString().padStart(3)} (${((stats.bySkill.INTERMEDIATE / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   Advanced:     ${stats.bySkill.ADVANCED.toString().padStart(3)} (${((stats.bySkill.ADVANCED / stats.total) * 100).toFixed(1)}%)`);

  console.log('\n🔥 Most Used (Top 10):');
  stats.mostUsed.forEach((p, i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${p.name.padEnd(30)} ${p.usedCount.toString().padStart(3)} times`);
  });

  console.log('\n💤 Least Used (Top 10):');
  stats.leastUsed.forEach((p, i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${p.name.padEnd(30)} ${p.usedCount.toString().padStart(3)} times`);
  });

  console.log('\n' + '═'.repeat(80) + '\n');
}

main().catch(console.error);

