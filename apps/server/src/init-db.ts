import { GameStateStore, LogStore } from '@aiwolf/db';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:dev@localhost:5432/aiwolf';

console.log('🔧 Initializing database schema...');
console.log(`Database: ${DATABASE_URL.replace(/\/\/[^@]+@/, '//***@')}`);

const stateStore = new GameStateStore(DATABASE_URL);
const logStore = new LogStore(DATABASE_URL);

try {
  console.log('Creating game state tables...');
  await stateStore.initialize();
  
  console.log('Creating log tables...');
  await logStore.initialize();
  
  console.log('✅ Database schema initialized successfully!');
  
  await stateStore.close();
  await logStore.close();
} catch (error) {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
}

