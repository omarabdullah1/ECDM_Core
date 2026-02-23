import { z } from 'zod';
import { CampaignPlatform, CampaignStatus } from './campaign.types';

export const createCampaignSchema = z.object({
    name:         z.string().min(1, 'Campaign name is required'),
    platform:     z.nativeEnum(CampaignPlatform),
    status:       z.nativeEnum(CampaignStatus),
    impressions:  z.number().int().min(0).optional(),
    conversions:  z.number().int().min(0).optional(),
    salesRevenue: z.number().min(0).optional(),
    budget:       z.number().min(0).optional(),
    startDate:    z.string().optional(),
    endDate:      z.string().optional(),
    notes:        z.string().optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
