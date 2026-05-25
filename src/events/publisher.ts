import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { EventType, EVENT_SOURCE } from '../types/events.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('events');
const client = new EventBridgeClient({});
const EVENT_BUS = process.env.EVENT_BUS_NAME || 'lb-events-prod';

export async function publishEvent(
  detailType: EventType,
  detail: Record<string, unknown>,
): Promise<void> {
  const result = await client.send(new PutEventsCommand({
    Entries: [{
      EventBusName: EVENT_BUS,
      Source: EVENT_SOURCE,
      DetailType: detailType,
      Detail: JSON.stringify(detail),
    }],
  }));

  if (result.FailedEntryCount && result.FailedEntryCount > 0) {
    log.error('EventBridge publish failed', { detailType, detail });
    throw new Error('EventBridge publish failed');
  }

  log.info('Event published', { detailType, slug: detail.slug });
}
