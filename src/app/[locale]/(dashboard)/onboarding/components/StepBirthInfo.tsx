'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FillInBlank } from './FillInBlank';
import { SkipButton } from './SkipButton';
import { validateDateParts, validateBirthYear } from '@/lib/validation';

interface BirthData {
  year: string;
  month: string;
  day: string;
  province: string;
  city: string;
}

interface StepBirthInfoProps {
  birthData: BirthData;
  onBirthDataChange: (field: keyof BirthData, value: string) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function StepBirthInfo({
  birthData,
  onBirthDataChange,
  onNext,
  onSkip,
  onBack,
}: StepBirthInfoProps) {
  const t = useTranslations('onboarding');
  const [dateError, setDateError] = useState<string | null>(null);

  const validateDate = useCallback(() => {
    // First validate the year
    const yearResult = validateBirthYear(birthData.year);
    if (!yearResult.valid) {
      setDateError(yearResult.error || null);
      return false;
    }

    // Then validate the full date if all parts are provided
    const dateResult = validateDateParts(birthData.year, birthData.month, birthData.day);
    if (!dateResult.valid) {
      setDateError(dateResult.error || null);
      return false;
    }

    setDateError(null);
    return true;
  }, [birthData.year, birthData.month, birthData.day]);

  const handleChange = (field: string, value: string) => {
    // Clear error when user makes changes
    if (dateError) {
      setDateError(null);
    }
    onBirthDataChange(field as keyof BirthData, value);
  };

  const handleNext = () => {
    // Validate before proceeding
    if (birthData.year || birthData.month || birthData.day) {
      if (!validateDate()) {
        return;
      }
    }
    onNext();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[#37352f] mb-2">
          {t('birth.title')}
        </h2>
        <p className="text-[#37352f]/60">
          {t('birth.description')}
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-8">
        {/* Birth date */}
        <div className="p-6 bg-[#f7f6f3] rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🎂</span>
            <span className="font-medium text-[#37352f]">{t('birth.dateLabel')}</span>
          </div>
          <FillInBlank
            template={t('birth.dateTemplate')}
            values={{
              year: birthData.year,
              month: birthData.month,
              day: birthData.day,
            }}
            onChange={handleChange}
            placeholders={{
              year: 'YYYY',
              month: 'MM',
              day: 'DD',
            }}
          />
          {dateError && (
            <p className="text-red-500 text-sm mt-2">{dateError}</p>
          )}
        </div>

        {/* Birth place */}
        <div className="p-6 bg-[#f7f6f3] rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📍</span>
            <span className="font-medium text-[#37352f]">{t('birth.placeLabel')}</span>
          </div>
          <FillInBlank
            template={t('birth.placeTemplate')}
            values={{
              province: birthData.province,
              city: birthData.city,
            }}
            onChange={handleChange}
            placeholders={{
              province: t('birth.provincePlaceholder'),
              city: t('birth.cityPlaceholder'),
            }}
          />
        </div>
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

export default StepBirthInfo;
