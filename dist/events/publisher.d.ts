import { EventType } from '../types/events.js';
export declare function publishEvent(detailType: EventType, detail: Record<string, unknown>): Promise<void>;
