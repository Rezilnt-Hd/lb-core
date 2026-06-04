import { describe, it, expect } from "vitest";
import type {
  InvokeBedrockInput,
  InvokeBedrockResult,
} from "../../src/bedrock/types.js";

describe("adapter types", () => {
  it("InvokeBedrockInput has required fields", () => {
    const input: InvokeBedrockInput = {
      modelId: "anthropic.claude-sonnet-4-6",
      messages: [{ role: "user", content: "hello" }],
      maxTokens: 100,
    };
    expect(input.modelId).toBe("anthropic.claude-sonnet-4-6");
  });

  it("InvokeBedrockResult has uniform shape", () => {
    const result: InvokeBedrockResult = {
      text: "response",
      stopReason: "end_turn",
      usage: { inputTokens: 10, outputTokens: 5 },
    };
    expect(result.text).toBe("response");
  });
});
