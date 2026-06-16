import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from './client.js';
import { createLogger } from '../utils/logger.js';
import type { KeywordClaim } from '../types/claim.js';

const log = createLogger('claims');

export interface ClaimInput {
  pk: string; slug: string; keyword: string; baseKeyword: string;
  niche: string; city: string; state: string; rung: number;
}

/** Atomically claim a keyword slot for a lead. Returns false if the slot is held
 * by another active claim (ConditionalCheckFailed); the caller advances the ladder. */
export async function claimSlot(input: ClaimInput): Promise<boolean> {
  const now = new Date().toISOString();
  const item: KeywordClaim = {
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
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') return false;
    throw err;
  }
}

/** The single active claim on a slot, or null. */
export async function getActiveClaim(pk: string): Promise<KeywordClaim | null> {
  const resp = await docClient.send(new QueryCommand({
    TableName: TABLE_NAMES.claims,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': pk },
  }));
  const active = (resp.Items as KeywordClaim[] | undefined)?.find(i => i.status === 'active');
  return active ?? null;
}

/** Release every active claim a lead holds. Returns the count released. */
export async function releaseClaimsForLead(slug: string, nowIso = new Date().toISOString()): Promise<number> {
  const resp = await docClient.send(new QueryCommand({
    TableName: TABLE_NAMES.claims,
    IndexName: 'lead-index',
    KeyConditionExpression: 'slug = :slug',
    ExpressionAttributeValues: { ':slug': slug },
  }));
  const active = (resp.Items as KeywordClaim[] | undefined ?? []).filter(c => c.status === 'active');
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
