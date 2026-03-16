/**
 * Base Agent Class
 *
 * Shared utilities for domain agents in the multi-agent chat system.
 * Provides logging, error handling, and data merge helpers.
 */

import type { OnboardingProfileData, DomainUpdate, WorkExperience } from '@/types';

// ============================================
// Logging
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function logAgent(
  agentName: string,
  level: LogLevel,
  action: string,
  data: Record<string, unknown> = {}
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    agent: agentName,
    level,
    action,
    ...data,
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logData));
      break;
    case 'warn':
      console.warn(JSON.stringify(logData));
      break;
    case 'debug':
      if (process.env.DEBUG_AGENTS === 'true') {
        console.log(JSON.stringify(logData));
      }
      break;
    default:
      console.log(JSON.stringify(logData));
  }
}

// ============================================
// Error Handling
// ============================================

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly agentName: string,
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export function wrapAgentError(
  err: unknown,
  agentName: string,
  operation: string
): AgentError {
  if (err instanceof AgentError) {
    return err;
  }
  const message = err instanceof Error ? err.message : String(err);
  return new AgentError(message, agentName, operation, err);
}

// ============================================
// Data Merge Helpers
// ============================================

/**
 * Merge an array field, avoiding duplicates
 */
export function mergeArrayField<T extends string>(
  existing: T[] | undefined,
  updates: T[] | undefined
): T[] {
  if (!updates || updates.length === 0) {
    return existing || [];
  }
  const existingSet = new Set(existing || []);
  for (const item of updates) {
    existingSet.add(item);
  }
  return Array.from(existingSet);
}

/**
 * Merge work experience, matching by company+title
 */
export function mergeWorkExperience(
  existing: WorkExperience[] | undefined,
  updates: WorkExperience[] | undefined
): WorkExperience[] {
  if (!updates || updates.length === 0) {
    return existing || [];
  }
  if (!existing || existing.length === 0) {
    return updates;
  }

  const result = [...existing];
  for (const update of updates) {
    const key = `${update.company.toLowerCase()}|${update.title.toLowerCase()}`;
    const existingIndex = result.findIndex(
      e => `${e.company.toLowerCase()}|${e.title.toLowerCase()}` === key
    );
    if (existingIndex >= 0) {
      // Update existing entry
      result[existingIndex] = { ...result[existingIndex], ...update };
    } else {
      // Add new entry
      result.push(update);
    }
  }
  return result;
}

/**
 * Merge domain updates into a single profile update
 */
export function mergeExtractions(updates: DomainUpdate[]): Partial<OnboardingProfileData> {
  const merged: Partial<OnboardingProfileData> = {};

  for (const update of updates) {
    const u = update.updates;

    // String fields - later updates win
    if (u.display_name) merged.display_name = u.display_name;
    if (u.headline) merged.headline = u.headline;
    if (u.location) merged.location = u.location;

    // Array fields - merge
    merged.skills = mergeArrayField(merged.skills, u.skills);
    merged.can_offer = mergeArrayField(merged.can_offer, u.can_offer);
    merged.looking_for = mergeArrayField(merged.looking_for, u.looking_for);
    merged.current_goals = mergeArrayField(merged.current_goals, u.current_goals);
    merged.interests = mergeArrayField(merged.interests, u.interests);
    merged.values = mergeArrayField(merged.values, u.values);

    // Work experience - merge by company+title
    merged.work_experience = mergeWorkExperience(merged.work_experience, u.work_experience);

    // Intents - merge
    if (u.intents) {
      merged.intents = mergeArrayField(merged.intents, u.intents);
    }
  }

  // Remove empty arrays
  const result: Partial<OnboardingProfileData> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Check if enough fields are collected for profile completion
 */
export function checkCompletion(
  currentProfile: Partial<OnboardingProfileData>,
  newUpdates: DomainUpdate[]
): boolean {
  // Merge current profile with new updates
  const merged = mergeExtractions([
    { domain: 'professional', updates: currentProfile },
    ...newUpdates,
  ]);

  // Required: display_name and intents
  const hasDisplayName = Boolean(merged.display_name);
  const hasIntents = Boolean(merged.intents && merged.intents.length > 0);

  if (!hasDisplayName || !hasIntents) {
    return false;
  }

  // Count other collected fields
  let otherFieldCount = 0;
  if (merged.headline) otherFieldCount++;
  if (merged.location) otherFieldCount++;
  if (merged.work_experience && merged.work_experience.length > 0) otherFieldCount++;
  if (merged.skills && merged.skills.length > 0) otherFieldCount++;
  if (merged.can_offer && merged.can_offer.length > 0) otherFieldCount++;
  if (merged.looking_for && merged.looking_for.length > 0) otherFieldCount++;
  if (merged.current_goals && merged.current_goals.length > 0) otherFieldCount++;
  if (merged.interests && merged.interests.length > 0) otherFieldCount++;
  if (merged.values && merged.values.length > 0) otherFieldCount++;

  // Need at least 3 other fields
  return otherFieldCount >= 3;
}

// ============================================
// Base Agent Interface
// ============================================

export interface BaseAgentConfig {
  name: string;
  domain: 'professional' | 'life';
}

export abstract class BaseAgent {
  protected readonly name: string;
  protected readonly domain: 'professional' | 'life';

  constructor(config: BaseAgentConfig) {
    this.name = config.name;
    this.domain = config.domain;
  }

  protected log(level: LogLevel, action: string, data: Record<string, unknown> = {}): void {
    logAgent(this.name, level, action, data);
  }

  protected handleError(err: unknown, operation: string): AgentError {
    const agentError = wrapAgentError(err, this.name, operation);
    this.log('error', operation, {
      error: agentError.message,
      cause: agentError.cause,
    });
    return agentError;
  }

  abstract process(extraction: unknown): Promise<DomainUpdate>;
}
