import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractJSON, withTimeout } from './claude';

// We'll test extractJSON and withTimeout directly
// handleOnboardingChat requires more complex mocking that we'll skip for now

describe('extractJSON', () => {
  it('parses valid JSON directly', () => {
    const result = extractJSON('{"reply": "hello", "extracted": {}, "isComplete": false}');
    expect(result).toEqual({ reply: 'hello', extracted: {}, isComplete: false });
  });

  it('extracts JSON from markdown code block', () => {
    const input = 'Here is the response:\n```json\n{"reply": "hi"}\n```';
    const result = extractJSON(input);
    expect(result).toEqual({ reply: 'hi' });
  });

  it('extracts JSON object from mixed text', () => {
    const input = 'Some text before {"reply": "test"} and after';
    const result = extractJSON(input);
    expect(result).toEqual({ reply: 'test' });
  });

  it('throws error for invalid JSON', () => {
    expect(() => extractJSON('not json at all')).toThrow('Could not extract valid JSON');
  });

  it('throws error for malformed JSON', () => {
    expect(() => extractJSON('{"broken": ')).toThrow('Could not extract valid JSON');
  });

  it('handles nested JSON objects', () => {
    const input = '{"reply": "hi", "extracted": {"name": "张三", "skills": ["a", "b"]}}';
    const result = extractJSON(input) as { reply: string; extracted: { name: string; skills: string[] } };
    expect(result.extracted.name).toBe('张三');
    expect(result.extracted.skills).toEqual(['a', 'b']);
  });

  it('extracts JSON from code block without json tag', () => {
    const input = '```\n{"reply": "test"}\n```';
    const result = extractJSON(input);
    expect(result).toEqual({ reply: 'test' });
  });
});

describe('withTimeout', () => {
  it('resolves if promise completes before timeout', async () => {
    const promise = Promise.resolve('success');
    const result = await withTimeout(promise, 1000, 'test');
    expect(result).toBe('success');
  });

  it('rejects if promise takes longer than timeout', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(() => resolve('late'), 100));
    await expect(withTimeout(slowPromise, 10, 'test')).rejects.toThrow('test timed out after 10ms');
  });

  it('preserves the resolved value type', async () => {
    const promise = Promise.resolve({ data: 123 });
    const result = await withTimeout(promise, 1000, 'test');
    expect(result).toEqual({ data: 123 });
  });

  it('preserves rejection errors', async () => {
    const promise = Promise.reject(new Error('original error'));
    await expect(withTimeout(promise, 1000, 'test')).rejects.toThrow('original error');
  });
});
