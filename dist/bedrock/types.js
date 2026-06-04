export class BedrockAdapterError extends Error {
    modelId;
    cause;
    constructor(message, modelId, cause) {
        super(message);
        this.modelId = modelId;
        this.cause = cause;
        this.name = "BedrockAdapterError";
    }
}
