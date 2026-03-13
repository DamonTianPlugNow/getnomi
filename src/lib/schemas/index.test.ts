import { describe, it, expect } from 'vitest';
import {
  createProfileSchema,
  updateProfileSchema,
  matchActionSchema,
  timeSlotSchema,
  feedbackSchema,
} from './index';

describe('Profile Schemas', () => {
  describe('createProfileSchema', () => {
    it('validates a complete profile', () => {
      const input = {
        display_name: 'John Doe',
        headline: 'Software Engineer',
        location: 'San Francisco',
        skills: ['TypeScript', 'React'],
        intents: ['professional'],
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('requires display_name', () => {
      const input = {
        intents: ['professional'],
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('requires at least one intent', () => {
      const input = {
        display_name: 'John Doe',
        intents: [],
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates intent values', () => {
      const valid = createProfileSchema.safeParse({
        display_name: 'John',
        intents: ['professional', 'friendship'],
      });
      expect(valid.success).toBe(true);

      const invalid = createProfileSchema.safeParse({
        display_name: 'John',
        intents: ['invalid_intent'],
      });
      expect(invalid.success).toBe(false);
    });

    it('enforces max lengths', () => {
      const input = {
        display_name: 'a'.repeat(101), // max 100
        intents: ['professional'],
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('allows partial updates', () => {
      const input = {
        headline: 'Updated headline',
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows empty object', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

describe('Match Schema', () => {
  describe('matchActionSchema', () => {
    it('validates approve action', () => {
      const input = {
        match_id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'approve',
      };

      const result = matchActionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates reject action', () => {
      const input = {
        match_id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'reject',
      };

      const result = matchActionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('requires valid UUID', () => {
      const input = {
        match_id: 'not-a-uuid',
        action: 'approve',
      };

      const result = matchActionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects invalid actions', () => {
      const input = {
        match_id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'maybe',
      };

      const result = matchActionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('Meeting Schemas', () => {
  describe('timeSlotSchema', () => {
    it('validates time slots', () => {
      const input = {
        match_id: '550e8400-e29b-41d4-a716-446655440000',
        available_times: ['2025-01-15T10:00:00Z', '2025-01-15T14:00:00Z'],
        timezone: 'America/New_York',
      };

      const result = timeSlotSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('requires at least one time slot', () => {
      const input = {
        match_id: '550e8400-e29b-41d4-a716-446655440000',
        available_times: [],
      };

      const result = timeSlotSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('defaults timezone to UTC', () => {
      const input = {
        match_id: '550e8400-e29b-41d4-a716-446655440000',
        available_times: ['2025-01-15T10:00:00Z'],
      };

      const result = timeSlotSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timezone).toBe('UTC');
      }
    });
  });

  describe('feedbackSchema', () => {
    it('validates complete feedback', () => {
      const input = {
        meeting_id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'feedback',
        feedback: {
          did_meet: true,
          rating: 5,
          would_meet_again: true,
          highlights: ['Great conversation', 'Helpful advice'],
          notes: 'Would love to connect again!',
        },
      };

      const result = feedbackSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates no-show feedback', () => {
      const input = {
        meeting_id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'feedback',
        feedback: {
          did_meet: false,
          rating: null,
          would_meet_again: null,
          highlights: [],
          notes: null,
        },
      };

      const result = feedbackSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('enforces rating range 1-5', () => {
      const tooLow = feedbackSchema.safeParse({
        meeting_id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'feedback',
        feedback: { did_meet: true, rating: 0, would_meet_again: true, notes: null },
      });
      expect(tooLow.success).toBe(false);

      const tooHigh = feedbackSchema.safeParse({
        meeting_id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'feedback',
        feedback: { did_meet: true, rating: 6, would_meet_again: true, notes: null },
      });
      expect(tooHigh.success).toBe(false);
    });
  });
});
