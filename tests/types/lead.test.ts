import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  RETRY_WORTHY_REASONS,
  TERMINAL_REASONS,
  OutreachSkipReason,
} from '../../src/types/lead.js';
import type { Lead, ScoreBand } from '../../src/index.js';

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

describe('Lead scoring fields', () => {
  it('carries an optional leadScore + scoreBand (tsc-guarded)', () => {
    // Pick<> forces the object to satisfy the REAL field types, so `tsc` (CI build)
    // fails if either field is removed/renamed/mistyped — the runtime assertions
    // alone can't guard a type-only change.
    const lead: Pick<Lead, 'leadScore' | 'scoreBand'> = { leadScore: 87, scoreBand: 'HOT' };
    expectTypeOf<Lead['scoreBand']>().toEqualTypeOf<ScoreBand | undefined>();
    expect(lead.scoreBand).toBe('HOT');
    expect(lead.leadScore).toBe(87);
  });
});
