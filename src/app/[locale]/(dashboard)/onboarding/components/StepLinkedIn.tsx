'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SkipButton } from './SkipButton';
import { isValidLinkedInUrl } from '@/lib/schemas';

interface StepLinkedInProps {
  linkedinUrl: string;
  onLinkedInUrlChange: (url: string) => void;
  onImport: () => Promise<boolean>;
  onNext: () => void;
  onSkip: () => void;
  isImporting: boolean;
  importError: string | null;
}

export function StepLinkedIn({
  linkedinUrl,
  onLinkedInUrlChange,
  onImport,
  onNext,
  onSkip,
  isImporting,
  importError,
}: StepLinkedInProps) {
  const t = useTranslations('onboarding');
  const [hasImported, setHasImported] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleUrlChange = (url: string) => {
    onLinkedInUrlChange(url);
    setUrlError(null);
  };

  const handleImport = async () => {
    // Validate URL before importing
    if (!linkedinUrl.trim()) {
      setUrlError(t('linkedin.invalidUrl'));
      return;
    }

    if (!isValidLinkedInUrl(linkedinUrl)) {
      setUrlError(t('linkedin.invalidUrl'));
      return;
    }

    setUrlError(null);
    const success = await onImport();
    setHasImported(success);
  };

  const isValidUrl = linkedinUrl.trim() && isValidLinkedInUrl(linkedinUrl);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[#37352f] mb-2">
          {t('linkedin.title')}
        </h2>
        <p className="text-[#37352f]/60">
          {t('linkedin.description')}
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* URL Input */}
        <div className="relative">
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://linkedin.com/in/your-profile"
            className={`w-full px-4 py-3 border-2 rounded-xl
              focus:outline-none bg-white
              placeholder:text-[#37352f]/30 text-[#37352f]
              ${urlError || importError ? 'border-red-300 focus:border-red-400' : 'border-[#e3e2de] focus:border-[#0077cc]'}`}
          />
          {isValidUrl && !urlError && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
              ✓
            </span>
          )}
        </div>

        {(urlError || importError) && (
          <p className="text-red-500 text-sm text-center">{urlError || importError}</p>
        )}

        {hasImported && !importError && !urlError && (
          <p className="text-green-600 text-sm text-center">
            {t('linkedin.importSuccess')}
          </p>
        )}

        <button
          onClick={handleImport}
          disabled={!linkedinUrl.trim() || isImporting}
          className="w-full py-3 bg-[#0077cc] text-white rounded-xl font-medium
            hover:bg-[#0066b3] disabled:bg-[#e3e2de] disabled:text-[#37352f]/40
            disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isImporting ? (
            <>
              <span className="animate-spin">⏳</span>
              {t('linkedin.importing')}
            </>
          ) : (
            <>
              <span>✨</span>
              {t('linkedin.import')}
            </>
          )}
        </button>

        {/* Help text */}
        <p className="text-xs text-[#37352f]/50 text-center">
          Example: https://linkedin.com/in/johndoe
        </p>
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <SkipButton onClick={onSkip} />
        <button
          onClick={onNext}
          className="px-6 py-2 bg-[#37352f] text-white rounded-lg font-medium
            hover:bg-[#37352f]/90 transition-colors"
        >
          {t('next')}
        </button>
      </div>
    </div>
  );
}

export default StepLinkedIn;
