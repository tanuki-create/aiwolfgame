# AI Werewolf Game

Comprehensive 11-player AI Werewolf game with DeepSeek-V3 integration, user participation, and 5 role expansion packs.

## Architecture

- **Monorepo**: Turborepo with Bun workspaces
- **Frontend**: Vite + React + TypeScript
- **Backend**: Bun WebSocket/REST server
- **Database**: Redis (game state) + PostgreSQL (logs/replays)
- **LLM**: DeepSeek-V3 via OpenAI-compatible API

## Project Structure

```
aiwolfgame/
├── apps/
│   ├── server/          # Bun WebSocket/REST server
│   └── web/             # Vite + React frontend
├── packages/
│   ├── shared/          # Common types, constants, utilities
│   ├── fsm/             # Game state machine (non-LLM rules)
│   ├── llm/             # DeepSeek client & AI orchestration
│   └── db/              # Redis/PostgreSQL abstractions
└── docker-compose.yml   # Redis + PostgreSQL for development
```

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Start Database Services

```bash
docker-compose up -d
```

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_MODEL=deepseek-chat
REDIS_URL=redis://localhost:6379
POSTGRES_URL=postgresql://postgres:dev@localhost:5432/aiwolf
JWT_SECRET=your_secret_here
```

### 4. Initialize Database

```bash
cd apps/server
bun run src/init-db.ts
```

### 5. Run Development Servers

```bash
# From root directory
bun dev
```

This starts:
- Server: http://localhost:4000
- Web: http://localhost:3000

## Features

### Core Game
- 11-player Werewolf game
- Base roles: Werewolf×2, Seer, Medium, Madman, Knight, Villager×5
- Deterministic seeded randomization for reproducibility
- Complete FSM with phase management and timers

### Role Expansion Packs
1. **Fox**: Third-party faction (dies if divined)
2. **Freemason**: Two villagers who know each other
3. **Hunter**: Takes one player when killed
4. **Fanatic**: Madman who appears as werewolf to seer
5. **White Wolf**: Werewolf who appears as human to seer

### AI System
- DeepSeek-V3 integration with function calling
- 3-tier skill system (Beginner/Intermediate/Advanced)
- Natural tempo control (typing delays, cooldowns)
- Automatic fallbacks for timeouts
- Wolf chat with leader protocol

### User Experience
- Real-time WebSocket updates
- Role-specific UI
- Phase countdown timers
- Vote tracking
- Night action interfaces
- Wolf-only chat (if user is wolf)

### Admin Features
- View all internal logs
- Access wolf chat transcripts
- See role assignments
- Game replay system

## Game Specification

### Victory Conditions
- **Village**: Eliminate all werewolves
- **Werewolves**: Equal or outnumber villagers
- **Fox**: Survive until either side wins

### Phase Flow
1. **Day Free Talk**: Open discussion (5 min)
2. **Day Vote**: Vote for execution (2 min)
3. **Night Wolf Chat**: Wolves coordinate (3 min, if 2+ alive)
4. **Night Actions**: Role abilities (1 min)
5. **Dawn**: Reveal results (10 sec)
6. **Check End**: Victory conditions

### Key Features
- **Random Vote Fallback**: Missing votes become random (seeded)
- **Free Discussion**: AIs speak naturally via queue system
- **Wolf Chat Logs**: Stored for admin only
- **Deterministic Replay**: Same seed = same game

## Development

### Build

```bash
bun run build
```

### Test

```bash
bun test
```

### Lint

```bash
bun run lint
```

## Package Scripts

- `bun dev` - Start all development servers
- `bun build` - Build all packages
- `bun test` - Run all tests
- `bun clean` - Clean build artifacts

## Technology Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Frontend**: React 18, Vite, React Router
- **Backend**: Bun HTTP/WebSocket
- **Database**: Redis, PostgreSQL
- **LLM**: DeepSeek-V3
- **Build**: Turborepo

## License

MIT

