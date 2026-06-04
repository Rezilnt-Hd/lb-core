import type { BedrockProvider } from "./types.js";
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
