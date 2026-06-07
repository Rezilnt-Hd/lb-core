import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@aws-sdk/client-eventbridge', () => {
  const send = vi.fn().mockResolvedValue({ FailedEntryCount: 0 });
  return {
    EventBridgeClient: vi.fn(function () { this.send = send; }),
    PutEventsCommand: vi.fn(function (input) { Object.assign(this, input); }),
  };
});

import { publishEvent } from '../../src/events/publisher.js';
import { EventType, EVENT_SOURCE } from '../../src/types/events.js';

describe('publishEvent', () => {
  it('publishes a lead status changed event', async () => {
    await publishEvent(EventType.LEAD_STATUS_CHANGED, {
      slug: 'joes-plumbing-miami',
      previousStatus: 'PROSPECT',
      newStatus: 'ENRICHED',
      timestamp: '2026-05-25T00:00:00Z',
    });
    // No throw = success
  });

  it('throws on failed entries', async () => {
    const { EventBridgeClient } = await import('@aws-sdk/client-eventbridge');
    const mockInstance = new EventBridgeClient({});
    vi.mocked(mockInstance.send).mockResolvedValueOnce({ FailedEntryCount: 1 });

    await expect(
      publishEvent(EventType.LEAD_STATUS_CHANGED, { slug: 'test' })
    ).rejects.toThrow('EventBridge publish failed');
  });
});
