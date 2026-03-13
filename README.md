# Nomi - Your Personal Memory Assistant

Create your AI-powered personal context that works everywhere. Your story, always with you.

**Website**: [getnomi.me](https://getnomi.me)

## What is Nomi?

Nomi helps you create and maintain a portable personal context (your own .md file) through AI conversation. This digital manual can be used across any AI agent product - it's your portable digital identity.

### Core Features

- **AI-Powered Memory**: Chat with AI to build and update your personal profile
- **Portable .md Export**: Download your profile as a Markdown file to use anywhere
- **Smart Matching**: Optionally connect with like-minded people based on your profile
- **Multiple Relationship Types**: Professional networking, Dating, Friendship

### How It Works

1. **Chat with AI** → Nomi learns about you through natural conversation
2. **Your .md File** → Export your portable personal context anytime
3. **Match (Optional)** → Connect with others who share your goals and values

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
- Zoom API (Meetings)
- Vercel (Deployment)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login, Signup
│   ├── (dashboard)/       # Dashboard, Profile, Matches, Meetings
│   └── api/               # API Routes
├── lib/                   # Shared utilities
│   ├── ai/               # Claude & OpenAI integration
│   ├── supabase/         # Database client
│   └── email/            # Email service
├── inngest/              # Background jobs
└── types/                # TypeScript types
```

See [CLAUDE.md](./CLAUDE.md) for detailed development documentation.

## License

MIT
