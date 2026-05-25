import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from './client.js';
import { LeadStatus, VALID_TRANSITIONS } from '../types/lead.js';
import { generateSlug } from '../utils/slug.js';
import { createLogger } from '../utils/logger.js';
const log = createLogger('leads');
export async function createLead(input) {
    const slug = generateSlug(input.businessName, input.city);
    const now = new Date().toISOString();
    const lead = {
        pk: `LEAD#${slug}`,
        sk: 'META',
        status: LeadStatus.PROSPECT,
        slug,
        stagingUrl: `https://${slug}.preview.localbuilder.com`,
        createdAt: now,
        updatedAt: now,
        statusHistory: [{ from: LeadStatus.PROSPECT, to: LeadStatus.PROSPECT, timestamp: now, reason: 'created' }],
        ...input,
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
    const validTargets = VALID_TRANSITIONS[fromStatus];
    if (!validTargets.includes(toStatus)) {
        throw new Error(`Invalid transition: ${fromStatus} -> ${toStatus}`);
    }
    const now = new Date().toISOString();
    const transition = { from: fromStatus, to: toStatus, timestamp: now, reason };
    let updateExpr = 'SET #status = :toStatus, updatedAt = :now, statusHistory = list_append(statusHistory, :transition)';
    const exprNames = { '#status': 'status' };
    const exprValues = {
        ':fromStatus': fromStatus,
        ':toStatus': toStatus,
        ':now': now,
        ':transition': [transition],
    };
    if (extraUpdates) {
        for (const [key, value] of Object.entries(extraUpdates)) {
            updateExpr += `, #${key} = :${key}`;
            exprNames[`#${key}`] = key;
            exprValues[`:${key}`] = value;
        }
    }
    const result = await docClient.send(new UpdateCommand({
        TableName: TABLE_NAMES.leads,
        Key: { pk: `LEAD#${slug}`, sk: 'META' },
        UpdateExpression: updateExpr,
        ConditionExpression: '#status = :fromStatus',
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
