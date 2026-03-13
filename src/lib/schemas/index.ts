import { z } from 'zod';

// ===============================
// Profile Schemas
// ===============================

export const workExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  start_date: z.string(),
  end_date: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  is_current: z.boolean().default(false),
});

export const createProfileSchema = z.object({
  display_name: z.string().min(1).max(100),
  headline: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  work_experience: z.array(workExperienceSchema).optional(),
  skills: z.array(z.string()).max(20).optional(),
  can_offer: z.array(z.string()).max(10).optional(),
  looking_for: z.array(z.string()).max(10).optional(),
  current_goals: z.array(z.string()).max(5).optional(),
  interests: z.array(z.string()).max(20).optional(),
  values: z.array(z.string()).max(10).optional(),
  intents: z.array(z.enum(['professional', 'dating', 'friendship'])).min(1),
});

export const updateProfileSchema = createProfileSchema.partial();

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type WorkExperience = z.infer<typeof workExperienceSchema>;

// ===============================
// Match Schemas
// ===============================

export const matchActionSchema = z.object({
  match_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
});

export type MatchActionInput = z.infer<typeof matchActionSchema>;

// ===============================
// Meeting Schemas
// ===============================

export const timeSlotSchema = z.object({
  match_id: z.string().uuid(),
  available_times: z.array(z.string().datetime()).min(1).max(20),
  timezone: z.string().default('UTC'),
});

export const feedbackSchema = z.object({
  meeting_id: z.string().uuid(),
  action: z.literal('feedback'),
  feedback: z.object({
    did_meet: z.boolean(),
    rating: z.number().int().min(1).max(5).nullable(),
    would_meet_again: z.boolean().nullable(),
    highlights: z.array(z.string()).default([]),
    notes: z.string().max(1000).nullable(),
  }),
});

export type TimeSlotInput = z.infer<typeof timeSlotSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;

// ===============================
// Common Schemas
// ===============================

export const intentSchema = z.enum(['professional', 'dating', 'friendship']);
export type RelationshipIntentInput = z.infer<typeof intentSchema>;

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
