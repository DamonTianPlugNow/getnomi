'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

const STEP_ICONS = ['🔗', '🎂', '🎓', '💼'];

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const t = useTranslations('onboarding');

  const stepLabels = [
    t('steps.linkedin'),
    t('steps.birth'),
    t('steps.education'),
    t('steps.work'),
  ];

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      {/* Progress bar */}
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-[#e3e2de]" />

        {/* Progress line */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-[#0077cc] transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />

        {/* Step indicators */}
        <div className="relative flex justify-between">
          {stepLabels.map((label, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isPending = stepNumber > currentStep;

            return (
              <div key={index} className="flex flex-col items-center">
                {/* Step circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                    transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#0077cc] text-white'
                      : isCurrent
                      ? 'bg-[#0077cc] text-white ring-4 ring-[#0077cc]/20'
                      : 'bg-[#f7f6f3] text-[#37352f]/40 border-2 border-[#e3e2de]'
                  }`}
                >
                  {isCompleted ? '✓' : STEP_ICONS[index]}
                </div>

                {/* Step label */}
                <span
                  className={`mt-2 text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'text-[#0077cc]'
                      : isCompleted
                      ? 'text-[#37352f]'
                      : 'text-[#37352f]/40'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default OnboardingProgress;
