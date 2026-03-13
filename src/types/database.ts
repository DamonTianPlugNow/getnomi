/**
 * Database Types for A2A Platform
 *
 * Core entities:
 * - User: Platform user with auth info
 * - MemoryProfile: User's personal memory file
 * - AgentProfile: AI-generated agent profile per intent
 * - Match: Matching record between two users
 * - Meeting: Scheduled meeting between matched users
 * - Feedback: Post-meeting feedback and ratings
 */

export type RelationshipIntent = 'professional' | 'dating' | 'friendship';

export type MatchStatus =
  | 'pending'        // Initial state, waiting for both to confirm
  | 'half_approved'  // One party approved
  | 'matched'        // Both approved
  | 'rejected'       // One party rejected
  | 'expired';       // Timed out

export type MeetingStatus =
  | 'scheduled'      // Meeting created
  | 'completed'      // Meeting finished
  | 'no_show'        // One or both didn't show
  | 'cancelled';     // Cancelled before meeting

export type MeetingPlatform = 'zoom' | 'feishu' | 'google_meet';

// ============================================
// Database Tables
// ============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  linkedin_id: string | null;
  google_id: string | null;
  linkedin_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryProfile {
  id: string;
  user_id: string;

  // Basic info
  display_name: string;
  headline: string | null;
  location: string | null;

  // Professional
  work_experience: WorkExperience[];
  skills: string[];

  // Resources & Goals
  can_offer: string[];
  looking_for: string[];
  current_goals: string[];

  // Personal
  interests: string[];
  values: string[];

  // Relationship intents
  intents: RelationshipIntent[];

  // Status
  is_active: boolean;
  completed_at: string | null;

  // Encrypted fields (sensitive data)
  contact_info_encrypted: string | null;

  created_at: string;
  updated_at: string;
}

export interface WorkExperience {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  is_current: boolean;
}

export interface AgentProfile {
  id: string;
  user_id: string;
  memory_profile_id: string;
  intent: RelationshipIntent;

  // AI-generated content
  summary: string;
  talking_points: string[];
  ideal_match_description: string;
  conversation_starters: string[];

  // Embedding for vector search
  embedding: number[] | null;

  // Version tracking
  version: number;

  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  intent: RelationshipIntent;

  // Participants
  user_a_id: string;
  user_b_id: string;
  agent_a_id: string;
  agent_b_id: string;

  // Status
  status: MatchStatus;
  user_a_approved: boolean | null;
  user_b_approved: boolean | null;
  user_a_approved_at: string | null;
  user_b_approved_at: string | null;

  // Match reasoning
  match_score: number;
  match_reasons: MatchReason[];

  // Expiry
  expires_at: string;

  created_at: string;
  updated_at: string;
}

export interface MatchReason {
  type: 'common_interest' | 'complementary_skill' | 'shared_goal' | 'mutual_value';
  description: string;
  weight: number;
}

export interface TimeSlot {
  id: string;
  match_id: string;
  user_id: string;

  // Available times (stored as ISO strings)
  available_times: string[];
  timezone: string;

  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  match_id: string;

  // Participants
  user_a_id: string;
  user_b_id: string;

  // Meeting details
  platform: MeetingPlatform;
  meeting_url: string;
  meeting_id_external: string | null;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;

  // Meeting brief
  brief: MeetingBrief | null;

  // Status
  status: MeetingStatus;

  created_at: string;
  updated_at: string;
}

export interface MeetingBrief {
  user_a_summary: string;
  user_b_summary: string;
  common_topics: string[];
  suggested_agenda: string[];
  ice_breakers: string[];
}

export interface Feedback {
  id: string;
  meeting_id: string;
  user_id: string;        // Who gave the feedback
  target_user_id: string; // Who the feedback is about

  // Ratings (1-5)
  overall_rating: number;
  would_meet_again: boolean;

  // Optional details
  highlights: string | null;
  improvements: string | null;

  // For reputation system
  no_show: boolean;

  created_at: string;
}

export interface UserReputation {
  id: string;
  user_id: string;

  // Metrics
  total_meetings: number;
  completed_meetings: number;
  no_show_count: number;
  average_rating: number;

  // Calculated score (0-100)
  reputation_score: number;

  updated_at: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateMemoryProfileInput {
  display_name: string;
  headline?: string;
  location?: string;
  work_experience?: WorkExperience[];
  skills?: string[];
  can_offer?: string[];
  looking_for?: string[];
  current_goals?: string[];
  interests?: string[];
  values?: string[];
  intents: RelationshipIntent[];
}

export interface UpdateMemoryProfileInput extends Partial<CreateMemoryProfileInput> {}

export interface MatchResponse {
  match: Match;
  other_user: {
    id: string;
    display_name: string;
    headline: string | null;
    avatar_url: string | null;
  };
  agent_profile: {
    summary: string;
    talking_points: string[];
  };
  match_reasons: MatchReason[];
}

export interface CreateMeetingInput {
  match_id: string;
  scheduled_at: string;
  platform: MeetingPlatform;
  timezone: string;
}

// ============================================
// Onboarding Chat Types
// ============================================

export interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

export interface OnboardingProfileData {
  display_name?: string;
  headline?: string;
  location?: string;
  work_experience?: WorkExperience[];
  skills?: string[];
  can_offer?: string[];
  looking_for?: string[];
  current_goals?: string[];
  interests?: string[];
  values?: string[];
  intents?: RelationshipIntent[];
}

export interface OnboardingChatResult {
  reply: string;
  extracted: Partial<OnboardingProfileData>;
  isComplete: boolean;
}
