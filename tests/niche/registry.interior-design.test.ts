import { describe, it, expect } from 'vitest';
import {
  getNicheProfile,
  isContentSupported,
  listContentSupportedNiches,
  getNichesByParent,
} from '../../src/niche/registry.js';

describe('interior design — coarse niche', () => {
  it('resolves as a content-supported home-improvement niche', () => {
    const p = getNicheProfile('interior design');
    expect(p).not.toBeNull();
    expect(p!.category).toBe('home-improvement');
    expect(p!.schemaType).toBe('HomeAndConstructionBusiness');
    expect(p!.context).toMatch(/full-service interior design/i);
    expect(p!.parent).toBeUndefined(); // coarse niche has no parent
    expect(isContentSupported('interior design')).toBe(true);
    expect(listContentSupportedNiches()).toContain('interior design');
  });

  it('collapses interior-design synonyms to one canonical profile (no split-brain)', () => {
    const canonical = getNicheProfile('interior design');
    for (const alias of ['interior designer', 'Interior Decorator', '  interior decorating ']) {
      const p = getNicheProfile(alias);
      expect(p, `alias ${alias}`).not.toBeNull();
      expect(p!.niche).toBe('interior design');
      expect(p!.context).toBe(canonical!.context);
      expect(isContentSupported(alias)).toBe(true);
    }
  });
});

describe('interior design — sub-niches', () => {
  const SUBS = ['home staging', 'e-design', 'kitchen and bath design', 'color consultation', 'room redesign'];

  it('registers all 5 sub-niches as content-supported children of interior design', () => {
    for (const s of SUBS) {
      const p = getNicheProfile(s);
      expect(p, `missing ${s}`).not.toBeNull();
      expect(p!.parent, `${s} parent`).toBe('interior design');
      expect(p!.category, `${s} category`).toBe('home-improvement');
      expect(p!.schemaType, `${s} schemaType`).toBe('HomeAndConstructionBusiness');
      expect(p!.context, `${s} needs content context`).toBeTruthy();
      expect(p!.aliases!.length, `${s} aliases`).toBeGreaterThan(0);
      expect(isContentSupported(s)).toBe(true);
    }
  });

  it('lists exactly these 5 children under the interior design parent', () => {
    const children = getNichesByParent('interior design').map((p: { niche: string }) => p.niche);
    expect(children.sort()).toEqual([...SUBS].sort());
  });

  it('exposes each sub-niche businessType alias list for the classifier', () => {
    const expectFirst: Record<string, string> = {
      'home staging': 'home staging consultation',
      'e-design': 'virtual interior design',
      'kitchen and bath design': 'kitchen and bathroom design',
      'color consultation': 'color and material consultation',
      'room redesign': 'one day room makeover',
    };
    for (const [s, first] of Object.entries(expectFirst)) {
      const p = getNicheProfile(s);
      expect(p!.aliases![0], `${s} longest-first alias`).toBe(first);
    }
  });
});
