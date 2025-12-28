# AI Werewolf Game - Neon Setup Guide

## 🎯 Prerequisites

1. **Bun Runtime** ✅ (Already installed)
2. **Neon PostgreSQL Account** - Get free database at https://neon.tech
3. **DeepSeek API Key** - Get from https://platform.deepseek.com

---

## 📦 Setup Steps

### 1. Create Neon Database

1. Go to https://console.neon.tech
2. Create a new project (free tier is fine)
3. Copy your connection string (it looks like):
   ```
   postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
   ```

### 2. Configure Environment

Edit `.env` file and update these values:

```bash
# DeepSeek API (required)
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here

# Neon Database (required - paste your connection string)
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/aiwolf?sslmode=require
```

### 3. Initialize Database

Run this command to create all necessary tables:

```bash
cd apps/server
bun run init-db
```

Expected output:
```
🔧 Initializing database schema...
Database: postgresql://***@ep-xxx.neon.tech/aiwolf
Creating game state tables...
Creating log tables...
✅ Database schema initialized successfully!
```

### 4. Start Development Server

From the project root:

```bash
bun dev
```

This starts:
- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:3000

---

## 🎮 Using the Game

1. Open http://localhost:3000
2. Click **"Create New Game"**
3. Select role packs or use "Random Start"
4. Click **"Create Game"**
5. Enter your name and join
6. Play with 10 AI players powered by DeepSeek-V3!

---

## 📊 Database Schema

### Tables Created:

1. **game_states** - Current game state (replaces Redis)
   - `game_id` (PRIMARY KEY)
   - `state` (JSONB)
   - `updated_at` (TIMESTAMP)

2. **public_messages** - Public chat log
   - `id`, `game_id`, `player_id`, `content`, `timestamp`

3. **wolf_messages** - Wolf chat log (admin only)
   - `id`, `game_id`, `player_id`, `content`, `timestamp`

4. **internal_events** - Game events log
   - `id`, `game_id`, `event_type`, `data`, `timestamp`

---

## 🧪 Testing

### Run Unit Tests
```bash
bun test
```

### Run Game Simulation
```bash
cd apps/server
bun run simulate 100
```

---

## 🔧 Troubleshooting

### Database Connection Failed

Check your Neon connection string:
```bash
# Test connection
psql "$DATABASE_URL"
```

### Port Already in Use

```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### DeepSeek API Errors

- Check API key in `.env`
- Verify you have credits: https://platform.deepseek.com
- Check rate limits

---

## 🌐 Environment Variables

Required in `.env`:

```bash
# DeepSeek API
DEEPSEEK_API_KEY=sk-xxx          # Your API key
DEEPSEEK_MODEL=deepseek-chat     # Model name
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Neon Database
DATABASE_URL=postgresql://...    # Your Neon connection string

# Server
PORT=4000                        # Server port
JWT_SECRET=change-in-production  # JWT secret
NODE_ENV=development             # Environment
```

---

## 📁 Project Structure

```
aiwolfgame/
├── apps/
│   ├── server/          # Bun server
│   │   └── src/
│   │       ├── index.ts     # Main entry
│   │       └── init-db.ts   # DB initialization
│   └── web/             # React frontend
├── packages/
│   ├── shared/          # Common types
│   ├── fsm/            # Game engine
│   ├── llm/            # DeepSeek integration
│   └── db/             # Neon database layer
└── .env                # Configuration (you need to edit this!)
```

---

## 🚀 Quick Commands

```bash
# Install dependencies
bun install

# Initialize database
cd apps/server && bun run init-db

# Start development
bun dev

# Run tests
bun test

# Simulate 100 games
cd apps/server && bun run simulate 100
```

---

## 🎯 Next Steps

1. ✅ Bun installed
2. ✅ Dependencies installed
3. ⏳ Get Neon database connection string
4. ⏳ Get DeepSeek API key
5. ⏳ Update `.env` file
6. ⏳ Run `bun run init-db`
7. ⏳ Run `bun dev`
8. ⏳ Open http://localhost:3000

---

## 💡 Features

- 🐺 11-player Werewolf game (1 human + 10 AI)
- 🎭 5 role expansion packs
- 🤖 DeepSeek-V3 powered AI players
- 🎲 Deterministic seeded randomization
- 💬 Real-time chat
- 🌙 Wolf-only private chat
- 🔍 Admin debugging panel
- 📊 Game simulation suite

---

## 🆘 Support

If you encounter issues:

1. Check `.env` configuration
2. Verify Neon database connection
3. Check DeepSeek API key
4. Review server logs
5. Test database: `psql "$DATABASE_URL"`

---

## 🎉 Ready to Play!

Once you've:
1. Updated `.env` with Neon connection string
2. Updated `.env` with DeepSeek API key
3. Run `bun run init-db`
4. Run `bun dev`

Then visit http://localhost:3000 and create your first game! 🐺

