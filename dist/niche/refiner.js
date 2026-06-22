import { invokeBedrock } from '../bedrock/adapter.js';
import { createLogger } from '../utils/logger.js';
import { getNicheProfile, getNichesByParent } from './registry.js';
const log = createLogger('niche-refiner');
// Haiku 4.5 by default; never hardcode the bare model id at call sites — read
// from env/GitHub var so the model can be swapped without a redeploy.
const REFINER_MODEL_ID = process.env.BEDROCK_MODEL_REFINER || 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
/**
 * Resolve a businessType-derived specialization (sub-niche) under a coarse niche.
 *
 * Contract (see 2026-06-13-niche-taxonomy-RESOLVED-data.md §classifier):
 *  1. empty businessType            → null
 *  2. coarse niche with no children → null (no Bedrock call)
 *  3. deterministic pass: across the parent's sub-niches, sort ALL aliases by
 *     length DESC; return the sub-niche key of the FIRST alias that is a substring
 *     of businessType.toLowerCase().
 *  4. Haiku fallback (only if no alias matched): ask for exactly one candidate
 *     key or NONE; map NONE/unrecognized → null.
 *
 * Best-effort: never throws. The coarse `niche` remains the routing/campaign key;
 * `refinedNiche` is purely additive (consumers read `refinedNiche ?? niche`).
 */
export async function resolveRefinedNiche(coarseNiche, businessType) {
    const bt = businessType?.trim().toLowerCase();
    if (!bt)
        return null;
    // Resolve the coarse niche (alias-aware) to its canonical key, then its children.
    const coarse = getNicheProfile(coarseNiche);
    if (!coarse)
        return null;
    const children = getNichesByParent(coarse.niche);
    if (children.length === 0)
        return null;
    // ── 3. Deterministic pass — longest-fragment-first across all children ──
    const candidates = children
        .flatMap((child) => (child.aliases ?? []).map((alias) => ({ alias, niche: child.niche })))
        .sort((a, b) => b.alias.length - a.alias.length);
    for (const { alias, niche } of candidates) {
        if (bt.includes(alias.toLowerCase()))
            return niche;
    }
    // ── 4. Haiku fallback — exactly one candidate key or NONE ──
    const keys = children.map((c) => c.niche);
    try {
        const prompt = `You are classifying a local-services business into one specialization.
Coarse trade: ${coarse.niche}
Business description: ${businessType}

Choose the SINGLE best-matching specialization from this list (exact text only):
${keys.map((k) => `- ${k}`).join('\n')}

Respond with EXACTLY one of the listed keys, or the word NONE if none clearly fit.
Output only the key (or NONE) — no punctuation, no explanation.`;
        const { text } = await invokeBedrock({
            callSite: 'niche-refiner',
            modelId: REFINER_MODEL_ID,
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 24,
            temperature: 0,
        });
        const cleaned = text
            .replace(/```json?\n?/gi, '')
            .replace(/```/g, '')
            .trim()
            .toLowerCase();
        if (!cleaned || cleaned === 'none')
            return null;
        return keys.includes(cleaned) ? cleaned : null;
    }
    catch (err) {
        log.warn('Haiku niche refinement failed; returning null', {
            coarseNiche: coarse.niche,
            err: String(err),
        });
        return null;
    }
}
