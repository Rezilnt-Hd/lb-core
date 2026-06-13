import { describe, it, expect } from 'vitest';
import type { ExistingSite, Lead } from '../../src/index.js';

describe('ExistingSite type', () => {
  it('attaches to a Lead and round-trips the documented facets', () => {
    const existingSite: ExistingSite = {
      scrapedAt: '2026-06-13T00:00:00.000Z',
      url: 'https://example.com',
      discovered: false,
      services: ['lawn care', 'irrigation'],
      about: 'Family-owned since 2010.',
      headline: 'Charlotte Landscaping',
      metaDescription: 'Top-rated landscaping.',
      rawMarkdown: '# Example',
    };
    const lead = { slug: 's', existingSite } as unknown as Lead;
    expect(lead.existingSite?.services).toEqual(['lawn care', 'irrigation']);
  });

  it('accepts a cached openingLine for Phase 3 outreach', () => {
    const fields: Pick<Lead, 'openingLine'> = { openingLine: 'Saw your new patio service.' };
    expect(fields.openingLine).toBe('Saw your new patio service.');
  });
});
