'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number; // milliseconds per character
  delay?: number; // initial delay before starting
  onComplete?: () => void;
  className?: string;
  skipAnimation?: boolean;
}

/**
 * TypewriterText - Displays text with a typewriter animation effect
 *
 * Features:
 * - Configurable typing speed
 * - Initial delay support
 * - Completion callback
 * - Respects word boundaries for natural feel
 * - Skip animation option for returning users
 */
export function TypewriterText({
  text,
  speed = 30,
  delay = 0,
  onComplete,
  className = '',
  skipAnimation = false,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState(skipAnimation ? text : '');
  const [isComplete, setIsComplete] = useState(skipAnimation);
  const indexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const typeNextChunk = useCallback(() => {
    if (indexRef.current >= text.length) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    // Type 1-3 characters at a time for more natural feel
    const chunkSize = Math.random() > 0.7 ? 2 : 1;
    const endIndex = Math.min(indexRef.current + chunkSize, text.length);
    const newText = text.slice(0, endIndex);

    setDisplayedText(newText);
    indexRef.current = endIndex;

    // Variable speed for more natural feel
    // Slow down at punctuation
    const currentChar = text[endIndex - 1];
    let nextDelay = speed;
    if (['.', '!', '?', '。', '！', '？'].includes(currentChar)) {
      nextDelay = speed * 8; // Longer pause at sentence end
    } else if ([',', '，', '、'].includes(currentChar)) {
      nextDelay = speed * 3; // Medium pause at comma
    } else if (currentChar === ' ' || currentChar === '\n') {
      nextDelay = speed * 1.5; // Slight pause at word breaks
    }

    timeoutRef.current = setTimeout(typeNextChunk, nextDelay);
  }, [text, speed, onComplete]);

  useEffect(() => {
    if (skipAnimation) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    // Reset state when text changes
    indexRef.current = 0;
    setDisplayedText('');
    setIsComplete(false);

    // Start typing after delay
    timeoutRef.current = setTimeout(typeNextChunk, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, delay, skipAnimation, typeNextChunk, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5" />
      )}
    </span>
  );
}

/**
 * Enhanced typing indicator with persona name
 */
interface TypingIndicatorProps {
  name?: string;
  className?: string;
}

export function TypingIndicator({
  name = 'Nomi',
  className = '',
}: TypingIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-[#37352f]/60">{name} 正在输入</span>
      <div className="flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 bg-[#37352f]/40 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-[#37352f]/40 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-[#37352f]/40 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}

/**
 * Thinking indicator for when the AI is processing
 */
interface ThinkingIndicatorProps {
  message?: string;
  className?: string;
}

export function ThinkingIndicator({
  message = '正在思考...',
  className = '',
}: ThinkingIndicatorProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center gap-2 text-[#37352f]/60 ${className}`}>
      <div className="relative w-5 h-5">
        <div className="absolute inset-0 border-2 border-[#37352f]/20 rounded-full" />
        <div className="absolute inset-0 border-2 border-t-[#0077cc] rounded-full animate-spin" />
      </div>
      <span className="text-sm">
        {message}
        <span className="inline-block w-6 text-left">{dots}</span>
      </span>
    </div>
  );
}

export default TypewriterText;
