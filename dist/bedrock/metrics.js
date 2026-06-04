import { CloudWatchClient, PutMetricDataCommand, StandardUnit, } from "@aws-sdk/client-cloudwatch";
let _cwClient;
function getCwClient() {
    if (!_cwClient) {
        _cwClient = new CloudWatchClient({
            region: process.env.AWS_REGION || "us-east-1",
        });
    }
    return _cwClient;
}
export async function emitBedrockMetrics(m) {
    const dims = [
        { Name: "CallSite", Value: m.callSite },
        { Name: "ModelId", Value: m.modelId },
    ];
    const metricData = [
        {
            MetricName: "InvocationLatency",
            Value: m.latencyMs,
            Unit: StandardUnit.Milliseconds,
            Dimensions: dims,
        },
        {
            MetricName: "OutputTokens",
            Value: m.outputTokens,
            Unit: StandardUnit.Count,
            Dimensions: dims,
        },
        {
            MetricName: "InputTokens",
            Value: m.inputTokens,
            Unit: StandardUnit.Count,
            Dimensions: dims,
        },
    ];
    if (m.schemaPass !== undefined) {
        metricData.push({
            MetricName: "SchemaPass",
            Value: m.schemaPass ? 1 : 0,
            Unit: StandardUnit.Count,
            Dimensions: dims,
        });
    }
    // Fire-and-forget: metric emission failure must NEVER block the main path.
    try {
        await getCwClient().send(new PutMetricDataCommand({
            Namespace: "LocalBuilder/Bedrock",
            MetricData: metricData,
        }));
    }
    catch {
        // Swallow.
    }
}
/** Test-only: reset cached client between tests. */
export function _resetCwClient() {
    _cwClient = undefined;
}
