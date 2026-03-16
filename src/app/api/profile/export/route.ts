import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { TimelineEvent, MemoryProfile } from '@/types/database';

const EVENT_LABELS: Record<string, string> = {
  birth: '出生',
  education_kindergarten: '幼儿园',
  education_elementary: '小学',
  education_middle_school: '初中',
  education_high_school: '高中',
  education_university: '大学',
  work: '工作',
  custom: '人生事件',
};

const EVENT_ICONS: Record<string, string> = {
  birth: '👶',
  education_kindergarten: '🌱',
  education_elementary: '📚',
  education_middle_school: '📖',
  education_high_school: '🎒',
  education_university: '🎓',
  work: '💼',
  custom: '⭐',
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch user and memory profile
  const { data: userData } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single();

  const { data: profile } = await supabase
    .from('memory_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Fetch timeline events
  const { data: timelineEvents } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('user_id', user.id)
    .order('start_year', { ascending: true });

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Generate markdown
  const markdown = generateTimelineMarkdown(
    profile as MemoryProfile,
    (timelineEvents || []) as TimelineEvent[],
    userData
  );

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${profile.display_name || 'profile'}.md"`,
    },
  });
}

function generateTimelineMarkdown(
  profile: MemoryProfile,
  timelineEvents: TimelineEvent[],
  userData?: { name?: string; email?: string } | null
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${profile.display_name}的人生时间线`);
  lines.push('');

  // Basic info
  lines.push('## 基本信息');
  if (profile.birth_date || profile.birth_province || profile.birth_city) {
    const birthParts: string[] = [];
    if (profile.birth_date) {
      const date = new Date(profile.birth_date);
      birthParts.push(`${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`);
    }
    if (profile.birth_province || profile.birth_city) {
      birthParts.push([profile.birth_province, profile.birth_city].filter(Boolean).join(''));
    }
    if (birthParts.length > 0) {
      lines.push(`- **出生:** ${birthParts.join('，')}`);
    }
  }
  if (profile.location) {
    lines.push(`- **当前所在地:** ${profile.location}`);
  }
  if (profile.headline) {
    lines.push(`- **简介:** ${profile.headline}`);
  }
  if (userData?.email) {
    lines.push(`- **邮箱:** ${userData.email}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Timeline
  lines.push('## 时间线');
  lines.push('');

  if (timelineEvents.length === 0) {
    lines.push('*暂无时间线事件*');
    lines.push('');
  } else {
    for (const event of timelineEvents) {
      const icon = EVENT_ICONS[event.event_type] || '📌';
      const label = EVENT_LABELS[event.event_type] || '事件';

      // Year header
      let yearRange = '';
      if (event.start_year) {
        if (event.is_current) {
          yearRange = `${event.start_year} - 至今`;
        } else if (event.end_year && event.end_year !== event.start_year) {
          yearRange = `${event.start_year} - ${event.end_year}`;
        } else {
          yearRange = event.start_year.toString();
        }
      }

      lines.push(`### ${yearRange} - ${label}`);

      // Location
      if (event.province || event.city) {
        const location = [event.province, event.city].filter(Boolean).join(' ');
        lines.push(`📍 ${location}${event.institution ? ` ${event.institution}` : ''}`);
      } else if (event.institution) {
        lines.push(`${icon} ${event.institution}`);
      }

      // Position (for work)
      if (event.position) {
        lines.push(`担任：${event.position}`);
      }

      // Description
      if (event.description) {
        lines.push(event.description);
      }

      lines.push('');
    }
  }

  // Additional sections from profile (if available)
  if (profile.skills && profile.skills.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## 技能');
    lines.push(profile.skills.map((s) => `\`${s}\``).join(' '));
    lines.push('');
  }

  if (profile.interests && profile.interests.length > 0) {
    lines.push('## 兴趣爱好');
    lines.push(profile.interests.join('、'));
    lines.push('');
  }

  if (profile.values && profile.values.length > 0) {
    lines.push('## 价值观');
    lines.push(profile.values.join('、'));
    lines.push('');
  }

  if (profile.can_offer && profile.can_offer.length > 0) {
    lines.push('## 我能提供');
    for (const item of profile.can_offer) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  if (profile.looking_for && profile.looking_for.length > 0) {
    lines.push('## 我在寻找');
    for (const item of profile.looking_for) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  if (profile.current_goals && profile.current_goals.length > 0) {
    lines.push('## 当前目标');
    for (const goal of profile.current_goals) {
      lines.push(`- ${goal}`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('*Generated by [Nomi](https://getnomi.me) - 你的数字人生日记*');

  return lines.join('\n');
}
