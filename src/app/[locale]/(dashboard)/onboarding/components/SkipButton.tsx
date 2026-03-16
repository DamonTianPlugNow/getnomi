'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface SkipButtonProps {
  onClick: () => void;
  className?: string;
}

export function SkipButton({ onClick, className = '' }: SkipButtonProps) {
  const t = useTranslations('onboarding');

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm text-[#37352f]/60 hover:text-[#37352f]
        hover:bg-[#f7f6f3] rounded-lg transition-colors ${className}`}
    >
      {t('skip')}
    </button>
  );
}

export default SkipButton;
