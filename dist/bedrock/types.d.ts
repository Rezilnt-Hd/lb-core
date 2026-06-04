export type BedrockProvider = "anthropic" | "meta" | "amazon" | "deepseek";
/**
 * A single block within a multimodal message body. Discriminated by `type`.
 * Consumers construct these directly; the adapter translates to each provider's
 * native envelope shape (Anthropic wraps images under `source: { type: 'base64' }`).
 */
export type ContentBlock = {
    type: "text";
    text: string;
} | {
    type: "image";
    mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
    /** base64-encoded image bytes (no data: prefix). */
    data: string;
};
export interface BedrockMessage {
    role: "user" | "assistant";
    /**
     * Plain text (the common case) OR a multimodal block array. `ContentBlock[]`
     * is only valid for models where `supportsVision(modelId)` returns true —
     * the adapter throws BedrockAdapterError at build-request time otherwise.
     */
    content: string | ContentBlock[];
}
export interface InvokeBedrockInput {
    modelId: string;
    messages: BedrockMessage[];
    system?: string;
    maxTokens: number;
    temperature?: number;
    /** Logical call-site identifier for metric dimensions (e.g. "change-applier", "content-artifact"). */
    callSite?: string;
    /** Optional zod schema. When provided, the adapter parses + validates the JSON response and emits a SchemaPass metric. */
    responseSchema?: {
        parse: (raw: unknown) => unknown;
        safeParse: (raw: unknown) => {
            success: boolean;
        };
    };
}
export interface InvokeBedrockResult {
    text: string;
    stopReason: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
}
export declare class BedrockAdapterError extends Error {
    readonly modelId: string;
    readonly cause?: unknown | undefined;
    constructor(message: string, modelId: string, cause?: unknown | undefined);
}
