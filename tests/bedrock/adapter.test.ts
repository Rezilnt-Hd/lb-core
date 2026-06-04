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

import { parseResponseBody } from "../../src/bedrock/adapter.js";

describe("parseResponseBody", () => {
  it("parses Anthropic response shape", () => {
    const raw = JSON.stringify({
      content: [{ type: "text", text: "hello world" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 12, output_tokens: 7 },
    });
    const result = parseResponseBody("us.anthropic.claude-sonnet-4-6", raw);
    expect(result.text).toBe("hello world");
    expect(result.stopReason).toBe("end_turn");
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 7 });
  });

  it("parses Meta Llama response shape", () => {
    const raw = JSON.stringify({
      generation: "hello from llama",
      stop_reason: "stop",
      prompt_token_count: 8,
      generation_token_count: 5,
    });
    const result = parseResponseBody("us.meta.llama3-3-70b-instruct-v1:0", raw);
    expect(result.text).toBe("hello from llama");
    expect(result.stopReason).toBe("stop");
    expect(result.usage).toEqual({ inputTokens: 8, outputTokens: 5 });
  });

  it("parses Amazon Nova response shape", () => {
    const raw = JSON.stringify({
      output: { message: { content: [{ text: "hello from nova" }] } },
      stopReason: "end_turn",
      usage: { inputTokens: 10, outputTokens: 4 },
    });
    const result = parseResponseBody("us.amazon.nova-micro-v1:0", raw);
    expect(result.text).toBe("hello from nova");
    expect(result.stopReason).toBe("end_turn");
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 4 });
  });

  it("strips DeepSeek R1 <think> blocks from response text", () => {
    const raw = JSON.stringify({
      content: [
        {
          type: "text",
          text: "<think>reasoning here</think>\n\nfinal answer",
        },
      ],
      stop_reason: "end_turn",
      usage: { input_tokens: 5, output_tokens: 15 },
    });
    const result = parseResponseBody("us.deepseek.r1-v1:0", raw);
    expect(result.text).toBe("final answer");
    expect(result.stopReason).toBe("end_turn");
  });

  it("strips multiple/nested <think> blocks from DeepSeek", () => {
    const raw = JSON.stringify({
      content: [
        {
          type: "text",
          text: "<think>step 1</think> intermediate <think>step 2</think> conclusion",
        },
      ],
      stop_reason: "end_turn",
      usage: { input_tokens: 5, output_tokens: 15 },
    });
    const result = parseResponseBody("us.deepseek.r1-v1:0", raw);
    expect(result.text).toBe("intermediate  conclusion");
  });
});

import { invokeBedrock, _resetClient } from "../../src/bedrock/adapter.js";
import { vi, beforeEach } from "vitest";

const mockSend = vi.fn();
vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: vi.fn(() => ({ send: mockSend })),
  InvokeModelCommand: vi.fn((input) => ({ input })),
}));

describe("invokeBedrock", () => {
  beforeEach(() => {
    mockSend.mockReset();
    _resetClient();
  });

  it("invokes Bedrock with Anthropic envelope and returns normalized result", async () => {
    const responsePayload = JSON.stringify({
      content: [{ type: "text", text: "hello" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 3, output_tokens: 1 },
    });
    mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(responsePayload),
    });

    const result = await invokeBedrock({
      modelId: "us.anthropic.claude-sonnet-4-6",
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 100,
    });

    expect(result.text).toBe("hello");
    expect(result.usage.outputTokens).toBe(1);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("wraps SDK errors in BedrockAdapterError with modelId", async () => {
    mockSend.mockRejectedValueOnce(new Error("AccessDeniedException"));
    await expect(
      invokeBedrock({
        modelId: "us.amazon.nova-micro-v1:0",
        messages: [{ role: "user", content: "hi" }],
        maxTokens: 100,
      }),
    ).rejects.toMatchObject({
      name: "BedrockAdapterError",
      modelId: "us.amazon.nova-micro-v1:0",
    });
  });
});

const mockPutMetricData = vi.fn();
vi.mock("@aws-sdk/client-cloudwatch", () => ({
  CloudWatchClient: vi.fn(() => ({ send: mockPutMetricData })),
  PutMetricDataCommand: vi.fn((input) => ({ input })),
  StandardUnit: { Milliseconds: "Milliseconds", Count: "Count" },
}));

describe("invokeBedrock metrics", () => {
  beforeEach(() => {
    mockPutMetricData.mockReset();
    mockSend.mockReset();
    _resetClient();
  });

  it("emits latency + output-token metrics with callSite dimension", async () => {
    mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ type: "text", text: "ok" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 5, output_tokens: 3 },
        }),
      ),
    });
    mockPutMetricData.mockResolvedValueOnce({});

    await invokeBedrock({
      modelId: "us.anthropic.claude-sonnet-4-6",
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 100,
      callSite: "test-site",
    });

    // Wait a tick so the fire-and-forget metric emission resolves.
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockPutMetricData).toHaveBeenCalledTimes(1);
    const cmd = mockPutMetricData.mock.calls[0][0].input;
    expect(cmd.Namespace).toBe("LocalBuilder/Bedrock");
    const metricNames = cmd.MetricData.map(
      (m: { MetricName: string }) => m.MetricName,
    );
    expect(metricNames).toContain("InvocationLatency");
    expect(metricNames).toContain("OutputTokens");
    expect(cmd.MetricData[0].Dimensions).toContainEqual({
      Name: "CallSite",
      Value: "test-site",
    });
  });
});
