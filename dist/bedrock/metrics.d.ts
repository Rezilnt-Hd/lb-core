export interface BedrockMetrics {
    callSite: string;
    modelId: string;
    latencyMs: number;
    outputTokens: number;
    inputTokens: number;
    schemaPass?: boolean;
}
export declare function emitBedrockMetrics(m: BedrockMetrics): Promise<void>;
/** Test-only: reset cached client between tests. */
export declare function _resetCwClient(): void;
