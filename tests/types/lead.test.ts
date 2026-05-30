import { describe, it, expect } from 'vitest';
import {
  RETRY_WORTHY_REASONS,
  TERMINAL_REASONS,
  OutreachSkipReason,
} from '../../src/types/lead.js';

describe('OutreachSkipReason constants', () => {
  it('retry-worthy and terminal sets are disjoint', () => {
    for (const r of RETRY_WORTHY_REASONS) {
      expect(TERMINAL_REASONS).not.toContain(r);
    }
  });

  it('union of the two sets exhausts the OutreachSkipReason type', () => {
    const union = new Set<OutreachSkipReason>([...RETRY_WORTHY_REASONS, ...TERMINAL_REASONS]);
    const expected: OutreachSkipReason[] = [
      'franchise-filtered', 'niche-unmapped', 'instantly-5xx', 'instantly-429',
      'instantly-4xx-perma', 'missing-required-fields', 'dispatch-error',
    ];
    for (const r of expected) {
      expect(union.has(r)).toBe(true);
    }
    expect(union.size).toBe(expected.length);
  });
});
