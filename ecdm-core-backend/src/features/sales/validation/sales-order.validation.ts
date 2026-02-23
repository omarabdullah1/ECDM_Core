import { z } from 'zod';
import { QuotationStatus, SalesOrderFinalStatus } from '../types/sales-order.types';

export const createSalesOrderSchema = z.object({
    salesLead:                  z.string().optional(),
    salesData:                  z.string().optional(),
    customer:                   z.string().min(1, 'Customer ID is required'),
    issueDescription:           z.string().min(1, 'Issue description is required'),
    siteInspectionDate:         z.string().optional(),
    technicalInspection:        z.boolean().optional(),
    technicalInspectionDetails: z.string().optional(),
    quotationNumber:            z.string().optional(),
    quotationStatus:            z.nativeEnum(QuotationStatus).optional(),
    finalStatus:                z.nativeEnum(SalesOrderFinalStatus).optional(),
    notes:                      z.string().max(2000).optional(),
});

export const updateSalesOrderSchema = createSalesOrderSchema.partial();
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>;
