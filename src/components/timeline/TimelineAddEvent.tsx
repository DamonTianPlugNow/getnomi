'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TimelineEventType, CreateTimelineEventInput } from '@/types/database';

interface TimelineAddEventProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (event: CreateTimelineEventInput) => Promise<void>;
}

const EVENT_TYPES: Array<{ value: TimelineEventType; icon: string }> = [
  { value: 'birth', icon: '👶' },
  { value: 'education_kindergarten', icon: '🌱' },
  { value: 'education_elementary', icon: '📚' },
  { value: 'education_middle_school', icon: '📖' },
  { value: 'education_high_school', icon: '🎒' },
  { value: 'education_university', icon: '🎓' },
  { value: 'work', icon: '💼' },
  { value: 'custom', icon: '⭐' },
];

export function TimelineAddEvent({ isOpen, onClose, onAdd }: TimelineAddEventProps) {
  const t = useTranslations('timeline');

  const [eventType, setEventType] = useState<TimelineEventType>('custom');
  const [title, setTitle] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [institution, setInstitution] = useState('');
  const [position, setPosition] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    setIsSubmitting(true);

    try {
      await onAdd({
        event_type: eventType,
        title: title.trim(),
        start_year: startYear ? parseInt(startYear) : undefined,
        end_year: isCurrent ? undefined : endYear ? parseInt(endYear) : undefined,
        is_current: isCurrent,
        province: province.trim() || undefined,
        city: city.trim() || undefined,
        institution: institution.trim() || undefined,
        position: position.trim() || undefined,
        description: description.trim() || undefined,
        source: 'manual',
      });

      // Reset form
      setEventType('custom');
      setTitle('');
      setStartYear('');
      setEndYear('');
      setIsCurrent(false);
      setProvince('');
      setCity('');
      setInstitution('');
      setPosition('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to add event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const showInstitution =
    eventType.startsWith('education_') || eventType === 'work';
  const showPosition = eventType === 'work';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e3e2de] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#37352f]">
            {t('addEvent')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#f7f6f3] rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-[#37352f]/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Event type */}
          <div>
            <label className="block text-sm font-medium text-[#37352f] mb-2">
              {t('eventType')}
            </label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(({ value, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEventType(value)}
                  className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1
                    border transition-colors ${
                    eventType === value
                      ? 'bg-[#0077cc] text-white border-[#0077cc]'
                      : 'bg-white text-[#37352f] border-[#e3e2de] hover:border-[#0077cc]'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{t(`types.${value}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#37352f] mb-2">
              {t('title')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
              required
              className="w-full px-4 py-2.5 border border-[#e3e2de] rounded-lg
                focus:border-[#0077cc] focus:outline-none text-[#37352f]
                placeholder:text-[#37352f]/30"
            />
          </div>

          {/* Years */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#37352f] mb-2">
                {t('startYear')}
              </label>
              <input
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                placeholder="YYYY"
                min="1900"
                max="2100"
                className="w-full px-4 py-2.5 border border-[#e3e2de] rounded-lg
                  focus:border-[#0077cc] focus:outline-none text-[#37352f]
                  placeholder:text-[#37352f]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#37352f] mb-2">
                {t('endYear')}
              </label>
              <input
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                placeholder="YYYY"
                min="1900"
                max="2100"
                disabled={isCurrent}
                className="w-full px-4 py-2.5 border border-[#e3e2de] rounded-lg
                  focus:border-[#0077cc] focus:outline-none text-[#37352f]
                  placeholder:text-[#37352f]/30 disabled:bg-[#f7f6f3]"
              />
            </div>
          </div>

          {/* Is current */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="w-4 h-4 text-[#0077cc] border-[#e3e2de] rounded
                focus:ring-[#0077cc]"
            />
            <span className="text-sm text-[#37352f]">{t('isCurrent')}</span>
          </label>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#37352f] mb-2">
                {t('province')}
              </label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder={t('provincePlaceholder')}
                className="w-full px-4 py-2.5 border border-[#e3e2de] rounded-lg
                  focus:border-[#0077cc] focus:outline-none text-[#37352f]
                  placeholder:text-[#37352f]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#37352f] mb-2">
                {t('city')}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('cityPlaceholder')}
                className="w-full px-4 py-2.5 border border-[#e3e2de] rounded-lg
                  focus:border-[#0077cc] focus:outline-none text-[#37352f]
                  placeholder:text-[#37352f]/30"
              />
            </div>
          </div>

          {/* Institution */}
          {showInstitution && (
            <div>
              <label className="block text-sm font-medium text-[#37352f] mb-2">
                {eventType === 'work' ? t('company') : t('school')}
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder={eventType === 'work' ? t('companyPlaceholder') : t('schoolPlaceholder')}
                className="w-full px-4 py-2.5 border border-[#e3e2de] rounded-lg
                  focus:border-[#0077cc] focus:outline-none text-[#37352f]
                  placeholder:text-[#37352f]/30"
              />
            </div>
          )}

          {/* Position */}
          {showPosition && (
            <div>
              <label className="block text-sm font-medium text-[#37352f] mb-2">
                {t('position')}
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder={t('positionPlaceholder')}
                className="w-full px-4 py-2.5 border border-[#e3e2de] rounded-lg
                  focus:border-[#0077cc] focus:outline-none text-[#37352f]
                  placeholder:text-[#37352f]/30"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#37352f] mb-2">
              {t('description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
              className="w-full px-4 py-2.5 border border-[#e3e2de] rounded-lg
                focus:border-[#0077cc] focus:outline-none text-[#37352f]
                placeholder:text-[#37352f]/30 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#e3e2de] rounded-lg
                text-[#37352f] hover:bg-[#f7f6f3] transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="flex-1 py-2.5 bg-[#0077cc] text-white rounded-lg
                hover:bg-[#0066b3] disabled:bg-[#e3e2de] disabled:text-[#37352f]/40
                disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? t('adding') : t('add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TimelineAddEvent;
