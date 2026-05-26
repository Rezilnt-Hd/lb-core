import { it, expect } from 'vitest';
import { EventType } from '../../src/types/events.js';
import { PATTERNS } from '../../src/events/patterns.js';

it('declares the analytics email events', () => {
  expect(EventType.ANOMALY_DETECTED).toBe('anomaly.detected');
  expect(EventType.MONTHLY_REPORT_READY).toBe('monthly.report.ready');
});

it('has EventBridge patterns that match those detail-types', () => {
  expect(JSON.stringify(PATTERNS.anomalyAlerts)).toContain('anomaly.detected');
  expect(JSON.stringify(PATTERNS.monthlyReport)).toContain('monthly.report.ready');
});
