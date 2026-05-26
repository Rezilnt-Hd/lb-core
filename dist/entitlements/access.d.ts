import { Tier } from '../types/lead.js';
import { type TierEntitlements } from '../types/entitlements.js';
type BooleanCapability = {
    [K in keyof TierEntitlements]: TierEntitlements[K] extends boolean ? K : never;
}[keyof TierEntitlements];
/** Generic boolean gate — capability is a compile-checked key against P1's TierEntitlements. */
export declare function isEntitled(tier: Tier | undefined, capability: BooleanCapability): boolean;
export declare const blogPostsPerWeek: (t?: Tier) => number;
export declare const canUseSmartLinking: (t?: Tier) => boolean;
export declare const canUseAdvancedSchema: (t?: Tier) => boolean;
export declare const canUseCustomDomain: (t?: Tier) => boolean;
export declare const canUseWebp: (t?: Tier) => boolean;
export declare const canUseFullTextSearch: (t?: Tier) => boolean;
export declare const canUseInfoGain: (t?: Tier) => boolean;
export declare const canUseAnomalyAlerts: (t?: Tier) => boolean;
export declare const canUseMonthlyReport: (t?: Tier) => boolean;
export declare const canUseGoogleAdsPages: (t?: Tier) => boolean;
export {};
