# AI Werewolf Game - Quick Start Guide

## Prerequisites

- [Bun](https://bun.sh) installed
- Docker and Docker Compose (for databases)
- DeepSeek API key

## Setup Steps

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

The `.env` file has been created. Update it with your DeepSeek API key:

```bash
DEEPSEEK_API_KEY=your_actual_api_key_here
```

### 3. Start Database Services

```bash
docker-compose up -d
```

This starts Redis (port 6379) and PostgreSQL (port 5432).

### 4. Initialize Database Schema

```bash
cd apps/server
bun run src/init-db.ts
```

### 5. Start Development Servers

From the root directory:

```bash
bun dev
```

This starts:
- **Server**: http://localhost:4000
- **Web**: http://localhost:3000

## Usage

1. Open http://localhost:3000 in your browser
2. Click "Create New Game"
3. Select role packs or use "Random Start"
4. Click "Create Game"
5. Enter your name and join
6. The game will start with you + 10 AI players!

## Project Structure

```
aiwolfgame/
├── apps/
│   ├── server/          # Bun WebSocket/REST server
│   │   └── src/
│   │       ├── index.ts        # Main server
│   │       ├── init-db.ts      # Database initialization
│   │       ├── ws/             # WebSocket handlers
│   │       ├── api/            # REST API routes
│   │       └── rooms/          # Room management
│   └── web/             # Vite + React frontend
│       └── src/
│           ├── pages/          # React pages
│           └── main.tsx        # Entry point
├── packages/
│   ├── shared/          # Common types & utilities
│   ├── fsm/             # Game state machine
│   ├── llm/             # DeepSeek integration
│   └── db/              # Redis/PostgreSQL
└── docker-compose.yml   # Database services
```

## Available Scripts

- `bun dev` - Start all development servers
- `bun build` - Build all packages
- `bun test` - Run tests
- `bun clean` - Clean build artifacts

## API Endpoints

### REST API (http://localhost:4000/api)

- `POST /rooms` - Create new game room
- `GET /rooms` - List all active rooms
- `POST /rooms/:id/join` - Join a room (get token)
- `GET /rooms/:id` - Get room state
- `POST /rooms/:id/start` - Start the game
- `GET /rooms/:id/replay` - Get game replay
- `GET /admin/rooms/:id/logs` - Get admin logs (wolf chat, role assignments)

### WebSocket (ws://localhost:4000/ws)

Connect with token: `ws://localhost:4000/ws?token=<your_token>`

## Game Features

### Base Game (11 Players)
- Werewolf × 2
- Seer × 1
- Medium × 1
- Madman × 1
- Knight × 1
- Villager × 5

### Role Expansion Packs
1. **Fox**: Third-party faction
2. **Freemason**: Two villagers who know each other
3. **Hunter**: Chain reaction on death
4. **Fanatic**: Madman who appears as werewolf to seer
5. **White Wolf**: Werewolf who appears as human to seer

### AI System
- 3-tier skill levels (Beginner/Intermediate/Advanced)
- Natural tempo control with typing delays
- Automatic fallbacks for timeouts
- Wolf chat with leader protocol

## Troubleshooting

### Server won't start
- Check if databases are running: `docker-compose ps`
- Verify environment variables in `.env`
- Check port 4000 is not in use

### WebSocket connection fails
- Ensure server is running on port 4000
- Check browser console for errors
- Verify token is valid

### Database errors
- Run `bun run src/init-db.ts` to recreate schema
- Check PostgreSQL is accessible: `psql postgresql://postgres:dev@localhost:5432/aiwolf`
- Check Redis is accessible: `redis-cli -h localhost -p 6379 ping`

### AI not responding
- Verify DeepSeek API key is correct in `.env`
- Check server logs for LLM errors
- Ensure you have API credits

## Development Tips

1. **Hot Reload**: Both server and web support hot reload
2. **Logs**: Server logs show all game events and LLM calls
3. **Database**: Use `redis-cli` and `psql` to inspect data
4. **Testing**: Create multiple browser windows to simulate players

## Next Steps

- Implement remaining game phases (vote, night actions)
- Add wolf chat UI for werewolf players
- Implement admin panel for debugging
- Add unit tests
- Build game simulation suite

## Support

For issues or questions:
- Check server logs: `docker-compose logs -f`
- Inspect database: `psql postgresql://postgres:dev@localhost:5432/aiwolf`
- View Redis data: `redis-cli -h localhost -p 6379`

Happy hunting! 🐺

