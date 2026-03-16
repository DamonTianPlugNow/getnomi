'use client';

import React, { useCallback, useMemo } from 'react';

interface FillInBlankProps {
  template: string;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
  placeholders?: Record<string, string>;
  inputWidths?: Record<string, string>;
}

/**
 * FillInBlank component for template-based form inputs
 *
 * Template format: "我出生于（__year__）年（__month__）月（__day__）日"
 * or: "I was born on (__month__)/(__day__)/(__year__)"
 * Values: { year: '1990', month: '5', day: '15' }
 */
export function FillInBlank({
  template,
  values,
  onChange,
  placeholders = {},
  inputWidths = {},
}: FillInBlankProps) {
  // Parse the template into segments (text and field placeholders)
  // Support formats: （__field__）, (__field__), __field__
  const segments = useMemo(() => {
    const result: Array<{ type: 'text' | 'field'; content: string; bracketType: 'full' | 'half' | 'none' }> = [];
    // Match: （__field__）, (__field__), or standalone __field__
    const regex = /(?:（__(\w+)__）|\(__(\w+)__\)|__(\w+)__)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(template)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        result.push({
          type: 'text',
          content: template.slice(lastIndex, match.index),
          bracketType: 'none',
        });
      }
      // Add the field placeholder - match[1] is full-width, match[2] is half-width, match[3] is no bracket
      const fieldName = match[1] || match[2] || match[3];
      const bracketType = match[1] ? 'full' : match[2] ? 'half' : 'none';
      result.push({
        type: 'field',
        content: fieldName,
        bracketType,
      });
      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < template.length) {
      result.push({
        type: 'text',
        content: template.slice(lastIndex),
        bracketType: 'none',
      });
    }

    return result;
  }, [template]);

  const handleChange = useCallback(
    (field: string, value: string) => {
      onChange(field, value);
    },
    [onChange]
  );

  const getInputWidth = (field: string): string => {
    if (inputWidths[field]) return inputWidths[field];
    // Default widths based on field type
    if (field.includes('year')) return 'w-20';
    if (field.includes('month') || field.includes('day')) return 'w-14';
    if (field.includes('province') || field.includes('city')) return 'w-28';
    return 'w-32';
  };

  return (
    <div className="flex flex-wrap items-center gap-1 text-lg leading-relaxed">
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <span key={index} className="text-[#37352f]">
              {segment.content}
            </span>
          );
        }

        const field = segment.content;
        const value = values[field] || '';
        const placeholder = placeholders[field] || '';
        const width = getInputWidth(field);
        const openBracket = segment.bracketType === 'full' ? '（' : segment.bracketType === 'half' ? '(' : '';
        const closeBracket = segment.bracketType === 'full' ? '）' : segment.bracketType === 'half' ? ')' : '';

        return (
          <span key={index} className="inline-flex items-center">
            <span className="text-[#37352f]">{openBracket}</span>
            <input
              type="text"
              value={value}
              placeholder={placeholder}
              onChange={(e) => handleChange(field, e.target.value)}
              className={`${width} px-2 py-1 text-center border-b-2 border-[#e3e2de]
                focus:border-[#0077cc] focus:outline-none bg-transparent
                placeholder:text-[#37352f]/30 text-[#37352f] transition-colors`}
            />
            <span className="text-[#37352f]">{closeBracket}</span>
          </span>
        );
      })}
    </div>
  );
}

export default FillInBlank;
