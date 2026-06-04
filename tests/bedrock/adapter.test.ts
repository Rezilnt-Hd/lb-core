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

import { buildRequestBody } from "../../src/bedrock/adapter.js";

describe("buildRequestBody", () => {
  const input = {
    modelId: "us.anthropic.claude-sonnet-4-6",
    messages: [{ role: "user" as const, content: "hi" }],
    system: "be brief",
    maxTokens: 100,
    temperature: 0.5,
  };

  it("anthropic envelope uses anthropic_version + max_tokens", () => {
    const body = JSON.parse(buildRequestBody(input));
    expect(body.anthropic_version).toBe("bedrock-2023-05-31");
    expect(body.max_tokens).toBe(100);
    expect(body.system).toBe("be brief");
    expect(body.messages[0].content).toBe("hi");
    expect(body.temperature).toBe(0.5);
  });

  it("meta envelope uses prompt + max_gen_len", () => {
    const body = JSON.parse(
      buildRequestBody({
        ...input,
        modelId: "us.meta.llama3-3-70b-instruct-v1:0",
      }),
    );
    expect(body.prompt).toContain("be brief");
    expect(body.prompt).toContain("hi");
    expect(body.max_gen_len).toBe(100);
    expect(body.temperature).toBe(0.5);
    expect(body.anthropic_version).toBeUndefined();
  });

  it("amazon nova envelope uses messages + inferenceConfig + schemaVersion", () => {
    const body = JSON.parse(
      buildRequestBody({ ...input, modelId: "us.amazon.nova-micro-v1:0" }),
    );
    expect(body.schemaVersion).toBe("messages-v1");
    expect(body.inferenceConfig.maxTokens).toBe(100);
    expect(body.inferenceConfig.temperature).toBe(0.5);
    expect(body.messages[0].content[0].text).toBe("hi");
    expect(body.system?.[0]?.text).toBe("be brief");
  });

  it("deepseek envelope mirrors anthropic shape", () => {
    const body = JSON.parse(
      buildRequestBody({ ...input, modelId: "us.deepseek.r1-v1:0" }),
    );
    expect(body.max_tokens).toBe(100);
    expect(body.messages[0].content).toBe("hi");
  });
});
