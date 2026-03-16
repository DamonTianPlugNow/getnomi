'use client';

import React from 'react';
import { TimelineItem } from './TimelineItem';
import type { TimelineEvent } from '@/types/database';

interface TimelineProps {
  events: TimelineEvent[];
  onEdit?: (event: TimelineEvent) => void;
  onDelete?: (eventId: string) => void;
  className?: string;
}

export function Timeline({ events, onEdit, onDelete, className = '' }: TimelineProps) {
  // Sort events by start_year
  const sortedEvents = [...events].sort((a, b) => {
    const yearA = a.start_year || 0;
    const yearB = b.start_year || 0;
    return yearA - yearB;
  });

  if (events.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-4xl mb-4">📅</div>
        <p className="text-[#37352f]/60">暂无时间线事件</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#e3e2de]" />

      {/* Events */}
      <div className="space-y-6">
        {sortedEvents.map((event) => (
          <TimelineItem
            key={event.id}
            event={event}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

export default Timeline;
