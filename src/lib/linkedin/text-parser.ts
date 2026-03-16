/**
 * LinkedIn Profile Parser using AI Text Analysis
 *
 * User copies their LinkedIn profile page content and pastes it.
 * We use Claude to extract structured education and work data.
 */

import Anthropic from '@anthropic-ai/sdk';

interface ParsedEducation {
  type: string;
  school: string;
  major?: string;
  startYear: string;
  endYear: string;
}

interface ParsedWork {
  company: string;
  position: string;
  description?: string;
  startYear: string;
  endYear: string;
  isCurrent: boolean;
}

interface ParsedLinkedInData {
  name?: string;
  headline?: string;
  education: ParsedEducation[];
  work: ParsedWork[];
}

/**
 * Parse LinkedIn profile text using Claude
 */
export async function parseLinkedInText(text: string): Promise<ParsedLinkedInData> {
  if (!text || text.trim().length < 50) {
    throw new Error('Please paste more content from your LinkedIn profile');
  }

  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Analyze this LinkedIn profile text and extract the following information in JSON format:

1. name: The person's full name
2. headline: Their professional headline/title
3. education: Array of education entries, each with:
   - type: One of "kindergarten", "elementary", "middle_school", "high_school", "university" (guess based on school name/degree)
   - school: School/university name
   - major: Field of study or degree (if available)
   - startYear: Start year (4 digits, e.g., "2015")
   - endYear: End year (4 digits, e.g., "2019", or empty if ongoing)

4. work: Array of work experience entries, each with:
   - company: Company name
   - position: Job title
   - description: Brief job description (if visible)
   - startYear: Start year (4 digits)
   - endYear: End year (4 digits, or empty if current)
   - isCurrent: true if this is their current job

Important:
- Extract ALL education and work entries from the text
- Use empty string "" for missing fields
- For years, only include the 4-digit year number
- If text shows "Present", "至今", "現在", "현재" or similar for end date, set isCurrent to true and endYear to ""
- Handle multiple languages (English, Chinese, Japanese, Korean, etc.)

LinkedIn Profile Text:
"""
${text}
"""

Return ONLY valid JSON, no markdown or explanation:
{
  "name": "...",
  "headline": "...",
  "education": [...],
  "work": [...]
}`,
      },
    ],
  });

  // Extract JSON from response
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response format from Claude');
  }

  try {
    // Try to parse the response as JSON
    let jsonStr = content.text.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    return {
      name: parsed.name || undefined,
      headline: parsed.headline || undefined,
      education: Array.isArray(parsed.education) ? parsed.education : [],
      work: Array.isArray(parsed.work) ? parsed.work : [],
    };
  } catch (parseError) {
    console.error('Failed to parse Claude response:', content.text);
    throw new Error('Failed to parse LinkedIn data. Please make sure you copied the full profile page.');
  }
}
