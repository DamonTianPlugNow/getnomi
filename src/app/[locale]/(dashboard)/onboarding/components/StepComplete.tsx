'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { TimelineEvent } from '@/types/database';

interface StepCompleteProps {
  timelineEvents: TimelineEvent[];
  isLoading: boolean;
}

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

export function StepComplete({ timelineEvents, isLoading }: StepCompleteProps) {
  const t = useTranslations('onboarding');
  const router = useRouter();

  const sortedEvents = [...timelineEvents].sort((a, b) => {
    const yearA = a.start_year || 0;
    const yearB = b.start_year || 0;
    return yearA - yearB;
  });

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fadeIn">
        <div className="w-16 h-16 border-4 border-[#0077cc] border-t-transparent
          rounded-full animate-spin mb-4" />
        <p className="text-[#37352f]/60">{t('complete.generating')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl font-semibold text-[#37352f] mb-2">
          {t('complete.title')}
        </h2>
        <p className="text-[#37352f]/60">
          {t('complete.description')}
        </p>
      </div>

      {/* Timeline preview */}
      <div className="max-w-lg mx-auto">
        <div className="relative pl-8 border-l-2 border-[#e3e2de] space-y-6">
          {sortedEvents.map((event, index) => (
            <div key={event.id || index} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[41px] w-5 h-5 rounded-full
                bg-[#0077cc] border-4 border-white shadow" />

              {/* Event card */}
              <div className="bg-[#f7f6f3] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{EVENT_ICONS[event.event_type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    {/* Year */}
                    <div className="text-sm text-[#0077cc] font-medium">
                      {event.start_year}
                      {event.end_year && event.end_year !== event.start_year && (
                        <span> - {event.is_current ? t('complete.present') : event.end_year}</span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-medium text-[#37352f] mt-1">
                      {event.title}
                    </h3>

                    {/* Location */}
                    {(event.province || event.city) && (
                      <div className="text-sm text-[#37352f]/60 mt-1 flex items-center gap-1">
                        <span>📍</span>
                        {event.province && <span>{event.province}</span>}
                        {event.province && event.city && <span>·</span>}
                        {event.city && <span>{event.city}</span>}
                      </div>
                    )}

                    {/* Institution or company */}
                    {event.institution && (
                      <div className="text-sm text-[#37352f]/80 mt-1">
                        {event.institution}
                        {event.position && ` · ${event.position}`}
                      </div>
                    )}

                    {/* Description */}
                    {event.description && (
                      <p className="text-sm text-[#37352f]/60 mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={handleGoToDashboard}
          className="px-8 py-3 bg-[#0077cc] text-white rounded-xl font-medium
            hover:bg-[#0066b3] transition-colors flex items-center gap-2"
        >
          <span>{t('complete.goToDashboard')}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

export default StepComplete;
