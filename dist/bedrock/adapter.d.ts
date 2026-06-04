import type { BedrockProvider, InvokeBedrockInput, InvokeBedrockResult } from "./types.js";
export declare function detectProvider(modelId: string): BedrockProvider;
/**
 * Returns true if the model accepts multimodal `ContentBlock[]` message content
 * (text + image). Anthropic Claude 3+ supports this natively via Bedrock's
 * messages content-array shape. Non-Anthropic vision SKUs (Nova Pro/Lite/Premier,
 * Llama 3.2 Vision) are deferred behind explicit consumer demand — see
 * lb-infra/docs/superpowers/specs/2026-06-04-bedrock-multimodal-adapter-design.md §3.2.
 */
export declare function supportsVision(modelId: string): boolean;
export declare function buildRequestBody(input: InvokeBedrockInput): string;
export declare function parseResponseBody(modelId: string, rawBody: string): InvokeBedrockResult;
/**
 * Test-only: reset the cached client so vi.mock can replace the SDK constructor.
 * Production code must NOT call this — it forces a fresh SDK client on the next
 * invocation, which is expensive and pointless outside of tests.
 */
export declare function _resetClient(): void;
export declare function invokeBedrock(input: InvokeBedrockInput): Promise<InvokeBedrockResult>;
