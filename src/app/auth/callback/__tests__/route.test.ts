import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock cookies
const mockCookieStore = {
  getAll: vi.fn(() => []),
  get: vi.fn(() => null),
  set: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock Supabase SSR
const mockExchangeCodeForSession = vi.fn();
const mockUpsert = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession },
    from: vi.fn(() => ({
      upsert: mockUpsert,
    })),
  })),
}));

import { GET } from '../route';

function createMockRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/auth/callback');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
  });

  it('redirects to /dashboard on successful OAuth', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: { provider: 'google' },
          user_metadata: { name: 'Test User', sub: 'google-sub-123' },
        },
      },
      error: null,
    });

    const request = createMockRequest({ code: 'valid-code' });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
  });

  it('redirects to /onboarding when redirect param is /onboarding', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
        },
      },
      error: null,
    });

    const request = createMockRequest({ code: 'valid-code', redirect: '/onboarding' });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/onboarding');
  });

  it('rejects external redirect URLs (open redirect protection)', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
        },
      },
      error: null,
    });

    const request = createMockRequest({ code: 'valid-code', redirect: 'https://evil.com' });
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/dashboard');
    expect(location).not.toContain('evil.com');
  });

  it('rejects protocol-relative URLs (//evil.com)', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
        },
      },
      error: null,
    });

    const request = createMockRequest({ code: 'valid-code', redirect: '//evil.com' });
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/dashboard');
    expect(location).not.toContain('evil.com');
  });

  it('redirects to /login?error when no code provided', async () => {
    const request = createMockRequest({});
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
    expect(response.headers.get('location')).toContain('error=auth_failed');
  });

  it('redirects to /login?error when invalid code', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid code'),
    });

    const request = createMockRequest({ code: 'invalid-code' });
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
    expect(response.headers.get('location')).toContain('error=auth_failed');
  });

  it('saves LinkedIn OAuth data to users table', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: { provider: 'linkedin_oidc' },
          user_metadata: {
            name: 'Test User',
            given_name: 'Test',
            family_name: 'User',
            email: 'test@example.com',
            picture: 'https://example.com/pic.jpg',
            locale: 'en',
            sub: 'linkedin-sub-123',
          },
        },
      },
      error: null,
    });

    const request = createMockRequest({ code: 'valid-code' });
    await GET(request);

    expect(mockUpsert).toHaveBeenCalled();
  });
});
