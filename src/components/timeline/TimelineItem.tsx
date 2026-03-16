'use client';

import React, { useState } from 'react';
import type { TimelineEvent } from '@/types/database';

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

const EVENT_COLORS: Record<string, string> = {
  birth: 'bg-pink-500',
  education_kindergarten: 'bg-green-400',
  education_elementary: 'bg-green-500',
  education_middle_school: 'bg-blue-400',
  education_high_school: 'bg-blue-500',
  education_university: 'bg-purple-500',
  work: 'bg-amber-500',
  custom: 'bg-gray-500',
};

interface TimelineItemProps {
  event: TimelineEvent;
  onEdit?: (event: TimelineEvent) => void;
  onDelete?: (eventId: string) => void;
}

export function TimelineItem({ event, onEdit, onDelete }: TimelineItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const icon = EVENT_ICONS[event.event_type] || '📌';
  const dotColor = EVENT_COLORS[event.event_type] || 'bg-gray-500';

  const formatYear = () => {
    if (!event.start_year) return '';

    if (event.is_current) {
      return `${event.start_year} - 至今`;
    }
    if (event.end_year && event.end_year !== event.start_year) {
      return `${event.start_year} - ${event.end_year}`;
    }
    return event.start_year.toString();
  };

  return (
    <div
      className="relative pl-14 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Timeline dot */}
      <div
        className={`absolute left-4 w-5 h-5 rounded-full ${dotColor}
          border-4 border-white shadow-sm transform -translate-x-1/2`}
      />

      {/* Event card */}
      <div
        className={`bg-[#f7f6f3] rounded-xl p-4 transition-shadow
          ${isHovered ? 'shadow-md' : ''}`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <span className="text-xl flex-shrink-0">{icon}</span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Year */}
            <div className="text-sm text-[#0077cc] font-medium mb-1">
              {formatYear()}
            </div>

            {/* Title */}
            <h3 className="font-medium text-[#37352f]">{event.title}</h3>

            {/* Location */}
            {(event.province || event.city) && (
              <div className="text-sm text-[#37352f]/60 mt-1 flex items-center gap-1">
                <span>📍</span>
                {event.province && <span>{event.province}</span>}
                {event.province && event.city && <span>·</span>}
                {event.city && <span>{event.city}</span>}
              </div>
            )}

            {/* Institution / Position */}
            {(event.institution || event.position) && (
              <div className="text-sm text-[#37352f]/80 mt-1">
                {event.institution}
                {event.institution && event.position && ' · '}
                {event.position}
              </div>
            )}

            {/* Description */}
            {event.description && (
              <p className="text-sm text-[#37352f]/60 mt-2">{event.description}</p>
            )}
          </div>

          {/* Actions */}
          {(onEdit || onDelete) && (
            <div
              className={`flex gap-1 transition-opacity ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {onEdit && (
                <button
                  onClick={() => onEdit(event)}
                  className="p-1.5 text-[#37352f]/40 hover:text-[#37352f]
                    hover:bg-[#e3e2de] rounded transition-colors"
                  title="编辑"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(event.id)}
                  className="p-1.5 text-[#37352f]/40 hover:text-red-500
                    hover:bg-red-50 rounded transition-colors"
                  title="删除"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TimelineItem;
