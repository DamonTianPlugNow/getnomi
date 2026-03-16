/**
 * LinkedIn Profile Parser using Screenshot + AI Vision
 *
 * Flow:
 * 1. Use Playwright to take screenshot of LinkedIn profile page
 * 2. Send screenshot to Claude Vision API for analysis
 * 3. Return structured education and work experience data
 */

import { chromium, Browser } from 'playwright';
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

let browser: Browser | null = null;

/**
 * Get or create a browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browser;
}

/**
 * Take screenshot of LinkedIn profile page
 */
async function screenshotLinkedInProfile(linkedinUrl: string): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 2000 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    // Navigate to LinkedIn profile
    await page.goto(linkedinUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Scroll down to load more content (education/experience sections)
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(1000);

    // Take full page screenshot
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png',
    });

    return screenshot;
  } finally {
    await context.close();
  }
}

/**
 * Parse LinkedIn screenshot using Claude Vision
 */
async function parseScreenshotWithClaude(screenshot: Buffer): Promise<ParsedLinkedInData> {
  const client = new Anthropic();

  const base64Image = screenshot.toString('base64');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `Analyze this LinkedIn profile screenshot and extract the following information in JSON format:

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
- Extract ALL education and work entries visible in the screenshot
- Use empty string "" for missing fields
- For years, only include the 4-digit year number
- If the page shows "Present" or similar for end date, set isCurrent to true and endYear to ""

Return ONLY valid JSON, no markdown or explanation:
{
  "name": "...",
  "headline": "...",
  "education": [...],
  "work": [...]
}`,
          },
        ],
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
    throw new Error('Failed to parse LinkedIn data from screenshot');
  }
}

/**
 * Main function: Screenshot LinkedIn profile and parse with AI
 */
export async function parseLinkedInProfile(linkedinUrl: string): Promise<ParsedLinkedInData> {
  // Normalize URL
  let normalizedUrl = linkedinUrl.trim();
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  console.log('Taking screenshot of LinkedIn profile:', normalizedUrl);
  const screenshot = await screenshotLinkedInProfile(normalizedUrl);

  console.log('Analyzing screenshot with Claude Vision...');
  const parsedData = await parseScreenshotWithClaude(screenshot);

  console.log('Parsed LinkedIn data:', JSON.stringify(parsedData, null, 2));
  return parsedData;
}

/**
 * Cleanup browser on process exit
 */
process.on('beforeExit', async () => {
  if (browser) {
    await browser.close();
  }
});
