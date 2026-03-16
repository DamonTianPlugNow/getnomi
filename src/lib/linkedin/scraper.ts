/**
 * LinkedIn Profile Scraper using Apollo.io API
 *
 * API docs: https://docs.apollo.io/reference/people-enrichment
 */

interface ApolloEmploymentHistory {
  _id?: string;
  id?: string;
  current?: boolean;
  start_date?: string;
  end_date?: string;
  title?: string;
  organization_id?: string;
  organization_name?: string;
  description?: string;
  degree?: string;
  major?: string;
  kind?: string; // "education" or "work"
}

interface ApolloPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  title?: string;
  headline?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  photo_url?: string;
  employment_history?: ApolloEmploymentHistory[];
  organization?: {
    name?: string;
    website_url?: string;
  };
}

interface ApolloResponse {
  person?: ApolloPerson;
}

interface LinkedInEducation {
  school?: string;
  degree_name?: string;
  field_of_study?: string;
  starts_at?: { year?: number; month?: number };
  ends_at?: { year?: number; month?: number };
}

interface LinkedInExperience {
  company?: string;
  title?: string;
  description?: string;
  location?: string;
  starts_at?: { year?: number; month?: number };
  ends_at?: { year?: number; month?: number };
  is_current?: boolean;
}

interface LinkedInProfile {
  full_name?: string;
  headline?: string;
  city?: string;
  state?: string;
  country?: string;
  education?: LinkedInEducation[];
  experiences?: LinkedInExperience[];
}

/**
 * Parse date string from Apollo format (e.g., "2020-01-01" or "January 2020")
 */
function parseApolloDate(dateStr?: string): { year?: number; month?: number } | undefined {
  if (!dateStr) return undefined;

  // Try YYYY-MM-DD format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const parts = dateStr.split('-');
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
    };
  }

  // Try YYYY-MM format
  if (dateStr.match(/^\d{4}-\d{2}$/)) {
    const parts = dateStr.split('-');
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
    };
  }

  // Try to extract year from various formats
  const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    return { year: parseInt(yearMatch[0], 10) };
  }

  return undefined;
}

/**
 * Determine if an employment history item is education based on various signals
 */
function isEducationEntry(item: ApolloEmploymentHistory): boolean {
  // Check kind field if present
  if (item.kind === 'education') return true;

  // Check if has degree or major
  if (item.degree || item.major) return true;

  // Check organization name for common education keywords
  const orgName = (item.organization_name || '').toLowerCase();
  const educationKeywords = [
    'university', 'college', 'school', 'institute', 'academy',
    '大学', '学院', '学校', '中学', '小学', '高中',
    'université', 'universität', 'universidad',
  ];

  return educationKeywords.some(keyword => orgName.includes(keyword));
}

/**
 * Scrape LinkedIn profile using Apollo.io API
 */
export async function scrapeLinkedInProfile(linkedinUrl: string): Promise<LinkedInProfile> {
  const apiKey = process.env.APOLLO_API_KEY;

  if (!apiKey) {
    throw new Error('APOLLO_API_KEY is not configured');
  }

  // Normalize LinkedIn URL
  let normalizedUrl = linkedinUrl.trim();
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  console.log('Fetching LinkedIn profile via Apollo.io:', normalizedUrl);

  const response = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      linkedin_url: normalizedUrl,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Apollo API error:', response.status, errorText);

    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Apollo API key');
    }
    if (response.status === 404) {
      throw new Error('LinkedIn profile not found in Apollo database');
    }
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 422) {
      throw new Error('Invalid LinkedIn URL format');
    }

    throw new Error(`Failed to fetch LinkedIn profile: ${response.status}`);
  }

  const data: ApolloResponse = await response.json();
  console.log('Apollo API response:', JSON.stringify(data, null, 2));

  if (!data.person) {
    throw new Error('LinkedIn profile not found. The profile may not be in Apollo\'s database.');
  }

  // Transform Apollo data to our standard format
  return transformApolloData(data.person);
}

/**
 * Transform Apollo.io response to our standard LinkedInProfile format
 */
function transformApolloData(person: ApolloPerson): LinkedInProfile {
  const experiences: LinkedInExperience[] = [];
  const education: LinkedInEducation[] = [];

  // Process employment_history - separate work and education
  (person.employment_history || []).forEach((item) => {
    if (isEducationEntry(item)) {
      education.push({
        school: item.organization_name,
        degree_name: item.degree || item.title,
        field_of_study: item.major,
        starts_at: parseApolloDate(item.start_date),
        ends_at: parseApolloDate(item.end_date),
      });
    } else {
      experiences.push({
        company: item.organization_name,
        title: item.title,
        description: item.description,
        starts_at: parseApolloDate(item.start_date),
        ends_at: item.current ? undefined : parseApolloDate(item.end_date),
        is_current: item.current,
      });
    }
  });

  return {
    full_name: person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
    headline: person.headline || person.title,
    city: person.city,
    state: person.state,
    country: person.country,
    education,
    experiences,
  };
}
