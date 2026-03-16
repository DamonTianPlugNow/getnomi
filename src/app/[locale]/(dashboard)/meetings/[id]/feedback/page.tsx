'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

interface MeetingData {
  id: string;
  status: string;
  scheduled_at: string;
  user_a_id: string;
  user_b_id: string;
  user_a: { id: string; name: string; avatar_url: string | null };
  user_b: { id: string; name: string; avatar_url: string | null };
}

export default function FeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const meetingId = params.id as string;
  const locale = params.locale as string;
  const t = useTranslations();

  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Feedback form state
  const [didMeet, setDidMeet] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [wouldMeetAgain, setWouldMeetAgain] = useState<boolean | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const highlightOptions = [
    { value: 'great_conversation', label: t('feedback.highlights.great_conversation') },
    { value: 'shared_interests', label: t('feedback.highlights.shared_interests') },
    { value: 'valuable_insights', label: t('feedback.highlights.valuable_insights') },
    { value: 'potential_collaboration', label: t('feedback.highlights.potential_collaboration') },
    { value: 'friendly_vibe', label: t('feedback.highlights.friendly_vibe') },
    { value: 'learned_something', label: t('feedback.highlights.learned_something') },
  ];

  useEffect(() => {
    const fetchMeeting = async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/${locale}/login`);
        return;
      }
      setCurrentUserId(user.id);

      // Check if already submitted feedback
      const { data: existingFeedback } = await supabase
        .from('feedback')
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id)
        .single();

      if (existingFeedback) {
        setAlreadySubmitted(true);
        setLoading(false);
        return;
      }

      // Fetch meeting
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          user_a:users!user_a_id(id, name, avatar_url),
          user_b:users!user_b_id(id, name, avatar_url)
        `)
        .eq('id', meetingId)
        .single();

      if (error || !data) {
        setError(t('feedback.notFound'));
        setLoading(false);
        return;
      }

      // Verify user is part of this meeting
      if (data.user_a_id !== user.id && data.user_b_id !== user.id) {
        setError(t('feedback.notAuthorized'));
        setLoading(false);
        return;
      }

      setMeeting(data);
      setLoading(false);
    };

    fetchMeeting();
  }, [meetingId, router, locale, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (didMeet === null) {
      setError(t('feedback.selectDidMeet'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/meeting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meetingId,
          action: 'feedback',
          feedback: {
            did_meet: didMeet,
            rating: didMeet ? rating : null,
            would_meet_again: didMeet ? wouldMeetAgain : null,
            highlights: didMeet ? highlights : [],
            notes: notes || null,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('feedback.submitError'));
      }

      router.push(`/${locale}/meetings?feedback=success`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('feedback.submitError'));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">{t('feedback.alreadySubmitted')}</h1>
          <p className="text-slate-600 mb-4">{t('feedback.thanksMessage')}</p>
          <Link href={`/${locale}/meetings`} className="text-blue-600 hover:underline">
            {t('feedback.backToMeetings')}
          </Link>
        </div>
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">{error}</h1>
          <Link href={`/${locale}/meetings`} className="text-blue-600 hover:underline">
            {t('feedback.backToMeetings')}
          </Link>
        </div>
      </div>
    );
  }

  const isUserA = meeting?.user_a_id === currentUserId;
  const otherUser = isUserA ? meeting?.user_b : meeting?.user_a;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/${locale}/meetings`} className="text-slate-500 hover:text-slate-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">{t('feedback.title')}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Meeting Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
              {otherUser?.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.name || ''}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-lg font-medium text-slate-500">
                  {otherUser?.name?.[0] || '?'}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{otherUser?.name || 'Unknown'}</h2>
              <p className="text-sm text-slate-500">
                {meeting && new Date(meeting.scheduled_at).toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Did Meet */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{t('feedback.didMeetQuestion')}</h3>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setDidMeet(true)}
                className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                  didMeet === true
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t('feedback.yesMet')}
              </button>
              <button
                type="button"
                onClick={() => setDidMeet(false)}
                className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                  didMeet === false
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t('feedback.didNotMeet')}
              </button>
            </div>
          </div>

          {/* Rating (only if met) */}
          {didMeet === true && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">{t('feedback.ratingQuestion')}</h3>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-2 transition-transform hover:scale-110"
                    >
                      <svg
                        className={`w-10 h-10 ${
                          star <= rating ? 'text-yellow-400' : 'text-slate-200'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-slate-500 mt-2">
                  {t(`feedback.ratingLabels.${rating}`)}
                </p>
              </div>

              {/* Would Meet Again */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">{t('feedback.wouldMeetAgainQuestion')}</h3>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setWouldMeetAgain(true)}
                    className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                      wouldMeetAgain === true
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {t('feedback.wouldMeetAgainYes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWouldMeetAgain(false)}
                    className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                      wouldMeetAgain === false
                        ? 'border-slate-500 bg-slate-50 text-slate-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {t('feedback.wouldMeetAgainNo')}
                  </button>
                </div>
              </div>

              {/* Highlights */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">{t('feedback.highlightsQuestion')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {highlightOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setHighlights((prev) =>
                          prev.includes(option.value)
                            ? prev.filter((h) => h !== option.value)
                            : [...prev, option.value]
                        );
                      }}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                        highlights.includes(option.value)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">
              {didMeet === false ? t('feedback.notesQuestionNoShow') : t('feedback.notesQuestion')}
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={didMeet === false ? t('feedback.notesPlaceholderNoShow') : t('feedback.notesPlaceholder')}
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || didMeet === null}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t('feedback.submitting') : t('feedback.submit')}
          </button>
        </form>
      </main>
    </div>
  );
}
