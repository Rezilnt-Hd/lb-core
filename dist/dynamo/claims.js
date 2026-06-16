import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from './client.js';
import { createLogger } from '../utils/logger.js';
const log = createLogger('claims');
/** Constant sort key. A keyword slot is a SINGLE sentinel row that every lead
 * contends for, so the conditional PutItem below is a true test-and-set mutex.
 * (Per-(slot,lead) rows would NOT be atomic: each lead's distinct sk makes
 * attribute_not_exists evaluate against a different item, so every put wins.) */
export const SLOT_SK = 'SLOT';
/** Atomically claim a keyword slot for a lead by writing the sentinel item
 * (pk, 'SLOT'). Succeeds iff the slot is unclaimed OR previously released.
 * Returns false (ConditionalCheckFailed) when another lead actively holds it —
 * the caller advances the ladder. */
export async function claimSlot(input) {
    const now = new Date().toISOString();
    const item = {
        pk: input.pk, sk: SLOT_SK,
        keyword: input.keyword, baseKeyword: input.baseKeyword, slug: input.slug,
        niche: input.niche, city: input.city, state: input.state, rung: input.rung,
        status: 'active', claimedAt: now,
    };
    try {
        await docClient.send(new PutCommand({
            TableName: TABLE_NAMES.claims,
            Item: item,
            // All contenders write the SAME (pk,'SLOT') item, so this is a real mutex:
            // win iff no sentinel exists yet OR the existing one was released.
            ConditionExpression: 'attribute_not_exists(pk) OR #s = :released',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':released': 'released' },
        }));
        return true;
    }
    catch (err) {
        if (err?.name === 'ConditionalCheckFailedException')
            return false;
        throw err;
    }
}
/** The active owner of a slot, or null. A single GetItem on the sentinel. */
export async function getActiveClaim(pk) {
    const resp = await docClient.send(new GetCommand({
        TableName: TABLE_NAMES.claims,
        Key: { pk, sk: SLOT_SK },
    }));
    const claim = resp.Item;
    return claim && claim.status === 'active' ? claim : null;
}
/** Release every active slot a lead currently owns. Returns the count released.
 * Each Update is GUARDED on status='active' AND slug=<this lead>, so a slot
 * re-won by another lead between the query and the update is never clobbered
 * (a guarded-update ConditionalCheckFailed is skipped, not counted). */
export async function releaseClaimsForLead(slug, nowIso = new Date().toISOString()) {
    const resp = await docClient.send(new QueryCommand({
        TableName: TABLE_NAMES.claims,
        IndexName: 'lead-index',
        KeyConditionExpression: 'slug = :slug',
        ExpressionAttributeValues: { ':slug': slug },
    }));
    const active = (resp.Items ?? []).filter(c => c.status === 'active');
    let released = 0;
    for (const c of active) {
        try {
            await docClient.send(new UpdateCommand({
                TableName: TABLE_NAMES.claims,
                Key: { pk: c.pk, sk: SLOT_SK },
                UpdateExpression: 'SET #s = :released, releasedAt = :now',
                ConditionExpression: '#s = :active AND slug = :slug',
                ExpressionAttributeNames: { '#s': 'status' },
                ExpressionAttributeValues: { ':released': 'released', ':active': 'active', ':now': nowIso, ':slug': slug },
            }));
            released++;
        }
        catch (err) {
            if (err?.name === 'ConditionalCheckFailedException')
                continue; // slot changed hands — skip
            throw err;
        }
    }
    log.info('Released claims for lead', { slug, count: released });
    return released;
}
