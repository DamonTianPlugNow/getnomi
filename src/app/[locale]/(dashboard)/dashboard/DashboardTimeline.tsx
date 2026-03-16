'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Timeline, TimelineAddEvent } from '@/components/timeline';
import type { TimelineEvent, CreateTimelineEventInput } from '@/types/database';

interface DashboardTimelineProps {
  initialEvents: TimelineEvent[];
}

export function DashboardTimeline({ initialEvents }: DashboardTimelineProps) {
  const t = useTranslations('timeline');
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleAddEvent = useCallback(async (eventData: CreateTimelineEventInput) => {
    const response = await fetch('/api/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      throw new Error('Failed to add event');
    }

    const { event } = await response.json();
    setEvents((prev) => [...prev, event]);
  }, []);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (isDeleting) return;

    setIsDeleting(eventId);
    try {
      const response = await fetch(`/api/timeline/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (error) {
      console.error('Failed to delete event:', error);
    } finally {
      setIsDeleting(null);
    }
  }, [isDeleting]);

  return (
    <div className="mt-10">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-[#37352f]">{t('title')}</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium
            text-[#0077cc] hover:bg-[#0077cc]/5 rounded-lg transition-colors"
        >
          <span>+</span>
          <span>{t('addEvent')}</span>
        </button>
      </div>

      <div className="bg-[#f7f6f3] rounded-xl p-6 border border-[#e3e2de]">
        <Timeline
          events={events}
          onDelete={handleDeleteEvent}
        />
      </div>

      <TimelineAddEvent
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddEvent}
      />
    </div>
  );
}

export default DashboardTimeline;
