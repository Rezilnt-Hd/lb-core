import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const rawClient = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLE_NAMES = {
  leads: process.env.LEADS_TABLE || 'lb-leads-prod',
  sites: process.env.SITES_TABLE || 'lb-sites-prod',
  templates: process.env.TEMPLATES_TABLE || 'lb-templates-prod',
  targets: process.env.TARGETS_TABLE || 'lb-targets-prod',
};
