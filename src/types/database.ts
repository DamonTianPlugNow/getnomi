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

// ============================================
// Timeline Event Types
// ============================================

export type TimelineEventType =
  | 'birth'
  | 'education_kindergarten'
  | 'education_elementary'
  | 'education_middle_school'
  | 'education_high_school'
  | 'education_university'
  | 'work'
  | 'custom';

export type TimelineEventSource = 'manual' | 'linkedin' | 'onboarding';

export interface TimelineEvent {
  id: string;
  user_id: string;

  // Event type and timing
  event_type: TimelineEventType;
  start_year: number | null;
  start_month: number | null;
  start_day: number | null;
  end_year: number | null;
  end_month: number | null;
  is_current: boolean;

  // Location
  province: string | null;
  city: string | null;

  // Event details
  title: string;
  institution: string | null;
  position: string | null;
  description: string | null;

  // Data source
  source: TimelineEventSource;

  created_at: string;
  updated_at: string;
}

export interface CreateTimelineEventInput {
  event_type: TimelineEventType;
  start_year?: number;
  start_month?: number;
  start_day?: number;
  end_year?: number;
  end_month?: number;
  is_current?: boolean;
  province?: string;
  city?: string;
  title: string;
  institution?: string;
  position?: string;
  description?: string;
  source?: TimelineEventSource;
}

export interface UpdateTimelineEventInput extends Partial<CreateTimelineEventInput> {}

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

  // Birth info (timeline)
  linkedin_url: string | null;
  birth_date: string | null;
  birth_province: string | null;
  birth_city: string | null;

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
  onboarding_completed_at: string | null;

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

// ============================================
// Multi-Agent Chat Types
// ============================================

export type ClassificationDomain = 'professional' | 'life' | 'mixed' | 'ambiguous';

export interface DatingContext {
  relationship_status?: string;
  looking_for_type?: string;
  preferences?: string[];
  deal_breakers?: string[];
}

export interface FriendshipContext {
  social_style?: string;
  availability?: string;
  activity_preferences?: string[];
}

export interface ProfessionalExtraction {
  work_experience?: WorkExperience[];
  skills?: string[];
  can_offer?: string[];
  looking_for?: string[];
  current_goals?: string[];
  headline?: string;
}

export interface LifeExtraction {
  interests?: string[];
  values?: string[];
  looking_for?: string[];
  current_goals?: string[];
  dating_context?: DatingContext;
  friendship_context?: FriendshipContext;
}

export interface CrossDomainItem {
  item: string;
  primary_domain: 'professional' | 'life';
  secondary_domain: 'professional' | 'life';
  reason: string;
}

export interface ClassificationResult {
  domain: ClassificationDomain;
  confidence: number;
  professional: ProfessionalExtraction;
  life: LifeExtraction;
  cross_domain: CrossDomainItem[];
}

export interface DomainUpdate {
  domain: 'professional' | 'life';
  updates: Partial<OnboardingProfileData>;
}

export interface MultiAgentChatResult {
  reply: string;
  extracted: Partial<OnboardingProfileData>;
  isComplete: boolean;
  classification?: ClassificationResult;
}

// ============================================
// Emotional Intelligence Types
// ============================================

export type EmotionalState =
  | 'excited'      // 兴奋（分享成就）
  | 'uncertain'    // 不确定（职业迷茫）
  | 'nostalgic'    // 怀旧（回忆过去）
  | 'frustrated'   // 沮丧（遇到困难）
  | 'reflective'   // 反思（深度思考）
  | 'neutral';     // 中性

export interface EmotionalContext {
  current_state: EmotionalState;
  emotional_cues: string[];
  emotional_shift: 'improving' | 'declining' | 'stable';
  requires_support: boolean;
}

// ============================================
// Conversation Memory Types
// ============================================

export interface KeyFact {
  content: string;
  turnIndex: number;
  category: 'personal' | 'professional' | 'preference' | 'goal' | 'relationship';
  type?: string;
  timestamp: number;
}

export interface InferredPreferences {
  verbosity: 'brief' | 'detailed';
  formality: 'casual' | 'formal';
  openness: 'reserved' | 'open';
  pace: 'fast' | 'thoughtful';
}

export interface ConversationMemory {
  keyFacts: KeyFact[];
  topicTrail: string[];
  inferredPreferences: InferredPreferences;
}

// ============================================
// Conversation Flow Types
// ============================================

export type ConversationPhase =
  | 'greeting'      // 开场（1-2轮）
  | 'exploration'   // 探索（主要阶段）
  | 'deepening'     // 深化（发现兴趣点）
  | 'wrapping';     // 收尾（确认完成）

export interface PhaseTransition {
  from: ConversationPhase;
  to: ConversationPhase;
  reason: string;
}

// ============================================
// User Style Types
// ============================================

export interface UserStyle {
  verbosity: 'brief' | 'moderate' | 'detailed';
  formality: 'casual' | 'neutral' | 'formal';
  openness: 'reserved' | 'moderate' | 'open';
  pace: 'fast' | 'thoughtful';
  emoji_usage: 'none' | 'occasional' | 'frequent';
  question_style: 'direct' | 'indirect';
}

export interface StyleAdaptation {
  responseLength: 'short' | 'moderate' | 'detailed';
  toneAdjustment: Array<'slightly_formal' | 'relaxed' | 'playful'>;
  questionApproach: 'gentle' | 'balanced' | 'exploratory';
  promptHints: string[];
}

// ============================================
// Enhanced Classification Types
// ============================================

export interface EnhancedClassificationResult extends ClassificationResult {
  emotional_state: EmotionalState;
  emotional_cues: string[];
  user_style?: UserStyle;
}
