'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FillInBlank } from './FillInBlank';
import { SkipButton } from './SkipButton';
import { validateEntryDates } from '@/lib/validation';

export interface WorkEntry {
  startYear: string;
  endYear: string;
  isCurrent: boolean;
  province: string;
  city: string;
  company: string;
  position: string;
  description: string;
}

interface StepWorkProps {
  workData: WorkEntry[];
  onWorkChange: (index: number, field: keyof WorkEntry, value: string | boolean) => void;
  onAddWork: () => void;
  onRemoveWork: (index: number) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function StepWork({
  workData,
  onWorkChange,
  onAddWork,
  onRemoveWork,
  onNext,
  onSkip,
  onBack,
}: StepWorkProps) {
  const t = useTranslations('onboarding');
  const [errors, setErrors] = useState<Record<number, string | null>>({});

  const validateAllEntries = useCallback(() => {
    const newErrors: Record<number, string | null> = {};
    let hasError = false;

    workData.forEach((entry, index) => {
      const result = validateEntryDates(entry.startYear, entry.endYear, entry.isCurrent);
      if (!result.valid) {
        newErrors[index] = result.error || null;
        hasError = true;
      } else {
        newErrors[index] = null;
      }
    });

    setErrors(newErrors);
    return !hasError;
  }, [workData]);

  const handleChange = (index: number) => (field: string, value: string) => {
    // Clear error for this entry when user makes changes
    if (errors[index]) {
      setErrors((prev) => ({ ...prev, [index]: null }));
    }
    onWorkChange(index, field as keyof WorkEntry, value);
  };

  const handleCheckboxChange = (index: number, checked: boolean) => {
    // Clear error when user toggles isCurrent
    if (errors[index]) {
      setErrors((prev) => ({ ...prev, [index]: null }));
    }
    onWorkChange(index, 'isCurrent', checked);
  };

  const handleComplete = () => {
    if (workData.length > 0 && !validateAllEntries()) {
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[#37352f] mb-2">
          {t('work.title')}
        </h2>
        <p className="text-[#37352f]/60">
          {t('work.description')}
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-4">
        {workData.map((entry, index) => (
          <div key={index} className="p-6 bg-[#f7f6f3] rounded-xl relative group">
            <button
              onClick={() => onRemoveWork(index)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-100
                text-red-500 opacity-0 group-hover:opacity-100 transition-opacity
                hover:bg-red-200 flex items-center justify-center text-sm"
            >
              ×
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">💼</span>
              <span className="font-medium text-[#37352f]">
                {t('work.experienceLabel')} #{index + 1}
              </span>
            </div>

            <div className="space-y-4">
              {/* Period */}
              <div className="flex items-center gap-2">
                <FillInBlank
                  template={entry.isCurrent ? t('work.periodCurrentTemplate') : t('work.periodTemplate')}
                  values={{
                    startYear: entry.startYear,
                    endYear: entry.endYear,
                  }}
                  onChange={handleChange(index)}
                  placeholders={{
                    startYear: 'YYYY',
                    endYear: 'YYYY',
                  }}
                />
              </div>
              {errors[index] && (
                <p className="text-red-500 text-sm">{errors[index]}</p>
              )}

              {/* Is current checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={entry.isCurrent}
                  onChange={(e) => handleCheckboxChange(index, e.target.checked)}
                  className="w-4 h-4 text-[#0077cc] border-[#e3e2de] rounded
                    focus:ring-[#0077cc]"
                />
                <span className="text-sm text-[#37352f]/70">{t('work.currentJob')}</span>
              </label>

              {/* Location */}
              <FillInBlank
                template={t('work.locationTemplate')}
                values={{
                  province: entry.province,
                  city: entry.city,
                }}
                onChange={handleChange(index)}
                placeholders={{
                  province: t('birth.provincePlaceholder'),
                  city: t('birth.cityPlaceholder'),
                }}
              />

              {/* Company and position */}
              <FillInBlank
                template={t('work.companyTemplate')}
                values={{
                  company: entry.company,
                  position: entry.position,
                }}
                onChange={handleChange(index)}
                placeholders={{
                  company: t('work.companyPlaceholder'),
                  position: t('work.positionPlaceholder'),
                }}
                inputWidths={{
                  company: 'w-32',
                  position: 'w-28',
                }}
              />

              {/* Description */}
              <div>
                <label className="block text-sm text-[#37352f]/60 mb-1">
                  {t('work.descriptionLabel')}
                </label>
                <textarea
                  value={entry.description}
                  onChange={(e) => onWorkChange(index, 'description', e.target.value)}
                  placeholder={t('work.descriptionPlaceholder')}
                  rows={2}
                  className="w-full px-3 py-2 border-2 border-[#e3e2de] rounded-lg
                    focus:border-[#0077cc] focus:outline-none bg-white
                    placeholder:text-[#37352f]/30 text-[#37352f] text-sm resize-none"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add work button */}
        <button
          onClick={onAddWork}
          className="w-full py-3 border-2 border-dashed border-[#e3e2de]
            rounded-xl text-[#37352f]/60 hover:border-[#0077cc] hover:text-[#0077cc]
            transition-colors flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>{t('work.addExperience')}</span>
        </button>
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-[#37352f]/60 hover:text-[#37352f]
            hover:bg-[#f7f6f3] rounded-lg transition-colors"
        >
          {t('back')}
        </button>
        <SkipButton onClick={onSkip} />
        <button
          onClick={handleComplete}
          className="px-6 py-2 bg-[#0077cc] text-white rounded-lg font-medium
            hover:bg-[#0066b3] transition-colors"
        >
          {t('complete')}
        </button>
      </div>
    </div>
  );
}

export default StepWork;
