import { z } from 'zod';
import { MarketingDataStatus } from '../types/marketing-data.types';

export const createMarketingDataSchema = z.object({
    name:        z.string().min(1, 'Name is required').max(150),
    phone:       z.string().min(1, 'Phone is required'),
    company:     z.string().optional(),
    email:       z.string().email().optional(),
    address:     z.string().optional(),
    region:      z.string().optional(),
    sector:      z.string().optional(),
    uploadBatch: z.string().min(1, 'Upload batch identifier is required'),
    dataSource:  z.string().optional(),
    status:      z.nativeEnum(MarketingDataStatus).optional(),
    customer:    z.string().optional(),
    notes:       z.string().max(2000).optional(),
});

export const updateMarketingDataSchema = createMarketingDataSchema.partial();
export type CreateMarketingDataInput = z.infer<typeof createMarketingDataSchema>;
export type UpdateMarketingDataInput = z.infer<typeof updateMarketingDataSchema>;
