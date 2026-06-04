export type BedrockProvider = "anthropic" | "meta" | "amazon" | "deepseek";
export interface BedrockMessage {
    role: "user" | "assistant";
    content: string;
}
export interface InvokeBedrockInput {
    modelId: string;
    messages: BedrockMessage[];
    system?: string;
    maxTokens: number;
    temperature?: number;
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
