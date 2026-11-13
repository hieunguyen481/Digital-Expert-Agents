import { describe, expect, it } from 'vitest';
import { sharedSources } from './ActionProposals';
import type { ActionProposal } from '@/services/agentCaseService';

const p = (evidence: unknown[]) => ({ evidence } as unknown as ActionProposal);
describe('sharedSources', () => {
  it('nguồn có ở từ hai thẻ gom thành một dòng chung', () => {
    const s = sharedSources([p([{ source: 'CS-TD-SME/2025 §3.1', quote: 'a' }, { source: 'X §9', quote: 'b' }]), p([{ source: 'CS-TD-SME/2025 §3.1', quote: 'c' }])]);
    expect(s).toEqual(['CS-TD-SME/2025 §3.1']);
  });
  it('một thẻ, evidence rỗng/undefined/chuỗi đều chịu được', () => {
    expect(sharedSources([p([{ source: 'A' }])])).toEqual([]);
    expect(sharedSources([p(undefined as unknown as unknown[]), p(['văn bản', 'văn bản'])])).toEqual([]);
    expect(sharedSources([p(['dòng một']), p(['dòng một'])])).toEqual(['dòng một']);
  });
});
