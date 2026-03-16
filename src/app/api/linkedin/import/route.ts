import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scrapeLinkedInProfile } from '@/lib/linkedin/scraper';
import { isValidLinkedInUrl } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { linkedinUrl } = await request.json();

    if (!linkedinUrl || typeof linkedinUrl !== 'string') {
      return NextResponse.json({ error: 'LinkedIn URL is required' }, { status: 400 });
    }

    // Validate LinkedIn URL format
    if (!isValidLinkedInUrl(linkedinUrl)) {
      return NextResponse.json({ error: 'Invalid LinkedIn profile URL format' }, { status: 400 });
    }

    // Use Apollo.io API to fetch LinkedIn profile data
    const profileData = await scrapeLinkedInProfile(linkedinUrl);

    // Transform to our expected format
    const education = (profileData.education || []).map((edu) => ({
      type: 'university' as const,
      school: edu.school || '',
      major: edu.field_of_study || '',
      startYear: edu.starts_at?.year?.toString() || '',
      endYear: edu.ends_at?.year?.toString() || '',
    }));

    const work = (profileData.experiences || []).map((exp) => ({
      company: exp.company || '',
      position: exp.title || '',
      description: exp.description || '',
      startYear: exp.starts_at?.year?.toString() || '',
      endYear: exp.ends_at?.year?.toString() || '',
      isCurrent: exp.is_current || false,
    }));

    return NextResponse.json({
      success: true,
      name: profileData.full_name,
      headline: profileData.headline,
      education,
      work,
    });
  } catch (error) {
    console.error('LinkedIn import error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
