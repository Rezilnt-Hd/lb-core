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
  /** Logical call-site identifier for metric dimensions (e.g. "change-applier", "content-artifact"). */
  callSite?: string;
  /** Optional zod schema. When provided, the adapter parses + validates the JSON response and emits a SchemaPass metric. */
  responseSchema?: {
    parse: (raw: unknown) => unknown;
    safeParse: (raw: unknown) => { success: boolean };
  };
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
