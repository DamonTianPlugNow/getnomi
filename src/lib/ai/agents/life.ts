/**
 * Life Domain Agent
 *
 * Manages personal/life-related profile information:
 * - interests
 * - values
 * - personal looking_for (friendship, dating)
 * - personal goals
 * - dating/friendship context
 */

import {
  BaseAgent,
  BaseAgentConfig,
  mergeArrayField,
} from './base';
import type {
  LifeExtraction,
  DomainUpdate,
  OnboardingProfileData,
  RelationshipIntent,
  DatingContext,
  FriendshipContext,
} from '@/types';

export class LifeAgent extends BaseAgent {
  constructor() {
    const config: BaseAgentConfig = {
      name: 'life-agent',
      domain: 'life',
    };
    super(config);
  }

  /**
   * Process life extraction and return profile updates
   */
  async process(extraction: LifeExtraction): Promise<DomainUpdate> {
    this.log('debug', 'process_start', {
      hasInterests: Boolean(extraction.interests?.length),
      hasValues: Boolean(extraction.values?.length),
      hasDatingContext: Boolean(extraction.dating_context),
      hasFriendshipContext: Boolean(extraction.friendship_context),
    });

    try {
      const updates: Partial<OnboardingProfileData> = {};

      // Process interests
      if (extraction.interests && extraction.interests.length > 0) {
        updates.interests = extraction.interests;
      }

      // Process values
      if (extraction.values && extraction.values.length > 0) {
        updates.values = extraction.values;
      }

      // Process personal looking_for
      if (extraction.looking_for && extraction.looking_for.length > 0) {
        updates.looking_for = extraction.looking_for;
      }

      // Process personal goals
      if (extraction.current_goals && extraction.current_goals.length > 0) {
        updates.current_goals = extraction.current_goals;
      }

      // Note: dating_context and friendship_context are not stored in the main profile
      // They are processed for intent inference but stored separately if needed

      this.log('info', 'process_complete', {
        updatedFields: Object.keys(updates),
        hasDatingContext: Boolean(extraction.dating_context),
        hasFriendshipContext: Boolean(extraction.friendship_context),
      });

      return {
        domain: 'life',
        updates,
      };
    } catch (err) {
      throw this.handleError(err, 'process');
    }
  }

  /**
   * Merge new extraction with existing profile
   */
  mergeWithProfile(
    existing: Partial<OnboardingProfileData>,
    extraction: LifeExtraction
  ): Partial<OnboardingProfileData> {
    const result: Partial<OnboardingProfileData> = { ...existing };

    // Interests - merge arrays
    result.interests = mergeArrayField(existing.interests, extraction.interests);

    // Values - merge arrays
    result.values = mergeArrayField(existing.values, extraction.values);

    // Looking for - merge personal needs
    if (extraction.looking_for && extraction.looking_for.length > 0) {
      const personalLookingFor = extraction.looking_for.filter(
        item => this.isPersonalLookingFor(item)
      );
      result.looking_for = mergeArrayField(
        existing.looking_for,
        personalLookingFor
      );
    }

    // Current goals - merge personal goals
    if (extraction.current_goals && extraction.current_goals.length > 0) {
      result.current_goals = mergeArrayField(
        existing.current_goals,
        extraction.current_goals
      );
    }

    return result;
  }

  /**
   * Check if a looking_for item is personal (vs professional)
   */
  private isPersonalLookingFor(item: string): boolean {
    const personalKeywords = [
      '朋友', '伴侣', '对象', '约会', '恋爱', '结婚', '交友',
      '志同道合', '兴趣', '爱好', '玩伴', '旅伴', '健身',
      'friend', 'partner', 'date', 'relationship', 'companion',
      '聊天', '社交', '认识', '交流'
    ];

    const lowerItem = item.toLowerCase();
    return personalKeywords.some(keyword =>
      lowerItem.includes(keyword.toLowerCase())
    );
  }

  /**
   * Infer intents from life data
   */
  inferIntents(extraction: LifeExtraction): RelationshipIntent[] {
    const intents: RelationshipIntent[] = [];

    // Check for dating intent
    if (this.hasDatingIntent(extraction)) {
      intents.push('dating');
    }

    // Check for friendship intent
    if (this.hasFriendshipIntent(extraction)) {
      intents.push('friendship');
    }

    return intents;
  }

  /**
   * Check if extraction suggests dating intent
   */
  private hasDatingIntent(extraction: LifeExtraction): boolean {
    // Explicit dating context
    if (extraction.dating_context) {
      return true;
    }

    // Dating keywords in looking_for
    const datingKeywords = [
      '伴侣', '对象', '约会', '恋爱', '结婚', '另一半',
      'partner', 'date', 'relationship', 'romance'
    ];

    if (extraction.looking_for?.some(item =>
      datingKeywords.some(keyword =>
        item.toLowerCase().includes(keyword.toLowerCase())
      )
    )) {
      return true;
    }

    return false;
  }

  /**
   * Check if extraction suggests friendship intent
   */
  private hasFriendshipIntent(extraction: LifeExtraction): boolean {
    // Explicit friendship context
    if (extraction.friendship_context) {
      return true;
    }

    // Friendship keywords in looking_for
    const friendshipKeywords = [
      '朋友', '交友', '志同道合', '玩伴', '旅伴',
      'friend', 'buddy', 'companion'
    ];

    if (extraction.looking_for?.some(item =>
      friendshipKeywords.some(keyword =>
        item.toLowerCase().includes(keyword.toLowerCase())
      )
    )) {
      return true;
    }

    // Has interests suggests potential friendship intent
    if (extraction.interests && extraction.interests.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Extract dating context details
   */
  getDatingContext(extraction: LifeExtraction): DatingContext | null {
    if (!extraction.dating_context) {
      return null;
    }

    return {
      relationship_status: extraction.dating_context.relationship_status,
      looking_for_type: extraction.dating_context.looking_for_type,
      preferences: extraction.dating_context.preferences || [],
      deal_breakers: extraction.dating_context.deal_breakers || [],
    };
  }

  /**
   * Extract friendship context details
   */
  getFriendshipContext(extraction: LifeExtraction): FriendshipContext | null {
    if (!extraction.friendship_context) {
      return null;
    }

    return {
      social_style: extraction.friendship_context.social_style,
      availability: extraction.friendship_context.availability,
      activity_preferences: extraction.friendship_context.activity_preferences || [],
    };
  }
}

// Singleton instance
export const lifeAgent = new LifeAgent();
