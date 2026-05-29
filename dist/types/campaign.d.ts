export type CampaignStatus = 'pending_review' | 'approved' | 'rejected';
export interface InstantlyStep {
    type: 'email';
    delay: number;
    delay_unit: 'days';
    variants: Array<{
        subject: string;
        body: string;
    }>;
}
export interface InstantlySequence {
    name: string;
    sequences: Array<{
        steps: InstantlyStep[];
    }>;
}
export interface Campaign {
    pk: 'CAMPAIGN';
    sk: string;
    niche: string;
    status: CampaignStatus;
    generatedCopy: InstantlySequence;
    campaignUuid?: string;
    sourceCampaignUuid: string;
    bedrockModelId: string;
    createdAt: string;
    approvedAt?: string;
}
