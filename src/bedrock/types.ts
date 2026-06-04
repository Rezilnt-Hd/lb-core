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
  usage: { inputTokens: number; outputTokens: number };
}

export class BedrockAdapterError extends Error {
  constructor(
    message: string,
    public readonly modelId: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "BedrockAdapterError";
  }
}
