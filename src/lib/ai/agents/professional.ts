/**
 * Professional Domain Agent
 *
 * Manages work-related profile information:
 * - work_experience
 * - skills
 * - professional can_offer/looking_for
 * - career goals
 * - headline
 */

import {
  BaseAgent,
  BaseAgentConfig,
  mergeWorkExperience,
  mergeArrayField,
} from './base';
import type {
  ProfessionalExtraction,
  DomainUpdate,
  OnboardingProfileData,
  RelationshipIntent,
} from '@/types';

export class ProfessionalAgent extends BaseAgent {
  constructor() {
    const config: BaseAgentConfig = {
      name: 'professional-agent',
      domain: 'professional',
    };
    super(config);
  }

  /**
   * Process professional extraction and return profile updates
   */
  async process(extraction: ProfessionalExtraction): Promise<DomainUpdate> {
    this.log('debug', 'process_start', {
      hasWorkExperience: Boolean(extraction.work_experience?.length),
      hasSkills: Boolean(extraction.skills?.length),
      hasHeadline: Boolean(extraction.headline),
    });

    try {
      const updates: Partial<OnboardingProfileData> = {};

      // Process headline
      if (extraction.headline) {
        updates.headline = extraction.headline;
      }

      // Process work experience
      if (extraction.work_experience && extraction.work_experience.length > 0) {
        updates.work_experience = extraction.work_experience.map(exp => ({
          company: exp.company,
          title: exp.title,
          start_date: exp.start_date,
          end_date: exp.end_date,
          description: exp.description,
          is_current: exp.is_current,
        }));
      }

      // Process skills
      if (extraction.skills && extraction.skills.length > 0) {
        updates.skills = extraction.skills;
      }

      // Process professional can_offer
      if (extraction.can_offer && extraction.can_offer.length > 0) {
        updates.can_offer = extraction.can_offer;
      }

      // Process professional looking_for
      if (extraction.looking_for && extraction.looking_for.length > 0) {
        updates.looking_for = extraction.looking_for;
      }

      // Process professional goals
      if (extraction.current_goals && extraction.current_goals.length > 0) {
        updates.current_goals = extraction.current_goals;
      }

      this.log('info', 'process_complete', {
        updatedFields: Object.keys(updates),
      });

      return {
        domain: 'professional',
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
    extraction: ProfessionalExtraction
  ): Partial<OnboardingProfileData> {
    const result: Partial<OnboardingProfileData> = { ...existing };

    // Headline - new value wins
    if (extraction.headline) {
      result.headline = extraction.headline;
    }

    // Work experience - merge by company+title
    result.work_experience = mergeWorkExperience(
      existing.work_experience,
      extraction.work_experience
    );

    // Skills - merge arrays
    result.skills = mergeArrayField(existing.skills, extraction.skills);

    // Can offer - merge arrays
    result.can_offer = mergeArrayField(existing.can_offer, extraction.can_offer);

    // Looking for - merge professional needs
    if (extraction.looking_for && extraction.looking_for.length > 0) {
      const professionalLookingFor = extraction.looking_for.filter(
        item => this.isProfessionalLookingFor(item)
      );
      result.looking_for = mergeArrayField(
        existing.looking_for,
        professionalLookingFor
      );
    }

    // Current goals - merge professional goals
    if (extraction.current_goals && extraction.current_goals.length > 0) {
      result.current_goals = mergeArrayField(
        existing.current_goals,
        extraction.current_goals
      );
    }

    return result;
  }

  /**
   * Check if a looking_for item is professional (vs personal)
   */
  private isProfessionalLookingFor(item: string): boolean {
    const professionalKeywords = [
      '合伙人', '投资人', '技术', '工程师', '设计师', '产品',
      '营销', '销售', '运营', '人才', '员工', '顾问', '导师',
      'cofounder', 'investor', 'engineer', 'developer', 'designer',
      '资金', '融资', '合作', '项目', '机会', '工作'
    ];

    const lowerItem = item.toLowerCase();
    return professionalKeywords.some(keyword =>
      lowerItem.includes(keyword.toLowerCase())
    );
  }

  /**
   * Infer intents from professional data
   */
  inferIntents(extraction: ProfessionalExtraction): RelationshipIntent[] {
    const intents: RelationshipIntent[] = [];

    // If there's professional data, likely interested in professional networking
    const hasProfessionalData = Boolean(
      extraction.work_experience?.length ||
      extraction.skills?.length ||
      extraction.can_offer?.length ||
      (extraction.looking_for?.length && extraction.looking_for.some(
        item => this.isProfessionalLookingFor(item)
      ))
    );

    if (hasProfessionalData) {
      intents.push('professional');
    }

    return intents;
  }
}

// Singleton instance
export const professionalAgent = new ProfessionalAgent();
