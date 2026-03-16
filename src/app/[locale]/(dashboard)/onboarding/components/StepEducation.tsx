'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FillInBlank } from './FillInBlank';
import { SkipButton } from './SkipButton';
import { validateEntryDates } from '@/lib/validation';

export interface EducationEntry {
  type: 'kindergarten' | 'elementary' | 'middle_school' | 'high_school' | 'university';
  startYear: string;
  endYear: string;
  province: string;
  city: string;
  school: string;
  major?: string;
}

const EDUCATION_TYPES = [
  'kindergarten',
  'elementary',
  'middle_school',
  'high_school',
  'university',
] as const;

const EDUCATION_ICONS: Record<string, string> = {
  kindergarten: '🌱',
  elementary: '📚',
  middle_school: '📖',
  high_school: '🎒',
  university: '🎓',
};

interface StepEducationProps {
  educationData: EducationEntry[];
  onEducationChange: (index: number, field: keyof EducationEntry, value: string) => void;
  onAddEducation: (type: EducationEntry['type']) => void;
  onRemoveEducation: (index: number) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function StepEducation({
  educationData,
  onEducationChange,
  onAddEducation,
  onRemoveEducation,
  onNext,
  onSkip,
  onBack,
}: StepEducationProps) {
  const t = useTranslations('onboarding');
  const [errors, setErrors] = useState<Record<number, string | null>>({});

  const validateAllEntries = useCallback(() => {
    const newErrors: Record<number, string | null> = {};
    let hasError = false;

    educationData.forEach((entry, index) => {
      const result = validateEntryDates(entry.startYear, entry.endYear, false);
      if (!result.valid) {
        newErrors[index] = result.error || null;
        hasError = true;
      } else {
        newErrors[index] = null;
      }
    });

    setErrors(newErrors);
    return !hasError;
  }, [educationData]);

  const handleChange = (index: number) => (field: string, value: string) => {
    // Clear error for this entry when user makes changes
    if (errors[index]) {
      setErrors((prev) => ({ ...prev, [index]: null }));
    }
    onEducationChange(index, field as keyof EducationEntry, value);
  };

  const handleNext = () => {
    if (educationData.length > 0 && !validateAllEntries()) {
      return;
    }
    onNext();
  };

  const getAvailableTypes = () => {
    const usedTypes = new Set(educationData.map((e) => e.type));
    return EDUCATION_TYPES.filter((type) => !usedTypes.has(type));
  };

  const availableTypes = getAvailableTypes();

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[#37352f] mb-2">
          {t('education.title')}
        </h2>
        <p className="text-[#37352f]/60">
          {t('education.description')}
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-4">
        {educationData.map((entry, index) => (
          <div key={index} className="p-6 bg-[#f7f6f3] rounded-xl relative group">
            <button
              onClick={() => onRemoveEducation(index)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-100
                text-red-500 opacity-0 group-hover:opacity-100 transition-opacity
                hover:bg-red-200 flex items-center justify-center text-sm"
            >
              ×
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{EDUCATION_ICONS[entry.type]}</span>
              <span className="font-medium text-[#37352f]">
                {t(`education.types.${entry.type}`)}
              </span>
            </div>

            <div className="space-y-4">
              {/* Period */}
              <FillInBlank
                template={t('education.periodTemplate')}
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
              {errors[index] && (
                <p className="text-red-500 text-sm">{errors[index]}</p>
              )}

              {/* Location and school */}
              <FillInBlank
                template={t('education.locationTemplate')}
                values={{
                  province: entry.province,
                  city: entry.city,
                  school: entry.school,
                }}
                onChange={handleChange(index)}
                placeholders={{
                  province: t('birth.provincePlaceholder'),
                  city: t('birth.cityPlaceholder'),
                  school: t('education.schoolPlaceholder'),
                }}
                inputWidths={{
                  school: 'w-40',
                }}
              />

              {/* Major (university only) */}
              {entry.type === 'university' && (
                <FillInBlank
                  template={t('education.majorTemplate')}
                  values={{
                    major: entry.major || '',
                  }}
                  onChange={handleChange(index)}
                  placeholders={{
                    major: t('education.majorPlaceholder'),
                  }}
                  inputWidths={{
                    major: 'w-40',
                  }}
                />
              )}
            </div>
          </div>
        ))}

        {/* Add education buttons */}
        {availableTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {availableTypes.map((type) => (
              <button
                key={type}
                onClick={() => onAddEducation(type)}
                className="px-3 py-1.5 text-sm bg-white border border-[#e3e2de]
                  rounded-full hover:border-[#0077cc] hover:text-[#0077cc]
                  transition-colors flex items-center gap-1"
              >
                <span>{EDUCATION_ICONS[type]}</span>
                <span>+ {t(`education.types.${type}`)}</span>
              </button>
            ))}
          </div>
        )}
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
          onClick={handleNext}
          className="px-6 py-2 bg-[#37352f] text-white rounded-lg font-medium
            hover:bg-[#37352f]/90 transition-colors"
        >
          {t('next')}
        </button>
      </div>
    </div>
  );
}

export default StepEducation;
