import { describe, expect, it } from 'vitest';
import { fmtDayTime, fmtDec, fmtInt, fmtPct, fmtSec, fmtUsd } from './format';
import { modelName } from './glossary';

describe('định dạng vi-VN dùng chung', () => {
  it('số, phần trăm, USD, giây', () => {
    expect(fmtInt(8741)).toBe('8.741');
    expect(fmtDec(40.6)).toBe('40,6');
    expect(fmtPct(0.456)).toBe('45,6%');
    expect(fmtUsd(0.0032)).toBe('0,0032 USD');
    expect(fmtSec(40.6)).toBe('40,6 giây');
    expect(fmtSec(0.01)).toBe('dưới 0,1 giây');
    expect(fmtSec(66)).toBe('1 phút 6 giây');
  });
  it('ngày giờ theo múi giờ Việt Nam', () => {
    expect(fmtDayTime('2026-11-09T18:18:00Z')).toBe('10/11/2026 01:18');
  });
  it('tên model', () => {
    expect(modelName('openai/gpt-6-luna')).toBe('GPT-6 Luna (OpenAI)');
    expect(modelName('anthropic/claude-sonnet-5')).toBe('Claude Sonnet 5 (Anthropic)');
    expect(modelName('local-model')).toBe('local-model');
  });
});
