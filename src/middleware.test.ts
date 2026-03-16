import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next-intl middleware
vi.mock('next-intl/middleware', () => ({
  default: vi.fn(() => vi.fn(() => new Response())),
}));

// Mock i18n routing
vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'zh', 'ja', 'ko'], defaultLocale: 'en' },
}));

// Mock Supabase SSR
const mockGetUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

import { middleware } from './middleware';

function createMockRequest(pathname: string): NextRequest {
  const url = new URL(pathname, 'http://localhost:3000');
  return new NextRequest(url);
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it('skips auth check for /api/ routes', async () => {
    const request = createMockRequest('/api/profile');
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('skips auth check for /auth/ routes', async () => {
    const request = createMockRequest('/auth/callback');
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('redirects to /login when accessing protected route without session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = createMockRequest('/en/dashboard');
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/en/login');
  });

  it('allows access to protected route with valid session', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    });

    const request = createMockRequest('/en/dashboard');
    const response = await middleware(request);

    // Should not redirect to login (either no redirect, or redirect elsewhere)
    const location = response.headers.get('location');
    if (location) {
      expect(location).not.toContain('/login');
    }
  });

  it('redirects logged-in users away from /login to /dashboard', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
    });

    const request = createMockRequest('/en/login');
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/en/dashboard');
  });

  it('allows unauthenticated users to access /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = createMockRequest('/en/login');
    const response = await middleware(request);

    // Should not redirect to dashboard (either no redirect, or redirect elsewhere)
    const location = response.headers.get('location');
    if (location) {
      expect(location).not.toContain('/dashboard');
    }
  });
});
