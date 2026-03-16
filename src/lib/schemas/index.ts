import { z } from 'zod';

// ===============================
// Onboarding Schemas
// ===============================

// LinkedIn URL regex: supports various formats
// Examples: https://linkedin.com/in/john-doe, https://www.linkedin.com/in/john-doe/
const linkedinUrlRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w\-]{3,100}\/?$/i;

export const linkedinUrlSchema = z
  .string()
  .trim()
  .refine((url) => !url || linkedinUrlRegex.test(url), {
    message: 'Invalid LinkedIn profile URL format. Expected: https://linkedin.com/in/your-profile',
  })
  .optional();

export const timelineEventInputSchema = z.object({
  event_type: z.enum([
    'birth',
    'education_kindergarten',
    'education_elementary',
    'education_middle_school',
    'education_high_school',
    'education_university',
    'work',
    'custom',
  ]),
  start_year: z.number().int().min(1900).max(2100).optional(),
  start_month: z.number().int().min(1).max(12).optional(),
  start_day: z.number().int().min(1).max(31).optional(),
  end_year: z.number().int().min(1900).max(2100).optional(),
  end_month: z.number().int().min(1).max(12).optional(),
  is_current: z.boolean().optional(),
  province: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  title: z.string().min(1).max(200),
  institution: z.string().max(200).optional(),
  position: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  source: z.enum(['manual', 'linkedin', 'onboarding']).optional(),
});

export const onboardingCompleteSchema = z.object({
  linkedinUrl: linkedinUrlSchema,
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected: YYYY-MM-DD')
    .optional(),
  birthProvince: z.string().max(50).optional(),
  birthCity: z.string().max(50).optional(),
  timelineEvents: z.array(timelineEventInputSchema),
});

export type TimelineEventInput = z.infer<typeof timelineEventInputSchema>;
export type OnboardingCompleteInput = z.infer<typeof onboardingCompleteSchema>;

/**
 * Validates a LinkedIn URL
 */
export function isValidLinkedInUrl(url: string): boolean {
  if (!url) return false;
  return linkedinUrlRegex.test(url.trim());
}

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
  headline: z.string().max(200).optional().or(z.literal('')),
  location: z.string().max(100).optional().or(z.literal('')),
  work_experience: z.array(workExperienceSchema).optional().default([]),
  skills: z.array(z.string()).max(20).optional().default([]),
  can_offer: z.array(z.string()).max(10).optional().default([]),
  looking_for: z.array(z.string()).max(10).optional().default([]),
  current_goals: z.array(z.string()).max(5).optional().default([]),
  interests: z.array(z.string()).max(20).optional().default([]),
  values: z.array(z.string()).max(10).optional().default([]),
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
