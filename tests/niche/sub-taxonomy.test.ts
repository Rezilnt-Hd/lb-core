import { describe, it, expect } from 'vitest';
import {
  getNicheProfile,
  getNichesByParent,
  isContentSupported,
} from '../../src/niche/registry.js';

describe('niche sub-taxonomy (PR-A)', () => {
  it('resolves a new sub-niche with category/schema/parent/context', () => {
    const p = getNicheProfile('landscape design');
    expect(p).not.toBeNull();
    expect(p!.category).toBe('home-improvement');
    expect(p!.schemaType).toBe('HomeAndConstructionBusiness');
    expect(p!.parent).toBe('landscaping');
    expect(p!.context).toBeTruthy();
    expect(p!.aliases).toContain('landscape design');
    expect(isContentSupported('landscape design')).toBe(true);
  });

  it('extends an existing landscaping key in place (lawn care keeps outdoor, gains parent + context)', () => {
    const p = getNicheProfile('lawn care');
    expect(p).not.toBeNull();
    expect(p!.category).toBe('outdoor'); // surgical: category unchanged
    expect(p!.schemaType).toBe('HomeAndConstructionBusiness');
    expect(p!.parent).toBe('landscaping');
    expect(p!.context).toMatch(/mowing/i); // now content-supported
    expect(isContentSupported('lawn care')).toBe(true);
  });

  it('keeps an existing coarse key resolving unchanged (plumbing → emergency/Plumber, no parent)', () => {
    const p = getNicheProfile('plumbing');
    expect(p).not.toBeNull();
    expect(p!.category).toBe('emergency');
    expect(p!.schemaType).toBe('Plumber');
    expect(p!.parent).toBeUndefined();
  });

  it('registers plumbing sub-niches with the correct buyer-intent categories', () => {
    expect(getNicheProfile('residential plumbing')!.category).toBe('emergency');
    expect(getNicheProfile('commercial plumbing')!.category).toBe('general-trade');
    expect(getNicheProfile('water heater service')!.category).toBe('home-improvement');
    expect(getNicheProfile('residential plumbing')!.schemaType).toBe('Plumber');
    expect(getNicheProfile('residential plumbing')!.parent).toBe('plumbing');
  });

  it('registers roofing/hvac/electrical sub-niches with parent + schema', () => {
    expect(getNicheProfile('metal roofing')!.parent).toBe('roofing');
    expect(getNicheProfile('metal roofing')!.schemaType).toBe('RoofingContractor');
    expect(getNicheProfile('heat pump')!.parent).toBe('hvac');
    expect(getNicheProfile('heat pump')!.schemaType).toBe('HVACBusiness');
    expect(getNicheProfile('panel upgrade')!.parent).toBe('electrical');
    expect(getNicheProfile('panel upgrade')!.schemaType).toBe('Electrician');
  });

  describe('getNichesByParent', () => {
    it('returns the 14 landscaping children (6 PR-A + 6 Lever 2 + 2 high-intent rungs)', () => {
      const keys = getNichesByParent('landscaping').map((p) => p.niche).sort();
      expect(keys).toEqual(
        [
          'landscape design',
          'lawn care',
          'hardscaping',
          'irrigation',
          'tree service',
          'landscape lighting',
          'sod installation',
          'artificial turf',
          'drainage solutions',
          'xeriscaping',
          'mulch installation',
          'outdoor living',
          'retaining walls',
          'yard cleanup',
        ].sort(),
      );
    });

    it('returns the 10 plumbing children (6 PR-A + 4 Lever 2)', () => {
      expect(getNichesByParent('plumbing').length).toBe(10);
    });

    it('is alias/whitespace-insensitive on the parent argument', () => {
      expect(getNichesByParent('  Landscaping ').length).toBe(14);
    });

    it('returns empty for a parent with no registered children', () => {
      expect(getNichesByParent('locksmith')).toEqual([]);
    });
  });

  describe('alias collapses (no split-brain)', () => {
    it('drain cleaning collapses to the drain and sewer profile', () => {
      const drainCleaning = getNicheProfile('drain cleaning');
      const drainAndSewer = getNicheProfile('drain and sewer');
      expect(drainCleaning).not.toBeNull();
      expect(drainCleaning!.niche).toBe('drain and sewer');
      expect(drainCleaning!.category).toBe(drainAndSewer!.category);
      expect(drainCleaning!.schemaType).toBe(drainAndSewer!.schemaType);
      expect(drainCleaning!.context).toBe(drainAndSewer!.context);
      expect(drainCleaning!.parent).toBe('plumbing');
    });

    it('electrician collapses to the electrical profile', () => {
      const electrician = getNicheProfile('electrician');
      const electrical = getNicheProfile('electrical');
      expect(electrician).not.toBeNull();
      expect(electrician!.niche).toBe('electrical');
      expect(electrician!.category).toBe(electrical!.category);
      expect(electrician!.schemaType).toBe(electrical!.schemaType);
    });

    it('tree trimming / tree removal / sprinkler system collapse to their canonical keys', () => {
      expect(getNicheProfile('tree trimming')!.niche).toBe('tree service');
      expect(getNicheProfile('tree removal')!.niche).toBe('tree service');
      expect(getNicheProfile('sprinkler system')!.niche).toBe('irrigation');
    });
  });
});
