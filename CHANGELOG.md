# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1.0] - 2026-03-13

### Added
- Email/password authentication as fallback for OAuth (login & signup pages)
- `requireAuth` utility for DRY authentication in API routes
- Centralized Zod validation schemas in `src/lib/schemas`
- LLM timeout wrapper (30s) and robust JSON extraction from markdown
- Graceful degradation for Zoom API (mock meetings when unconfigured)
- Graceful degradation for Resend email (console logging when unconfigured)
- Core test suite: 33 tests for schemas, auth utility, and Claude utilities
- Vitest configuration
- Technical debt items TD-4 to TD-6 in TODOS.md

### Changed
- Split `profile/created` event into separate `matching/trigger` event to prevent infinite loops
- Refactored all API routes to use `requireAuth` utility
- Moved inline Zod schemas to centralized location
- Exported `extractJSON` and `withTimeout` from Claude utilities for testing

### Fixed
- Potential infinite event loop in profile creation flow
- LLM calls now have timeout protection and fallback defaults

## [0.1.0.0] - 2026-03-12

### Added
- Initial MVP release
- User authentication with LinkedIn and Google OAuth
- Memory profile creation and management
- AI-powered agent profile generation
- Vector-based matching with pgvector
- Claude-powered match ranking
- Meeting scheduling with Zoom integration
- Email notifications with Resend
- Inngest background jobs for async processing
