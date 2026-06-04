import { describe, it, expect } from "vitest";
import type {
  InvokeBedrockInput,
  InvokeBedrockResult,
} from "../../src/bedrock/types.js";
import { detectProvider } from "../../src/bedrock/adapter.js";

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

describe("detectProvider", () => {
  it("routes anthropic.* and us.anthropic.* to anthropic", () => {
    expect(detectProvider("anthropic.claude-sonnet-4-6")).toBe("anthropic");
    expect(detectProvider("us.anthropic.claude-opus-4-8")).toBe("anthropic");
  });
  it("routes meta.* and us.meta.* to meta", () => {
    expect(detectProvider("us.meta.llama3-3-70b-instruct-v1:0")).toBe("meta");
    expect(detectProvider("meta.llama4-maverick-17b-instruct-v1:0")).toBe(
      "meta",
    );
  });
  it("routes amazon.* and us.amazon.* to amazon", () => {
    expect(detectProvider("us.amazon.nova-micro-v1:0")).toBe("amazon");
    expect(detectProvider("amazon.nova-pro-v1:0")).toBe("amazon");
  });
  it("routes deepseek.* and us.deepseek.* to deepseek", () => {
    expect(detectProvider("us.deepseek.r1-v1:0")).toBe("deepseek");
  });
  it("throws on unknown provider", () => {
    expect(() => detectProvider("cohere.command-r-plus-v1:0")).toThrow(
      /unsupported/i,
    );
  });
});
