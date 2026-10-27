import { describe, it, expect } from 'vitest';
import { fromContainerLine, fromEvent, highlightParts, looksLikeStackTrace, maskText, maskValue, matchesFilter, normalizeLevel, toText } from './logs';

describe('normalizeLevel', () => {
  it.each([
    ['warning', 'WARN'],
    ['fatal', 'CRITICAL'],
    ['trace', 'DEBUG'],
    ['', 'INFO'],
  ])('%s → %s', (input, want) => expect(normalizeLevel(input)).toBe(want));
});

describe('masking', () => {
  it('hides credentials in text', () => {
    expect(maskText('dial postgres://app:hunter2@db/x')).toBe('dial postgres://app:***@db/x');
    expect(maskText('token=abc user=bob')).toBe('token=*** user=bob');
    expect(maskText('Authorization: Bearer abcdefghij123')).toBe('Authorization: Bearer ***');
  });
  it('hides secret fields in structures', () => {
    expect(maskValue({ password: 'x', nested: { dsn: 'p' }, rows: 3 })).toEqual({ password: '***', nested: { dsn: '***' }, rows: 3 });
  });
});

describe('fromContainerLine', () => {
  it('parses a Docker timestamp and a slog JSON line', () => {
    const e = fromContainerLine('2026-10-27T10:00:00.123456Z {"time":"2026-10-27T10:00:00.120Z","level":"ERROR","msg":"upload failed","run_id":"r1","secret_access_key":"x"}', 'worker-1', 1);
    expect(e).toMatchObject({ ts: '2026-10-27T10:00:00.120Z', level: 'ERROR', message: 'upload failed', runId: 'r1', source: 'worker-1' });
    expect(e.fields?.secret_access_key).toBe('***');
  });
  it('keeps plain text and guesses the level', () => {
    const e = fromContainerLine('2026-10-27T10:00:00Z WARN disk almost full', 'minio', 2);
    expect(e).toMatchObject({ level: 'WARN', message: 'WARN disk almost full' });
  });
});

describe('fromEvent', () => {
  it('keeps links and drops empty fields', () => {
    const e = fromEvent({ seq: 7, id: 'e', run_id: 'r', task_id: 't', ts: 'x', level: 'warn', message: 'm', fields_json: {}, job_id: 'j', worker_id: 'w' });
    expect(e).toMatchObject({ key: 'ev-7', level: 'WARN', runId: 'r', taskId: 't', jobId: 'j', workerId: 'w', source: 'task' });
    expect(e.fields).toBeUndefined();
  });
});

describe('helpers', () => {
  it('highlights every case-insensitive match', () => {
    expect(highlightParts('Error then error', 'ERROR')).toEqual([
      { text: 'Error', match: true },
      { text: ' then ', match: false },
      { text: 'error', match: true },
    ]);
  });
  it('detects stack traces', () => {
    expect(looksLikeStackTrace('panic: boom\n\ngoroutine 1 [running]:\nmain.main()')).toBe(true);
    expect(looksLikeStackTrace('one line')).toBe(false);
  });
  it('filters by level and keyword, including fields', () => {
    const e = fromEvent({ seq: 1, id: 'e', run_id: 'r', ts: 'x', level: 'ERROR', message: 'boom', fields_json: { table: 'orders' } });
    expect(matchesFilter(e, new Set(['ERROR']), 'ORDERS')).toBe(true);
    expect(matchesFilter(e, new Set(['INFO']), '')).toBe(false);
  });
  it('exports readable text', () => {
    const e = fromEvent({ seq: 1, id: 'e', run_id: 'r1', ts: '2026-10-27T10:00:00Z', level: 'INFO', message: 'hi' });
    expect(toText([e])).toBe('2026-10-27T10:00:00Z INFO     [run] hi (run=r1)');
  });
});
