import { describe, it, expect, vi } from 'vitest';
import { extractJSON, withTimeout, LLM_TIMEOUT_MS } from './claude';

describe('extractJSON', () => {
  it('parses plain JSON', () => {
    const json = '{"key": "value", "number": 42}';
    const result = extractJSON(json);
    expect(result).toEqual({ key: 'value', number: 42 });
  });

  it('extracts JSON from markdown code block', () => {
    const text = `Here's the response:

\`\`\`json
{"summary": "Test summary", "score": 0.85}
\`\`\`

That's all!`;
    const result = extractJSON(text);
    expect(result).toEqual({ summary: 'Test summary', score: 0.85 });
  });

  it('extracts JSON from markdown code block without json tag', () => {
    const text = `\`\`\`
{"data": [1, 2, 3]}
\`\`\``;
    const result = extractJSON(text);
    expect(result).toEqual({ data: [1, 2, 3] });
  });

  it('extracts JSON object from surrounding text', () => {
    const text = `The analysis shows {"result": "success", "confidence": 0.95} which is good.`;
    const result = extractJSON(text);
    expect(result).toEqual({ result: 'success', confidence: 0.95 });
  });

  it('handles nested objects', () => {
    const json = '{"outer": {"inner": {"deep": true}}, "array": [1, 2, {"nested": "value"}]}';
    const result = extractJSON(json);
    expect(result).toEqual({
      outer: { inner: { deep: true } },
      array: [1, 2, { nested: 'value' }],
    });
  });

  it('throws on invalid JSON', () => {
    expect(() => extractJSON('not json at all')).toThrow('Could not extract valid JSON');
  });

  it('throws on malformed JSON', () => {
    expect(() => extractJSON('{"incomplete": ')).toThrow('Could not extract valid JSON');
  });
});

describe('withTimeout', () => {
  it('resolves when promise completes before timeout', async () => {
    const fastPromise = Promise.resolve('success');
    const result = await withTimeout(fastPromise, 1000, 'test');
    expect(result).toBe('success');
  });

  it('rejects when promise exceeds timeout', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(() => resolve('late'), 200));
    await expect(withTimeout(slowPromise, 50, 'test')).rejects.toThrow('test timed out after 50ms');
  });

  it('passes through promise rejections', async () => {
    const failingPromise = Promise.reject(new Error('Original error'));
    await expect(withTimeout(failingPromise, 1000, 'test')).rejects.toThrow('Original error');
  });

  it('works with async functions', async () => {
    const asyncFn = async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 'async result';
    };
    const result = await withTimeout(asyncFn(), 1000, 'async test');
    expect(result).toBe('async result');
  });
});

describe('LLM_TIMEOUT_MS', () => {
  it('is set to 30 seconds', () => {
    expect(LLM_TIMEOUT_MS).toBe(30000);
  });
});
