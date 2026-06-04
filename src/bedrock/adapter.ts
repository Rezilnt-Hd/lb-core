import type { BedrockProvider, InvokeBedrockInput } from "./types.js";
import { BedrockAdapterError } from "./types.js";

export function detectProvider(modelId: string): BedrockProvider {
  // Strip leading inference-profile region prefix if present (us., global., eu., apac.)
  const stripped = modelId.replace(/^(us|global|eu|apac)\./, "");
  if (stripped.startsWith("anthropic.")) return "anthropic";
  if (stripped.startsWith("meta.")) return "meta";
  if (stripped.startsWith("amazon.")) return "amazon";
  if (stripped.startsWith("deepseek.")) return "deepseek";
  throw new BedrockAdapterError(
    `Unsupported Bedrock provider for modelId: ${modelId}`,
    modelId,
  );
}

export function buildRequestBody(input: InvokeBedrockInput): string {
  const provider = detectProvider(input.modelId);
  switch (provider) {
    case "anthropic":
    case "deepseek":
      return JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: input.maxTokens,
        ...(input.temperature !== undefined && {
          temperature: input.temperature,
        }),
        ...(input.system && { system: input.system }),
        messages: input.messages,
      });
    case "meta": {
      // Llama on Bedrock uses completion-style envelope.
      // Prepend system as a leading line; concatenate messages.
      const systemBlock = input.system ? `${input.system}\n\n` : "";
      const conversation = input.messages
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n");
      return JSON.stringify({
        prompt: systemBlock + conversation,
        max_gen_len: input.maxTokens,
        ...(input.temperature !== undefined && {
          temperature: input.temperature,
        }),
      });
    }
    case "amazon":
      return JSON.stringify({
        schemaVersion: "messages-v1",
        ...(input.system && { system: [{ text: input.system }] }),
        messages: input.messages.map((m) => ({
          role: m.role,
          content: [{ text: m.content }],
        })),
        inferenceConfig: {
          maxTokens: input.maxTokens,
          ...(input.temperature !== undefined && {
            temperature: input.temperature,
          }),
        },
      });
  }
}
