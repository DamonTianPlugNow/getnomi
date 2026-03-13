import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase server module
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { requireAuth } from './requireAuth';
import { createClient } from '@/lib/supabase/server';

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user and supabase client on successful auth', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await requireAuth();

    expect(result.error).toBeNull();
    expect(result.user).toEqual(mockUser);
    expect(result.supabase).toBe(mockSupabase);
  });

  it('returns 401 error when user is not authenticated', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await requireAuth();

    expect(result.error).not.toBeNull();
    expect(result.user).toBeNull();
    expect(result.supabase).toBeNull();
  });

  it('returns 401 error when auth returns an error', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Auth error'),
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

    const result = await requireAuth();

    expect(result.error).not.toBeNull();
    expect(result.user).toBeNull();
    expect(result.supabase).toBeNull();
  });

  it('returns 500 error when createClient throws', async () => {
    vi.mocked(createClient).mockRejectedValue(new Error('Connection failed'));

    const result = await requireAuth();

    expect(result.error).not.toBeNull();
    expect(result.user).toBeNull();
    expect(result.supabase).toBeNull();
  });
});
