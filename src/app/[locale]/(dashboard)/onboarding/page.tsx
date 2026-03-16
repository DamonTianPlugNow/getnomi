'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import {
  OnboardingProgress,
  StepLinkedIn,
  StepBirthInfo,
  StepEducation,
  StepWork,
  StepComplete,
  ImportConfirmDialog,
  type EducationEntry,
  type WorkEntry,
} from './components';
import type { TimelineEvent, CreateTimelineEventInput } from '@/types/database';

const STORAGE_KEY = 'nomi_onboarding_timeline_state';
const STORAGE_VERSION = 2; // Increment when schema changes
const TOTAL_STEPS = 4;

interface OnboardingState {
  currentStep: number;
  linkedinUrl: string;
  birthData: {
    year: string;
    month: string;
    day: string;
    province: string;
    city: string;
  };
  educationData: EducationEntry[];
  workData: WorkEntry[];
}

interface StoredOnboardingState {
  version: number;
  data: OnboardingState;
}

const initialState: OnboardingState = {
  currentStep: 1,
  linkedinUrl: '',
  birthData: {
    year: '',
    month: '',
    day: '',
    province: '',
    city: '',
  },
  educationData: [],
  workData: [],
};

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations('onboarding');

  const [state, setState] = useState<OnboardingState>(initialState);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [showComplete, setShowComplete] = useState(false);
  const [enrichmentWarning, setEnrichmentWarning] = useState<string | null>(null);

  // P0-2: Idempotency protection - ref to prevent double submissions
  const isSubmittingRef = useRef(false);

  // P2-1: LinkedIn import merge logic states
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{
    education: EducationEntry[];
    work: WorkEntry[];
  } | null>(null);

  // P1-4: Save state to localStorage with version control
  const saveState = useCallback((newState: OnboardingState) => {
    try {
      const stored: StoredOnboardingState = {
        version: STORAGE_VERSION,
        data: newState,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* ignore */
    }
  }, []);

  // P1-4: Load state from localStorage with version check
  const loadState = useCallback((): OnboardingState | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed: StoredOnboardingState = JSON.parse(stored);

      // Version mismatch - clear old data
      if (parsed.version !== STORAGE_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return parsed.data;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }, []);

  // Clear state
  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Initialize
  useEffect(() => {
    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Check if already completed onboarding
      const { data: existingProfile } = await supabase
        .from('memory_profiles')
        .select('id, onboarding_completed_at')
        .eq('user_id', user.id)
        .single();

      if (existingProfile?.onboarding_completed_at) {
        clearState();
        router.push('/dashboard');
        return;
      }

      // Load saved state
      const storedState = loadState();
      if (storedState) {
        setState(storedState);
      }

      setIsInitialized(true);
    }
    initialize();
  }, [supabase, router, loadState, clearState]);

  // Update state and save
  const updateState = useCallback(
    (updates: Partial<OnboardingState>) => {
      setState((prev) => {
        const newState = { ...prev, ...updates };
        saveState(newState);
        return newState;
      });
    },
    [saveState]
  );

  // Apply import data (helper function)
  const applyImportData = useCallback(
    (data: { education: EducationEntry[]; work: WorkEntry[] }) => {
      updateState({
        educationData: data.education,
        workData: data.work,
      });
    },
    [updateState]
  );

  // P2-1: LinkedIn import with merge logic
  const handleLinkedInImport = async (): Promise<boolean> => {
    if (!state.linkedinUrl || !state.linkedinUrl.trim()) return false;

    setIsImporting(true);
    setImportError(null);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for API call

    try {
      const response = await fetch('/api/linkedin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinUrl: state.linkedinUrl }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Import failed');
      }

      const data = await response.json();

      // Transform imported data
      const importedEducation: EducationEntry[] = (data.education || []).map(
        (edu: { type: string; startYear: string; endYear: string; school: string; major?: string }) => ({
          type: edu.type as EducationEntry['type'],
          startYear: edu.startYear || '',
          endYear: edu.endYear || '',
          province: '',
          city: '',
          school: edu.school || '',
          major: edu.major || '',
        })
      );

      const importedWork: WorkEntry[] = (data.work || []).map(
        (work: {
          startYear: string;
          endYear: string;
          company: string;
          position: string;
          description?: string;
          isCurrent?: boolean;
        }) => ({
          startYear: work.startYear || '',
          endYear: work.endYear || '',
          isCurrent: work.isCurrent || false,
          province: '',
          city: '',
          company: work.company || '',
          position: work.position || '',
          description: work.description || '',
        })
      );

      // Check if there's existing data
      const hasExistingData = state.educationData.length > 0 || state.workData.length > 0;
      const hasImportData = importedEducation.length > 0 || importedWork.length > 0;

      if (hasExistingData && hasImportData) {
        // Show confirmation dialog
        setPendingImportData({ education: importedEducation, work: importedWork });
        setShowImportConfirm(true);
        return true; // Import succeeded, waiting for user decision
      }

      // No conflict, apply directly
      applyImportData({ education: importedEducation, work: importedWork });
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('LinkedIn import error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        setImportError('Request timed out. Please try again.');
      } else {
        setImportError(error instanceof Error ? error.message : 'Import failed');
      }
      return false;
    } finally {
      setIsImporting(false);
    }
  };

  // P2-1: Handle import confirmation (replace or merge)
  const handleImportConfirm = (mode: 'replace' | 'merge') => {
    if (!pendingImportData) return;

    if (mode === 'replace') {
      applyImportData(pendingImportData);
    } else {
      // Merge: keep existing + deduplicate and append new
      const mergedEducation = [...state.educationData];
      const mergedWork = [...state.workData];

      pendingImportData.education.forEach((edu) => {
        // Check for duplicates by school and startYear
        if (!mergedEducation.some((e) => e.school === edu.school && e.startYear === edu.startYear)) {
          mergedEducation.push(edu);
        }
      });

      pendingImportData.work.forEach((work) => {
        // Check for duplicates by company and startYear
        if (!mergedWork.some((w) => w.company === work.company && w.startYear === work.startYear)) {
          mergedWork.push(work);
        }
      });

      updateState({ educationData: mergedEducation, workData: mergedWork });
    }

    setShowImportConfirm(false);
    setPendingImportData(null);
  };

  // Build timeline events from form data
  const buildTimelineEvents = useCallback((): CreateTimelineEventInput[] => {
    const events: CreateTimelineEventInput[] = [];

    // Birth event
    if (state.birthData.year) {
      events.push({
        event_type: 'birth',
        start_year: parseInt(state.birthData.year) || undefined,
        start_month: parseInt(state.birthData.month) || undefined,
        start_day: parseInt(state.birthData.day) || undefined,
        province: state.birthData.province || undefined,
        city: state.birthData.city || undefined,
        title: t('timeline.birth'),
        source: 'onboarding',
      });
    }

    // Education events
    state.educationData.forEach((edu) => {
      if (edu.school || edu.startYear) {
        const eventType = `education_${edu.type}` as CreateTimelineEventInput['event_type'];
        events.push({
          event_type: eventType,
          start_year: parseInt(edu.startYear) || undefined,
          end_year: parseInt(edu.endYear) || undefined,
          province: edu.province || undefined,
          city: edu.city || undefined,
          title: t(`education.types.${edu.type}`),
          institution: edu.school || undefined,
          description: edu.major || undefined,
          source: 'onboarding',
        });
      }
    });

    // Work events
    state.workData.forEach((work) => {
      if (work.company || work.position) {
        events.push({
          event_type: 'work',
          start_year: parseInt(work.startYear) || undefined,
          end_year: work.isCurrent ? undefined : parseInt(work.endYear) || undefined,
          is_current: work.isCurrent,
          province: work.province || undefined,
          city: work.city || undefined,
          title: work.position || t('work.experienceLabel'),
          institution: work.company || undefined,
          position: work.position || undefined,
          description: work.description || undefined,
          source: 'onboarding',
        });
      }
    });

    return events;
  }, [state, t]);

  // Complete onboarding
  const handleComplete = async () => {
    // P0-2: Idempotency protection - prevent double submissions
    if (isSubmittingRef.current) return;

    // P2-2: Check if there's any data
    const hasAnyData =
      state.birthData.year ||
      state.educationData.length > 0 ||
      state.workData.length > 0 ||
      state.linkedinUrl;

    if (!hasAnyData) {
      setCompleteError(t('errors.emptyProfile'));
      return;
    }

    isSubmittingRef.current = true;
    setIsCompleting(true);
    setCompleteError(null);

    try {
      const events = buildTimelineEvents();

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedinUrl: state.linkedinUrl || undefined,
          birthDate:
            state.birthData.year && state.birthData.month && state.birthData.day
              ? `${state.birthData.year}-${state.birthData.month.padStart(2, '0')}-${state.birthData.day.padStart(2, '0')}`
              : undefined,
          birthProvince: state.birthData.province || undefined,
          birthCity: state.birthData.city || undefined,
          timelineEvents: events,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      const data = await response.json();
      setTimelineEvents(data.timelineEvents || []);

      // P2-3: Handle AI enrichment warning
      if (data.warning) {
        setEnrichmentWarning(data.warning);
      }

      setIsCompleting(false); // Stop loading spinner before showing complete page
      setShowComplete(true);
      clearState();
    } catch (error) {
      console.error('Complete error:', error);
      setCompleteError(t('errors.completeFailed'));
      setIsCompleting(false);
      isSubmittingRef.current = false;
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (state.currentStep < TOTAL_STEPS) {
      updateState({ currentStep: state.currentStep + 1 });
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      updateState({ currentStep: state.currentStep - 1 });
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  // Education handlers
  const handleAddEducation = (type: EducationEntry['type']) => {
    const newEntry: EducationEntry = {
      type,
      startYear: '',
      endYear: '',
      province: '',
      city: '',
      school: '',
      major: '',
    };
    updateState({ educationData: [...state.educationData, newEntry] });
  };

  const handleRemoveEducation = (index: number) => {
    const newData = state.educationData.filter((_, i) => i !== index);
    updateState({ educationData: newData });
  };

  const handleEducationChange = (index: number, field: keyof EducationEntry, value: string) => {
    const newData = [...state.educationData];
    newData[index] = { ...newData[index], [field]: value };
    updateState({ educationData: newData });
  };

  // Work handlers
  const handleAddWork = () => {
    const newEntry: WorkEntry = {
      startYear: '',
      endYear: '',
      isCurrent: false,
      province: '',
      city: '',
      company: '',
      position: '',
      description: '',
    };
    updateState({ workData: [...state.workData, newEntry] });
  };

  const handleRemoveWork = (index: number) => {
    const newData = state.workData.filter((_, i) => i !== index);
    updateState({ workData: newData });
  };

  const handleWorkChange = (index: number, field: keyof WorkEntry, value: string | boolean) => {
    const newData = [...state.workData];
    newData[index] = { ...newData[index], [field]: value };
    updateState({ workData: newData });
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#0077cc] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#37352f]">
      {/* Header */}
      <header className="border-b border-[#e3e2de]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#37352f] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-semibold text-[#37352f]">Nomi</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {showComplete ? (
          <>
            <StepComplete timelineEvents={timelineEvents} isLoading={isCompleting} />
            {enrichmentWarning && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 text-center">
                {enrichmentWarning}
              </div>
            )}
          </>
        ) : (
          <>
            <OnboardingProgress currentStep={state.currentStep} totalSteps={TOTAL_STEPS} />

            {completeError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
                {completeError}
              </div>
            )}

            {state.currentStep === 1 && (
              <StepLinkedIn
                linkedinUrl={state.linkedinUrl}
                onLinkedInUrlChange={(url) => updateState({ linkedinUrl: url })}
                onImport={handleLinkedInImport}
                onNext={handleNext}
                onSkip={handleSkip}
                isImporting={isImporting}
                importError={importError}
              />
            )}

            {state.currentStep === 2 && (
              <StepBirthInfo
                birthData={state.birthData}
                onBirthDataChange={(field, value) =>
                  updateState({
                    birthData: { ...state.birthData, [field]: value },
                  })
                }
                onNext={handleNext}
                onSkip={handleSkip}
                onBack={handleBack}
              />
            )}

            {state.currentStep === 3 && (
              <StepEducation
                educationData={state.educationData}
                onEducationChange={handleEducationChange}
                onAddEducation={handleAddEducation}
                onRemoveEducation={handleRemoveEducation}
                onNext={handleNext}
                onSkip={handleSkip}
                onBack={handleBack}
              />
            )}

            {state.currentStep === 4 && (
              <StepWork
                workData={state.workData}
                onWorkChange={handleWorkChange}
                onAddWork={handleAddWork}
                onRemoveWork={handleRemoveWork}
                onNext={handleComplete}
                onSkip={handleSkip}
                onBack={handleBack}
              />
            )}
          </>
        )}
      </main>

      {/* P2-1: Import confirmation dialog */}
      <ImportConfirmDialog
        isOpen={showImportConfirm}
        onClose={() => {
          setShowImportConfirm(false);
          setPendingImportData(null);
        }}
        onConfirm={handleImportConfirm}
        existingCount={{
          education: state.educationData.length,
          work: state.workData.length,
        }}
        importCount={{
          education: pendingImportData?.education.length || 0,
          work: pendingImportData?.work.length || 0,
        }}
      />

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
