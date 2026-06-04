import type { BedrockProvider, InvokeBedrockInput, InvokeBedrockResult } from "./types.js";
export declare function detectProvider(modelId: string): BedrockProvider;
export declare function buildRequestBody(input: InvokeBedrockInput): string;
export declare function parseResponseBody(modelId: string, rawBody: string): InvokeBedrockResult;
/**
 * Test-only: reset the cached client so vi.mock can replace the SDK constructor.
 * Production code must NOT call this — it forces a fresh SDK client on the next
 * invocation, which is expensive and pointless outside of tests.
 */
export declare function _resetClient(): void;
export declare function invokeBedrock(input: InvokeBedrockInput): Promise<InvokeBedrockResult>;
