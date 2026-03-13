import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { handleOnboardingChat } from '@/lib/ai/claude';
import type { ChatMessage, OnboardingProfileData } from '@/types';

// Input limits
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 2000;

/**
 * POST /api/chat/onboarding - AI conversational onboarding
 */
export async function POST(request: NextRequest) {
  // Feature flag check
  if (process.env.ENABLE_AI_ONBOARDING === 'false') {
    return NextResponse.json(
      { error: 'AI onboarding is currently disabled' },
      { status: 503 }
    );
  }

  const { user, error } = await requireAuth();
  if (error) return error;

  // Parse JSON with error handling (Issue 8)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { messages, profileData, sessionId } = body as {
    messages: ChatMessage[];
    profileData: Partial<OnboardingProfileData>;
    sessionId?: string;
  };

  // Validate messages array
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json(
      { error: 'messages array is required' },
      { status: 400 }
    );
  }

  // Input limits (Issue 9)
  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: `Too many messages. Maximum is ${MAX_MESSAGES}` },
      { status: 400 }
    );
  }

  // Validate each message
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg.content !== 'string') {
      return NextResponse.json(
        { error: `Invalid message at index ${i}` },
        { status: 400 }
      );
    }
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return NextResponse.json(
        { error: `Invalid role at index ${i}. Must be 'user' or 'assistant'` },
        { status: 400 }
      );
    }
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message at index ${i} exceeds maximum length of ${MAX_MESSAGE_LENGTH}` },
        { status: 400 }
      );
    }
  }

  try {
    const result = await handleOnboardingChat(
      messages,
      profileData || {},
      sessionId || user.id
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error('Onboarding chat error:', err);
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
