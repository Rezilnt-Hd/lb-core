import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from './client.js';
import { createLogger } from '../utils/logger.js';
const log = createLogger('claims');
/** Atomically claim a keyword slot for a lead. Returns false if the slot is held
 * by another active claim (ConditionalCheckFailed); the caller advances the ladder. */
export async function claimSlot(input) {
    const now = new Date().toISOString();
    const item = {
        pk: input.pk, sk: `LEAD#${input.slug}`,
        keyword: input.keyword, baseKeyword: input.baseKeyword, slug: input.slug,
        niche: input.niche, city: input.city, state: input.state, rung: input.rung,
        status: 'active', claimedAt: now,
    };
    try {
        await docClient.send(new PutCommand({
            TableName: TABLE_NAMES.claims,
            Item: item,
            // Free if no row exists OR the existing row was released (re-winnable slot).
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
/** The single active claim on a slot, or null. */
export async function getActiveClaim(pk) {
    const resp = await docClient.send(new QueryCommand({
        TableName: TABLE_NAMES.claims,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': pk },
    }));
    const active = resp.Items?.find(i => i.status === 'active');
    return active ?? null;
}
/** Release every active claim a lead holds. Returns the count released. */
export async function releaseClaimsForLead(slug, nowIso = new Date().toISOString()) {
    const resp = await docClient.send(new QueryCommand({
        TableName: TABLE_NAMES.claims,
        IndexName: 'lead-index',
        KeyConditionExpression: 'slug = :slug',
        ExpressionAttributeValues: { ':slug': slug },
    }));
    const active = (resp.Items ?? []).filter(c => c.status === 'active');
    for (const c of active) {
        await docClient.send(new UpdateCommand({
            TableName: TABLE_NAMES.claims,
            Key: { pk: c.pk, sk: c.sk },
            UpdateExpression: 'SET #s = :released, releasedAt = :now',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':released': 'released', ':now': nowIso },
        }));
    }
    log.info('Released claims for lead', { slug, count: active.length });
    return active.length;
}
