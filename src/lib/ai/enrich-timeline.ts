/**
 * AI-powered timeline event enrichment
 *
 * Takes simple user inputs and enriches them with more vivid descriptions.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { CreateTimelineEventInput } from '@/types/database';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
});

const ENRICHMENT_PROMPT = `你是一个人生故事撰写助手。用户提供了简单的人生事件信息，请帮助润色成更生动、有温度的描述。

规则：
1. 保持真实，不要过度夸张
2. 输出 1-2 句话的简短描述
3. 使用第一人称视角
4. 添加适当的情感色彩，但保持克制
5. 如果信息太少，就返回原内容或简单描述

事件类型说明：
- birth: 出生
- education_kindergarten: 幼儿园
- education_elementary: 小学
- education_middle_school: 初中
- education_high_school: 高中
- education_university: 大学
- work: 工作经历
- custom: 自定义事件`;

interface EnrichmentInput {
  event_type: string;
  title: string;
  institution?: string;
  position?: string;
  description?: string;
  province?: string;
  city?: string;
  start_year?: number;
  end_year?: number;
  is_current?: boolean;
}

interface EnrichmentResult {
  description: string;
}

/**
 * Enrich a single timeline event description using AI
 */
async function enrichSingleEvent(event: EnrichmentInput): Promise<string | null> {
  // Skip if already has a meaningful description
  if (event.description && event.description.length > 30) {
    return null;
  }

  // Build context string
  const contextParts: string[] = [];

  if (event.event_type) {
    contextParts.push(`事件类型: ${event.event_type}`);
  }
  if (event.title) {
    contextParts.push(`标题: ${event.title}`);
  }
  if (event.institution) {
    contextParts.push(`机构: ${event.institution}`);
  }
  if (event.position) {
    contextParts.push(`职位: ${event.position}`);
  }
  if (event.province || event.city) {
    contextParts.push(`地点: ${[event.province, event.city].filter(Boolean).join(' ')}`);
  }
  if (event.start_year) {
    const yearRange = event.is_current
      ? `${event.start_year} - 至今`
      : event.end_year
      ? `${event.start_year} - ${event.end_year}`
      : `${event.start_year}`;
    contextParts.push(`时间: ${yearRange}`);
  }
  if (event.description) {
    contextParts.push(`原描述: ${event.description}`);
  }

  const context = contextParts.join('\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `请根据以下信息，写一段简短的人生事件描述（1-2句话）：\n\n${context}`,
        },
      ],
      system: ENRICHMENT_PROMPT,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text.trim();
    }
    return null;
  } catch (error) {
    console.error('Failed to enrich event:', error);
    return null;
  }
}

/**
 * Batch enrich multiple timeline events
 * Returns the events with enriched descriptions
 */
export async function enrichTimelineEvents(
  events: CreateTimelineEventInput[]
): Promise<CreateTimelineEventInput[]> {
  // If no API key, skip enrichment
  if (!process.env.ANTHROPIC_API_KEY) {
    return events;
  }

  // Process events in parallel with a limit
  const enrichmentPromises = events.map(async (event) => {
    const enrichedDescription = await enrichSingleEvent({
      event_type: event.event_type,
      title: event.title,
      institution: event.institution,
      position: event.position,
      description: event.description,
      province: event.province,
      city: event.city,
      start_year: event.start_year,
      end_year: event.end_year,
      is_current: event.is_current,
    });

    if (enrichedDescription) {
      return {
        ...event,
        description: enrichedDescription,
      };
    }
    return event;
  });

  return Promise.all(enrichmentPromises);
}

/**
 * Enrich a single event (used when adding new events)
 */
export async function enrichSingleTimelineEvent(
  event: CreateTimelineEventInput
): Promise<CreateTimelineEventInput> {
  const enrichedDescription = await enrichSingleEvent({
    event_type: event.event_type,
    title: event.title,
    institution: event.institution,
    position: event.position,
    description: event.description,
    province: event.province,
    city: event.city,
    start_year: event.start_year,
    end_year: event.end_year,
    is_current: event.is_current,
  });

  if (enrichedDescription) {
    return {
      ...event,
      description: enrichedDescription,
    };
  }
  return event;
}
