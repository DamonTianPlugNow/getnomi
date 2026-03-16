'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface ImportConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: 'replace' | 'merge') => void;
  existingCount: { education: number; work: number };
  importCount: { education: number; work: number };
}

export function ImportConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  existingCount,
  importCount,
}: ImportConfirmDialogProps) {
  const t = useTranslations('onboarding');

  if (!isOpen) return null;

  const totalExisting = existingCount.education + existingCount.work;
  const totalImport = importCount.education + importCount.work;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl animate-fadeIn">
        <h3 className="text-lg font-semibold text-[#37352f] mb-3">
          {t('linkedin.importConflict.title')}
        </h3>
        <p className="text-[#37352f]/70 mb-4">
          {t('linkedin.importConflict.description', {
            existing: totalExisting,
            importing: totalImport,
          })}
        </p>

        <div className="space-y-2 mb-6">
          {existingCount.education > 0 && (
            <div className="text-sm text-[#37352f]/60">
              {t('linkedin.importConflict.existingEducation', { count: existingCount.education })}
            </div>
          )}
          {existingCount.work > 0 && (
            <div className="text-sm text-[#37352f]/60">
              {t('linkedin.importConflict.existingWork', { count: existingCount.work })}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onConfirm('replace')}
            className="flex-1 px-4 py-2.5 bg-[#0077cc] text-white rounded-lg font-medium
              hover:bg-[#0066b3] transition-colors"
          >
            {t('linkedin.importConflict.replace')}
          </button>
          <button
            onClick={() => onConfirm('merge')}
            className="flex-1 px-4 py-2.5 bg-[#37352f] text-white rounded-lg font-medium
              hover:bg-[#37352f]/90 transition-colors"
          >
            {t('linkedin.importConflict.merge')}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-[#e3e2de] text-[#37352f] rounded-lg font-medium
              hover:bg-[#f7f6f3] transition-colors"
          >
            {t('linkedin.importConflict.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportConfirmDialog;
