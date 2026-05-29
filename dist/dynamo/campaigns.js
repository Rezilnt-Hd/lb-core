// src/dynamo/campaigns.ts
//
// Campaign registry CRUD — runtime-mutable replacement for the boot-time
// CAMPAIGN_MAP env var. See src/types/campaign.ts for the data shape.
//
// In-memory cache: per-Lambda-container 5-min TTL. The outreach orchestrator
// reads this hot-path (every lead enrollment), so we don't want to hit DDB
// on every call. Worst case: an approved niche becomes visible to the
// orchestrator within 5 minutes of approval. Acceptable per spec.
import { GetCommand, PutCommand, UpdateCommand, QueryCommand, } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from './client.js';
const TTL_MS = 5 * 60 * 1000;
const CACHE = new Map();
/** Test-only — wipe the in-memory cache between vitest runs. */
export function _resetCampaignCacheForTests() {
    CACHE.clear();
}
function normalizeNiche(niche) {
    return niche.trim().toLowerCase();
}
/**
 * Resolve a lead's niche to its target Instantly campaign UUID, or null when
 * no `approved` row exists. Pending and rejected rows are treated as "no
 * mapping" — only approved rows route real outreach.
 *
 * Case/whitespace insensitive on the niche side.
 */
export async function getCampaignForNiche(niche) {
    if (!niche)
        return null;
    const key = normalizeNiche(niche);
    const cached = CACHE.get(key);
    if (cached && cached.expires > Date.now())
        return cached.uuid;
    const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAMES.campaigns,
        Key: { pk: 'CAMPAIGN', sk: `NICHE#${key}` },
    }));
    const item = result.Item;
    const uuid = (item?.status === 'approved' && item.campaignUuid) ? item.campaignUuid : null;
    CACHE.set(key, { uuid, expires: Date.now() + TTL_MS });
    return uuid;
}
/**
 * Return the set of niches that already have a campaign row (in ANY of
 * pending_review or approved). Used by the scanner to dedupe — we don't want
 * to regenerate copy for a niche already awaiting operator approval, nor for
 * one already live. Rejected niches are NOT in this set so they regenerate
 * on the next scan with fresh Bedrock variance.
 */
export async function listKnownCampaignNiches() {
    const known = new Set();
    for (const status of ['pending_review', 'approved']) {
        const result = await docClient.send(new QueryCommand({
            TableName: TABLE_NAMES.campaigns,
            IndexName: 'status-created-index',
            KeyConditionExpression: '#s = :s',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':s': status },
            ProjectionExpression: 'niche',
        }));
        for (const item of (result.Items ?? [])) {
            if (typeof item.niche === 'string')
                known.add(item.niche);
        }
    }
    return known;
}
/**
 * Write a pending_review row. Conditional on `attribute_not_exists(sk)` so a
 * re-running scanner can never overwrite a row in flight (belt + suspenders
 * over the dedupe-by-listKnownCampaignNiches check). Throws
 * ConditionalCheckFailedException if the row already exists.
 */
export async function writePendingCampaign(input) {
    const niche = normalizeNiche(input.niche);
    const now = new Date().toISOString();
    const row = {
        pk: 'CAMPAIGN',
        sk: `NICHE#${niche}`,
        niche,
        status: 'pending_review',
        generatedCopy: input.generatedCopy,
        sourceCampaignUuid: input.sourceCampaignUuid,
        bedrockModelId: input.bedrockModelId,
        createdAt: now,
    };
    await docClient.send(new PutCommand({
        TableName: TABLE_NAMES.campaigns,
        Item: row,
        ConditionExpression: 'attribute_not_exists(sk)',
    }));
    return row;
}
/**
 * Flip a pending_review row to approved + record the Instantly campaignUuid
 * and approvedAt timestamp. Conditional on current status being
 * pending_review so a double-approval can't overwrite state.
 *
 * Also invalidates the local cache for this niche so the next
 * getCampaignForNiche call sees the new uuid immediately within this
 * Lambda container (cross-container propagation still bounded by TTL).
 */
export async function updateCampaignApproved(niche, campaignUuid) {
    const key = normalizeNiche(niche);
    const now = new Date().toISOString();
    await docClient.send(new UpdateCommand({
        TableName: TABLE_NAMES.campaigns,
        Key: { pk: 'CAMPAIGN', sk: `NICHE#${key}` },
        UpdateExpression: 'SET #s = :approved, campaignUuid = :uuid, approvedAt = :now',
        ConditionExpression: '#s = :pending',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
            ':approved': 'approved',
            ':pending': 'pending_review',
            ':uuid': campaignUuid,
            ':now': now,
        },
    }));
    CACHE.delete(key);
}
/**
 * Flip status to rejected. No conditional — operator may reject from any
 * non-terminal state (in practice always pending_review, but if a future
 * "retry" path exists, this stays open).
 */
export async function updateCampaignStatus(niche, status) {
    const key = normalizeNiche(niche);
    await docClient.send(new UpdateCommand({
        TableName: TABLE_NAMES.campaigns,
        Key: { pk: 'CAMPAIGN', sk: `NICHE#${key}` },
        UpdateExpression: 'SET #s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': status },
    }));
    CACHE.delete(key);
}
/**
 * Load a single campaign row by niche (any status). Used by the webhook
 * before mutating state — needs to see pending_review rows that
 * getCampaignForNiche filters out.
 */
export async function getCampaignRow(niche) {
    const key = normalizeNiche(niche);
    const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAMES.campaigns,
        Key: { pk: 'CAMPAIGN', sk: `NICHE#${key}` },
    }));
    return result.Item ?? null;
}
