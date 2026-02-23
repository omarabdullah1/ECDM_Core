import { z } from 'zod';
import { MarketingLeadSource, MarketingLeadStatus } from '../types/marketing-leads.types';

export const createMarketingLeadSchema = z.object({
    title:       z.string().max(200).optional(),
    contactName: z.string().min(1, 'Contact name is required').optional(),
    fullName:    z.string().min(1, 'Name is required').optional(),
    email:       z.string().email().optional(),
    phone:       z.string().optional(),
    company:     z.string().optional(),
    source:      z.nativeEnum(MarketingLeadSource).optional(),
    status:      z.nativeEnum(MarketingLeadStatus).optional(),
    value:       z.number().min(0).optional(),
    campaign:    z.string().optional(),
    assignedTo:  z.string().optional(),
    notes:       z.string().max(2000).optional(),
});

export const updateMarketingLeadSchema = createMarketingLeadSchema.partial();
export type CreateMarketingLeadInput = z.infer<typeof createMarketingLeadSchema>;
export type UpdateMarketingLeadInput = z.infer<typeof updateMarketingLeadSchema>;
