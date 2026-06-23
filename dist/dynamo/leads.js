import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from './client.js';
import { LeadStatus, VALID_TRANSITIONS } from '../types/lead.js';
import { generateSlug } from '../utils/slug.js';
import { createLogger } from '../utils/logger.js';
const log = createLogger('leads');
export async function createLead(input) {
    const slug = generateSlug(input.businessName, input.city);
    const now = new Date().toISOString();
    // Persist `internal` ONLY when truthy so the attribute is genuinely absent
    // for normal leads — absence (not `false`) is the contract relied on by the
    // SITE_BUILT -> LIVE carve-out and outreach exclusion. Exclude it from the
    // wholesale `...input` spread so an explicit `internal: false` is dropped.
    const { internal: _internal, ...inputRest } = input;
    const lead = {
        pk: `LEAD#${slug}`,
        sk: 'META',
        status: LeadStatus.PROSPECT,
        slug,
        stagingUrl: `https://${slug}.preview.localbuilder.com`,
        createdAt: now,
        updatedAt: now,
        statusHistory: [{ from: LeadStatus.PROSPECT, to: LeadStatus.PROSPECT, timestamp: now, reason: 'created' }],
        ...inputRest,
        ...(input.internal ? { internal: true } : {}),
    };
    await docClient.send(new PutCommand({
        TableName: TABLE_NAMES.leads,
        Item: lead,
        ConditionExpression: 'attribute_not_exists(pk)',
    }));
    log.info('Lead created', { slug, niche: input.niche, city: input.city });
    return lead;
}
export async function getLead(slug) {
    const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAMES.leads,
        Key: { pk: `LEAD#${slug}`, sk: 'META' },
    }));
    return result.Item || null;
}
export async function transitionLead(slug, fromStatus, toStatus, reason, extraUpdates) {
    // SITE_BUILT -> LIVE is allowed ONLY for internal (owned/operated) leads that
    // skip the PAID checkout — Rezilnt dog-food go-live. It is deliberately NOT a
    // VALID_TRANSITIONS table entry (that would let ANY lead bypass PAID). The
    // structural check below lets the edge past, and the "internal" invariant is
    // then enforced atomically by DynamoDB via `#internal = :internalTrue` in the
    // ConditionExpression — a non-internal lead's update fails the condition.
    const standardOk = VALID_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
    const isInternalGoLiveEdge = fromStatus === LeadStatus.SITE_BUILT && toStatus === LeadStatus.LIVE;
    if (!standardOk && !isInternalGoLiveEdge) {
        throw new Error(`Invalid transition: ${fromStatus} -> ${toStatus}`);
    }
    const now = new Date().toISOString();
    const transition = { from: fromStatus, to: toStatus, timestamp: now, reason };
    // if_not_exists guards a lead that somehow lacks statusHistory (e.g. a manually
    // seeded or migrated item) — a bare list_append on a missing attribute throws
    // DynamoDB ValidationException ("attribute that does not exist in the item").
    let updateExpr = 'SET #status = :toStatus, updatedAt = :now, statusHistory = list_append(if_not_exists(statusHistory, :empty), :transition)';
    const exprNames = { '#status': 'status' };
    const exprValues = {
        ':fromStatus': fromStatus,
        ':toStatus': toStatus,
        ':now': now,
        ':transition': [transition],
        ':empty': [],
    };
    const removes = [];
    if (extraUpdates) {
        for (const [key, value] of Object.entries(extraUpdates)) {
            if (value === null) {
                // Explicit null → REMOVE the attribute. Used by callers that want to
                // clear a transient flag (e.g. lastOutreachSkipReason) atomically with
                // the status transition. `undefined` is left alone (historical no-op)
                // so shared-library callers with `Foo | undefined` field types don't
                // silently destroy data.
                removes.push(`#${key}`);
                exprNames[`#${key}`] = key;
            }
            else if (value === undefined) {
                // Skip — preserves backward compat with callers that pass `undefined`
                // for optional fields they don't want to update.
                continue;
            }
            else {
                updateExpr += `, #${key} = :${key}`;
                exprNames[`#${key}`] = key;
                exprValues[`:${key}`] = value;
            }
        }
    }
    if (removes.length > 0) {
        updateExpr += ` REMOVE ${removes.join(', ')}`;
    }
    // For the internal go-live edge, require `internal = true` on the existing item
    // atomically. All other transitions keep the plain status guard unchanged.
    let conditionExpr = '#status = :fromStatus';
    if (isInternalGoLiveEdge) {
        conditionExpr += ' AND #internal = :internalTrue';
        exprNames['#internal'] = 'internal';
        exprValues[':internalTrue'] = true;
    }
    const result = await docClient.send(new UpdateCommand({
        TableName: TABLE_NAMES.leads,
        Key: { pk: `LEAD#${slug}`, sk: 'META' },
        UpdateExpression: updateExpr,
        ConditionExpression: conditionExpr,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ReturnValues: 'ALL_NEW',
    }));
    log.info('Lead transitioned', { slug, from: fromStatus, to: toStatus });
    return result.Attributes;
}
export async function getLeadsByStatus(status) {
    const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAMES.leads,
        IndexName: 'status-index',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
    }));
    return (result.Items || []);
}
export async function countActiveLeads() {
    const active = [
        LeadStatus.PROSPECT, LeadStatus.ENRICHED, LeadStatus.VERIFIED,
        LeadStatus.SITE_BUILT, LeadStatus.PITCHED,
    ];
    let total = 0;
    for (const status of active) {
        const result = await docClient.send(new QueryCommand({
            TableName: TABLE_NAMES.leads,
            IndexName: 'status-index',
            KeyConditionExpression: '#status = :status',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':status': status },
            Select: 'COUNT',
        }));
        total += result.Count || 0;
    }
    return total;
}
/**
 * Count leads in a single status. Uses the status-index GSI with Select: COUNT
 * so no items are hydrated — much cheaper than getLeadsByStatus(...).length
 * when you only need the count (e.g., prospector's cap gates).
 */
export async function countLeadsByStatus(status) {
    const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAMES.leads,
        IndexName: 'status-index',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
        Select: 'COUNT',
    }));
    return result.Count ?? 0;
}
/**
 * Status-neutral field writer. Unlike transitionLead, this does NOT change
 * status or enforce VALID_TRANSITIONS — use it for post-checkout edits like
 * customer-supplied customDomain / brandColors. Always refreshes updatedAt.
 */
export async function updateLeadFields(slug, fields) {
    const entries = Object.entries(fields).filter(([k]) => k !== 'pk' && k !== 'sk' && k !== 'slug');
    if (entries.length === 0)
        throw new Error('updateLeadFields: no fields to update');
    const names = {};
    const values = {};
    const sets = [];
    entries.forEach(([k, v], i) => {
        names[`#f${i}`] = k;
        values[`:v${i}`] = v;
        sets.push(`#f${i} = :v${i}`);
    });
    names['#updatedAt'] = 'updatedAt';
    values[':updatedAt'] = new Date().toISOString();
    sets.push('#updatedAt = :updatedAt');
    const result = await docClient.send(new UpdateCommand({
        TableName: TABLE_NAMES.leads,
        Key: { pk: `LEAD#${slug}`, sk: 'META' },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: 'attribute_exists(pk)',
        ReturnValues: 'ALL_NEW',
    }));
    return result.Attributes;
}
