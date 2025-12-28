# Installation & Setup Guide

## ✅ Complete Setup Checklist

Follow these steps in order to get the AI Werewolf game running:

### 1. Install Bun Runtime

If you haven't installed Bun yet:

```bash
curl -fsSL https://bun.sh/install | bash
```

Or on macOS:
```bash
brew install oven-sh/bun/bun
```

### 2. Install Project Dependencies

From the root directory:

```bash
bun install
```

This installs all dependencies for all packages in the monorepo.

### 3. Start Database Services

Make sure Docker is running, then:

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

You should see Redis (port 6379) and PostgreSQL (port 5432) running.

### 4. Configure Environment Variables

The `.env` file has been created. **IMPORTANT**: Update it with your actual DeepSeek API key:

```bash
# Open .env file and update:
DEEPSEEK_API_KEY=sk-your-actual-api-key-here
```

Get your API key from: https://platform.deepseek.com/

### 5. Initialize Database Schema

This creates the necessary PostgreSQL tables:

```bash
cd apps/server
bun run init-db
cd ../..
```

Expected output:
```
🔧 Initializing database schema...
✅ Database schema initialized successfully!
```

### 6. Start Development Servers

From the root directory:

```bash
bun dev
```

This starts:
- **Backend Server**: http://localhost:4000 (WebSocket + REST API)
- **Frontend Web**: http://localhost:3000 (React UI)

Both support hot reload during development.

---

## 🎮 Using the Game

### Create Your First Game

1. Open http://localhost:3000 in your browser
2. Click **"Create New Game"**
3. Choose options:
   - Select role expansion packs (FOX, FREEMASON, etc.)
   - OR check **"Random Start"** for auto-selection
4. Click **"Create Game"**

### Join and Play

1. Enter your name
2. Click **"Join Game"**
3. The game will start with you + 10 AI players!
4. Chat with AI players during discussion
5. Vote during voting phase
6. Watch AI wolves coordinate (if you're a wolf, you'll see wolf chat)

---

## 🧪 Testing & Development

### Run Unit Tests

Test the core game logic:

```bash
# Test all packages
bun test

# Test specific package
cd packages/fsm
bun test
```

### Run Game Simulation

Test game stability with automated simulations:

```bash
cd apps/server

# Run 100 simulated games
bun run simulate 100

# Run 1000 games with custom seed
bun run simulate 1000 5000
```

This generates a JSON report with:
- Win rate statistics
- Average game length
- Crash rate
- Timeout rate

### Access Admin Panel

To view internal game logs (wolf chat, role assignments):

1. Go to http://localhost:3000/admin/{room_id}
2. Enter admin token: `admin` (development only)
3. View:
   - Role assignments
   - Wolf chat transcripts
   - Internal event logs

---

## 📂 Project Structure

```
aiwolfgame/
├── apps/
│   ├── server/              # Bun server
│   │   ├── src/
│   │   │   ├── index.ts     # Main server entry
│   │   │   ├── init-db.ts   # Database initialization
│   │   │   ├── ws/          # WebSocket handlers
│   │   │   ├── api/         # REST API routes
│   │   │   ├── rooms/       # Room management
│   │   │   └── simulation/  # Game simulator
│   │   └── package.json
│   └── web/                 # React frontend
│       ├── src/
│       │   ├── pages/       # Route pages
│       │   ├── components/  # React components
│       │   └── main.tsx     # Entry point
│       └── package.json
├── packages/
│   ├── shared/              # Common types & utilities
│   │   ├── src/types/       # TypeScript definitions
│   │   └── src/constants/   # Game constants
│   ├── fsm/                 # Game state machine
│   │   ├── src/roles/       # Role system & packs
│   │   ├── src/vote/        # Voting system
│   │   ├── src/night/       # Night resolution
│   │   └── src/victory/     # Win conditions
│   ├── llm/                 # DeepSeek integration
│   │   ├── src/client/      # API client
│   │   ├── src/tools/       # Function definitions
│   │   ├── src/roster/      # AI persona generation
│   │   ├── src/context/     # Context builders
│   │   └── src/orchestrator/ # AI tempo control
│   └── db/                  # Database layer
│       ├── src/redis/       # Game state store
│       └── src/postgres/    # Log store
├── docker-compose.yml       # Database services
├── turbo.json              # Turborepo config
└── package.json            # Root package
```

---

## 🔧 Troubleshooting

### Port Already in Use

If port 4000 or 3000 is already in use:

```bash
# Find process using port
lsof -ti:4000
lsof -ti:3000

# Kill process
kill -9 <PID>
```

### Database Connection Failed

Check if databases are running:

```bash
# Check containers
docker-compose ps

# Restart if needed
docker-compose restart

# View logs
docker-compose logs postgres
docker-compose logs redis
```

### DeepSeek API Errors

Common issues:
- **Invalid API key**: Check `.env` file has correct key
- **Rate limit**: Wait a few seconds between requests
- **No credits**: Add credits to your DeepSeek account

### Build Errors

Clear cache and reinstall:

```bash
# Clean everything
bun run clean

# Remove node_modules
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# Reinstall
bun install
```

---

## 📊 Available Commands

### Root Level

```bash
bun install         # Install all dependencies
bun dev            # Start all dev servers
bun build          # Build all packages
bun test           # Run all tests
bun clean          # Clean build artifacts
```

### Server (apps/server)

```bash
bun run dev        # Start server with hot reload
bun run init-db    # Initialize database schema
bun run simulate   # Run game simulation
bun test           # Run server tests
```

### Web (apps/web)

```bash
bun run dev        # Start Vite dev server
bun run build      # Build production bundle
bun run preview    # Preview production build
```

---

## 🌐 API Reference

### REST Endpoints

Base URL: `http://localhost:4000/api`

- `POST /rooms` - Create new game room
- `GET /rooms` - List all active rooms
- `POST /rooms/:id/join` - Join room (get token)
- `GET /rooms/:id` - Get room state
- `POST /rooms/:id/start` - Start game
- `GET /rooms/:id/replay` - Get game replay
- `GET /admin/rooms/:id/logs` - Admin logs

### WebSocket

Connect: `ws://localhost:4000/ws?token=<token>`

Client → Server events:
- `SEND_MESSAGE` - Send public chat
- `SEND_WOLF_MESSAGE` - Send wolf chat
- `SUBMIT_VOTE` - Submit vote
- `SUBMIT_NIGHT_ACTION` - Night action
- `SUBMIT_WOLF_ATTACK` - Wolf attack decision

Server → Client events:
- `ROOM_STATE` - Full game state update
- `MESSAGE` - New public message
- `WOLF_MESSAGE` - New wolf message
- `PHASE_CHANGE` - Phase transition
- `VOTE_RESULT` - Voting results
- `NIGHT_RESULT` - Night results
- `GAME_END` - Game over

---

## 🎯 Next Steps

Now that setup is complete, you can:

1. **Play a game**: Create and join a room
2. **Test with simulations**: Run automated games
3. **Explore code**: Check out the implementation
4. **Customize**: Modify AI behavior, add features
5. **Deploy**: Prepare for production deployment

---

## 💡 Tips

- **Development**: Use separate terminal tabs for server and logs
- **Debugging**: Check browser console for client errors
- **Testing**: Run simulations to find edge cases
- **Performance**: Redis handles game state, PostgreSQL for logs
- **Scaling**: Each room runs independently

---

## 🚀 Production Deployment

For production deployment:

1. Set proper environment variables
2. Use production database URLs
3. Set `NODE_ENV=production`
4. Build all packages: `bun run build`
5. Use proper JWT secrets
6. Enable rate limiting
7. Set up monitoring

---

## 📞 Support

If you encounter issues:

1. Check server logs: `docker-compose logs -f`
2. Check database: `psql $POSTGRES_URL`
3. Test Redis: `redis-cli -h localhost -p 6379 ping`
4. Review error messages in browser console
5. Run tests: `bun test`

Happy gaming! 🐺

