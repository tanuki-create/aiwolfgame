#!/usr/bin/env bun
/**
 * Generate 100 AI personas and save to database
 */
import { PersonaStore } from '@aiwolf/db';
import { RosterGenerator, DeepSeekClient } from '@aiwolf/llm';
import { join } from 'path';
import { existsSync } from 'fs';

// Load environment variables
const rootEnvPath = join(import.meta.dir, '../../../../.env');
if (existsSync(rootEnvPath)) {
  const envFile = Bun.file(rootEnvPath);
  const envContent = await envFile.text();
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const DATABASE_URL = process.env.DATABASE_URL;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

console.log('🔍 Checking environment...');
console.log('DATABASE_URL:', DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('DEEPSEEK_API_KEY:', DEEPSEEK_API_KEY ? '✅ Set' : '❌ Not set');

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

if (!DEEPSEEK_API_KEY) {
  console.error('❌ DEEPSEEK_API_KEY not set');
  process.exit(1);
}

async function main() {
  console.log('🎭 AI Persona Generator');
  console.log('========================\n');

  // Initialize stores
  const personaStore = new PersonaStore(DATABASE_URL!);
  await personaStore.initialize();

  // Check existing personas
  const existingCount = await personaStore.getCount();
  console.log(`📊 Existing personas: ${existingCount}`);

  if (existingCount >= 100) {
    console.log('✅ Already have 100+ personas. Use --force to regenerate.');
    const stats = await personaStore.getStats();
    console.log('\n📈 Statistics:');
    console.log(`  Total: ${stats.total}`);
    console.log(`  Beginner: ${stats.bySkill.BEGINNER}`);
    console.log(`  Intermediate: ${stats.bySkill.INTERMEDIATE}`);
    console.log(`  Advanced: ${stats.bySkill.ADVANCED}`);
    return;
  }

  const targetCount = 100;
  const toGenerate = targetCount - existingCount;
  console.log(`🎯 Generating ${toGenerate} new personas...\n`);

  // Initialize DeepSeek client
  const deepseekClient = new DeepSeekClient({
    apiKey: DEEPSEEK_API_KEY!,
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    timeout: 15000,
  });

  const rosterGenerator = new RosterGenerator(deepseekClient);

  // Set progress callback
  rosterGenerator.setProgressCallback((current, total, message) => {
    const percent = Math.floor((current / total) * 100);
    process.stdout.write(`\r[${percent}%] ${message}`.padEnd(80));
  });

  // Generate in batches of 10 to avoid rate limits
  const batchSize = 10;
  const batches = Math.ceil(toGenerate / batchSize);

  let totalGenerated = 0;

  for (let batch = 0; batch < batches; batch++) {
    const remaining = toGenerate - totalGenerated;
    const currentBatchSize = Math.min(batchSize, remaining);
    
    console.log(`\n\n🔄 Batch ${batch + 1}/${batches} (${currentBatchSize} personas)`);
    console.log('─'.repeat(80));

    try {
      const seed = Date.now() + batch * 1000;
      const personas = await rosterGenerator.generate(currentBatchSize, seed);

      // Save to database
      for (const persona of personas) {
        await personaStore.savePersona(persona);
        totalGenerated++;
        console.log(`\n✅ Saved: ${persona.name} (${persona.skillLevel})`);
      }

      // Wait between batches to avoid rate limits
      if (batch < batches - 1) {
        console.log(`\n⏳ Waiting 3 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(`\n❌ Error in batch ${batch + 1}:`, error);
      console.log('Continuing with next batch...');
    }
  }

  console.log('\n\n🎉 Persona generation complete!');
  console.log('─'.repeat(80));

  // Show final statistics
  const stats = await personaStore.getStats();
  console.log('\n📈 Final Statistics:');
  console.log(`  Total: ${stats.total}`);
  console.log(`  Beginner: ${stats.bySkill.BEGINNER}`);
  console.log(`  Intermediate: ${stats.bySkill.INTERMEDIATE}`);
  console.log(`  Advanced: ${stats.bySkill.ADVANCED}`);

  console.log('\n✅ Done!');
}

main().catch(console.error);

