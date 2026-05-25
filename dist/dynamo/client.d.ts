import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export declare const docClient: DynamoDBDocumentClient;
export declare const TABLE_NAMES: {
    leads: string;
    sites: string;
    templates: string;
    targets: string;
};
