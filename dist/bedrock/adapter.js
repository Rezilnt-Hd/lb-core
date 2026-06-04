import { BedrockAdapterError } from "./types.js";
import { BedrockRuntimeClient, InvokeModelCommand, } from "@aws-sdk/client-bedrock-runtime";
import { emitBedrockMetrics } from "./metrics.js";
export function detectProvider(modelId) {
    // Strip leading inference-profile region prefix if present (us., global., eu., apac.)
    const stripped = modelId.replace(/^(us|global|eu|apac)\./, "");
    if (stripped.startsWith("anthropic."))
        return "anthropic";
    if (stripped.startsWith("meta."))
        return "meta";
    if (stripped.startsWith("amazon."))
        return "amazon";
    if (stripped.startsWith("deepseek."))
        return "deepseek";
    throw new BedrockAdapterError(`Unsupported Bedrock provider for modelId: ${modelId}`, modelId);
}
export function buildRequestBody(input) {
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
export function parseResponseBody(modelId, rawBody) {
    const provider = detectProvider(modelId);
    const parsed = JSON.parse(rawBody);
    switch (provider) {
        case "anthropic": {
            const text = parsed.content?.find((c) => c.type === "text")
                ?.text ?? "";
            return {
                text,
                stopReason: parsed.stop_reason ?? "unknown",
                usage: {
                    inputTokens: parsed.usage?.input_tokens ?? 0,
                    outputTokens: parsed.usage?.output_tokens ?? 0,
                },
            };
        }
        case "deepseek": {
            // R1 uses Anthropic-compatible envelope but emits <think>...</think> blocks
            // before the answer. Strip all <think>...</think> spans.
            const rawText = parsed.content?.find((c) => c.type === "text")
                ?.text ?? "";
            const text = rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
            return {
                text,
                stopReason: parsed.stop_reason ?? "unknown",
                usage: {
                    inputTokens: parsed.usage?.input_tokens ?? 0,
                    outputTokens: parsed.usage?.output_tokens ?? 0,
                },
            };
        }
        case "meta":
            return {
                text: parsed.generation ?? "",
                stopReason: parsed.stop_reason ?? "unknown",
                usage: {
                    inputTokens: parsed.prompt_token_count ?? 0,
                    outputTokens: parsed.generation_token_count ?? 0,
                },
            };
        case "amazon": {
            const text = parsed.output?.message?.content?.find((c) => c.text)
                ?.text ?? "";
            return {
                text,
                stopReason: parsed.stopReason ?? "unknown",
                usage: {
                    inputTokens: parsed.usage?.inputTokens ?? 0,
                    outputTokens: parsed.usage?.outputTokens ?? 0,
                },
            };
        }
    }
}
let _client;
function getClient() {
    if (!_client) {
        _client = new BedrockRuntimeClient({
            region: process.env.AWS_REGION || "us-east-1",
        });
    }
    return _client;
}
/**
 * Test-only: reset the cached client so vi.mock can replace the SDK constructor.
 * Production code must NOT call this — it forces a fresh SDK client on the next
 * invocation, which is expensive and pointless outside of tests.
 */
export function _resetClient() {
    _client = undefined;
}
export async function invokeBedrock(input) {
    const start = Date.now();
    let result;
    try {
        const response = await getClient().send(new InvokeModelCommand({
            modelId: input.modelId,
            contentType: "application/json",
            accept: "application/json",
            body: buildRequestBody(input),
        }));
        const decoded = new TextDecoder().decode(response.body);
        result = parseResponseBody(input.modelId, decoded);
    }
    catch (err) {
        if (err instanceof BedrockAdapterError)
            throw err;
        throw new BedrockAdapterError(`Bedrock invocation failed for ${input.modelId}: ${err instanceof Error ? err.message : String(err)}`, input.modelId, err);
    }
    // Optional schema validation. Failures are observed via the SchemaPass metric;
    // they do NOT throw — the caller decides what to do with the (possibly invalid) text.
    let schemaPass;
    if (input.responseSchema) {
        try {
            const parsed = JSON.parse(result.text);
            schemaPass = input.responseSchema.safeParse(parsed).success;
        }
        catch {
            schemaPass = false;
        }
    }
    // Fire-and-forget metric emission. callSite defaults to 'unknown' for backward compat.
    void emitBedrockMetrics({
        callSite: input.callSite ?? "unknown",
        modelId: input.modelId,
        latencyMs: Date.now() - start,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        schemaPass,
    });
    return result;
}
