# Nomi - Development Guide

## Project Overview

Nomi (Know me) is a platform that helps users create and maintain their digital world manual - a portable personal context powered by AI conversation. Users can export their profile as a .md file and optionally match with like-minded people.

## Tech Stack

- **Frontend/Backend**: Next.js 14 + TypeScript + App Router
- **Database**: Supabase (PostgreSQL + pgvector + Auth + Realtime)
- **Background Jobs**: Inngest
- **LLM**: Claude (Anthropic)
- **Embeddings**: OpenAI text-embedding-3-small
- **Video Meetings**: Zoom API
- **Email**: Resend
- **Deployment**: Vercel

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth pages (login, signup)
│   ├── (dashboard)/        # Main app pages
│   │   ├── dashboard/      # Home dashboard
│   │   ├── profile/        # Profile view & chat
│   │   ├── onboarding/     # AI onboarding chat
│   │   ├── matches/        # Match list & details
│   │   └── meetings/       # Meeting list & feedback
│   ├── api/                # API Routes
│   └── auth/               # Auth callbacks
├── lib/                    # Core libraries
│   ├── supabase/           # Supabase clients
│   ├── ai/                 # Claude/OpenAI
│   ├── zoom/               # Zoom API
��   └── email/              # Resend
├── inngest/                # Background tasks
│   ├── client.ts
│   └── functions/
└── types/                  # TypeScript types

supabase/
├── migrations/             # Database migrations
└── seed.sql                # Test data
```

## Key Files

- `src/types/database.ts` - All TypeScript types
- `src/lib/ai/claude.ts` - Claude integration for profile generation and matching
- `src/lib/ai/embedding.ts` - OpenAI embeddings
- `src/inngest/functions/` - Background job definitions
- `supabase/migrations/` - Database schema
- `src/app/api/profile/export/route.ts` - .md export endpoint

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Start Inngest dev server (separate terminal)
npx inngest-cli@latest dev

# Run tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint

# Build
pnpm build
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `ANTHROPIC_API_KEY` - Claude API key
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_BASE_URL` - OpenAI base URL (default: https://aihubmix.com/v1)
- `ZOOM_*` - Zoom Server-to-Server OAuth credentials
- `RESEND_API_KEY` - Resend API key
- `NEXTAUTH_SECRET` - Random secret for NextAuth

## Database Setup

1. Create a Supabase project at https://supabase.com
2. Enable the `vector` extension in SQL Editor
3. Run migrations in order from `supabase/migrations/`
4. Configure OAuth providers (LinkedIn, Google) in Supabase Auth

## Core Flows

### Onboarding (AI Chat)
1. User signs up via OAuth
2. AI chat collects profile information naturally
3. `profile/created` event triggers `generateAgentProfiles`
4. Agent profiles generated with embeddings
5. Profile marked as active

### Profile Update
1. User clicks "Update with AI" on profile page
2. `/profile/chat` - AI conversation to update info
3. Changes saved, agents regenerated if needed

### Export .md
1. User clicks "Export .md" on profile page
2. `GET /api/profile/export` generates Markdown
3. File downloaded as `{display_name}.md`

### Matching (Optional)
1. User enables matching toggle on profile
2. `profile/created` or daily cron triggers `findMatches`
3. Vector search finds candidates (pgvector)
4. Claude ranks candidates
5. Matches created with 48h expiry
6. Users notified via Realtime + email

### Meeting
1. Both users approve match
2. `match/confirmed` triggers `createMeeting`
3. Users select time slots
4. Zoom meeting created
5. Meeting brief generated
6. Notification emails sent

## API Routes

- `GET /api/profile` - Get current user's profile
- `POST /api/profile` - Create profile
- `PUT /api/profile` - Update profile (or just toggle `is_active`)
- `GET /api/profile/export` - Export profile as .md
- `POST /api/chat/onboarding` - AI chat for profile creation/update
- `GET /api/match` - List matches
- `POST /api/match` - Approve/reject match
- `GET /api/meeting` - List meetings
- `POST /api/meeting` - Submit time slots
- `PUT /api/meeting` - Submit feedback

## Inngest Functions

- `generate-agent-profiles` - Creates agent profiles from memory
- `find-matches` - Runs matching algorithm
- `daily-matching` - Cron job for daily matching
- `check-match-expiry` - Expires old matches
- `create-meeting` - Creates Zoom meeting
- `send-meeting-reminder` - 5 min reminder

## Security Notes

- All user data protected by Supabase RLS
- User input isolated in LLM prompts (`<user_input>` tags)
- LLM output validated against expected schema
- Sensitive fields (contact info) encrypted at rest
- OAuth tokens stored in httpOnly cookies

## Testing Strategy

- Unit tests: Vitest for services and utilities
- Integration tests: API routes with Supabase local
- E2E tests: Playwright for critical user flows
- External services mocked in unit/integration tests
