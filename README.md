# Get Nomi, your personal memory assistant

Agent-to-Agent relationship matching platform. Create your memory profile, let AI generate your agent, and connect with people who truly match your goals and values.

## Features

- **AI-Powered Matching**: Claude generates agent profiles and ranks matches
- **Multiple Relationship Types**: Professional, Dating, Friendship
- **Automatic Meetings**: Zoom integration with personalized meeting briefs
- **Real-time Notifications**: Supabase Realtime + email
- **Reputation System**: Track meeting completion and feedback

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Fill in your API keys

# Start development server
pnpm dev

# In another terminal, start Inngest dev server
pnpm inngest:dev
```

## Tech Stack

- Next.js 14 + TypeScript
- Supabase (PostgreSQL + pgvector + Auth)
- Inngest (Background Jobs)
- Claude (AI) + OpenAI (Embeddings)
- Zoom API
- Vercel (Deployment)

See [CLAUDE.md](./CLAUDE.md) for detailed development documentation.

## License

MIT
