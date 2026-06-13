import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.fn();
vi.mock('../../src/bedrock/adapter.js', () => ({ invokeBedrock: (...a: unknown[]) => mockInvoke(...a) }));

const { resolveRefinedNiche } = await import('../../src/niche/refiner.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveRefinedNiche — deterministic alias pass', () => {
  it('matches a sub-niche by alias substring (the Cultivators/Ambiance trigger case)', async () => {
    const r = await resolveRefinedNiche('landscaping', 'landscape design & architecture firm');
    expect(r).toBe('landscape design');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('longest-fragment-first wins over a shorter generic sibling fragment', async () => {
    // "tree removal" (12 chars) must beat "tree care"/"tree service" generic
    // fragments AND must not let a shorter alias of another sub-niche win.
    const r = await resolveRefinedNiche('landscaping', 'full-service tree removal and stump grinding');
    expect(r).toBe('tree service');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('disambiguates gutter installation (roofing) vs generic via longest-first', async () => {
    const r = await resolveRefinedNiche('roofing', 'seamless gutter installation and repair company');
    expect(r).toBe('gutter installation');
  });

  it('SORT-SENSITIVE: longer alias of a later-listed sibling beats a shorter alias of an earlier sibling', async () => {
    // 'heating and furnace' is registered BEFORE 'hvac maintenance'. The input
    // contains BOTH 'furnace' (len 7, on heating-and-furnace) AND 'furnace tune-up'
    // (len 15, on hvac maintenance). ONLY the length DESC sort yields the correct
    // 'hvac maintenance'; remove the sort and the earlier-listed 'furnace' wins
    // (→ 'heating and furnace'), failing this test. This is the guard that the
    // sort is actually load-bearing (not just incidentally green).
    const r = await resolveRefinedNiche('hvac', 'furnace tune-up and seasonal service');
    expect(r).toBe('hvac maintenance');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('does NOT mis-route a commercial roofer to residential (bare "roofer" removed)', async () => {
    expect(await resolveRefinedNiche('roofing', 'commercial roofer and flat-roof specialist')).toBe('commercial roofing');
    expect(await resolveRefinedNiche('roofing', 'metal roofer / standing seam installer')).toBe('metal roofing');
  });

  it('resolves the coarse parent through an alias (electrician → electrical)', async () => {
    const r = await resolveRefinedNiche('electrician', 'residential electrician serving the metro');
    expect(r).toBe('residential electrical');
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('resolveRefinedNiche — null / skip paths', () => {
  it('returns null for empty businessType (no Bedrock call)', async () => {
    expect(await resolveRefinedNiche('landscaping', '')).toBeNull();
    expect(await resolveRefinedNiche('landscaping', undefined)).toBeNull();
    expect(await resolveRefinedNiche('landscaping', null)).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('returns null without invoking Bedrock when the coarse niche has no children', async () => {
    const r = await resolveRefinedNiche('locksmith', 'mobile locksmith and lockout service');
    expect(r).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('returns null for an unregistered coarse niche', async () => {
    const r = await resolveRefinedNiche('underwater basket weaving', 'a basket studio');
    expect(r).toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('resolveRefinedNiche — Haiku fallback', () => {
  it('falls back to Haiku when no alias matches and parses a fenced candidate key', async () => {
    mockInvoke.mockResolvedValueOnce({ text: '```\nwater heater service\n```' });
    const r = await resolveRefinedNiche('plumbing', 'we specialize in tankless conversions and hot-water systems');
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(r).toBe('water heater service');
  });

  it('maps a NONE response to null', async () => {
    mockInvoke.mockResolvedValueOnce({ text: 'NONE' });
    const r = await resolveRefinedNiche('plumbing', 'general handyman odd jobs');
    expect(r).toBeNull();
  });

  it('maps an unrecognized (non-candidate) Haiku answer to null', async () => {
    mockInvoke.mockResolvedValueOnce({ text: 'something off-list' });
    const r = await resolveRefinedNiche('plumbing', 'general handyman odd jobs');
    expect(r).toBeNull();
  });

  it('never throws — returns null when Bedrock rejects', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('bedrock down'));
    const r = await resolveRefinedNiche('plumbing', 'general handyman odd jobs');
    expect(r).toBeNull();
  });
});
