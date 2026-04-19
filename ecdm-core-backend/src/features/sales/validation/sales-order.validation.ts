import { z } from 'zod';
import { QuotationStatus, SalesOrderFinalStatus, SecondFollowUpStatus, ThirdFollowUpStatus } from '../types/sales-order.types';

export const createSalesOrderSchema = z.object({
    salesLead: z.string().optional(),
    salesData: z.string().optional(),
    customer: z.string().min(1, 'Customer ID is required'),
    salesPerson: z.string().optional(),
    issueDescription: z.string().min(1, 'Issue description is required'),
    issue: z.string().optional(),
    typeOfOrder: z.string().optional(),
    salesPlatform: z.string().optional(),
    siteInspectionDate: z.string().optional(),
    isTechnicalInspectionRequired: z.boolean().optional(),
    technicalInspectionDate: z.string().optional(),
    technicalInspectionDetails: z.string().optional(),
    quotationFileUrl: z.string().optional(),

    // First Follow-Up
    followUpFirst: z.string().optional(),
    quotationStatusFirstFollowUp: z.nativeEnum(QuotationStatus).optional(),
    reasonOfQuotation: z.string().optional(),

    // Second Follow-Up
    followUpSecond: z.string().optional(),
    statusSecondFollowUp: z.union([z.nativeEnum(SecondFollowUpStatus), z.literal('')]).optional(),

    // Third Follow-Up
    followUpThird: z.string().optional(),
    finalStatusThirdFollowUp: z.union([z.nativeEnum(ThirdFollowUpStatus), z.literal('')]).optional(),

    // Legacy fields
    quotationStatus: z.nativeEnum(QuotationStatus).optional(),
    finalStatus: z.nativeEnum(SalesOrderFinalStatus).optional(),

    notes: z.string().max(2000).optional(),
});

/**
 * Update Schema - SSOT Enforcement
 * Only allows editing ORDER PROGRESSION fields.
 * Customer & Lead references MUST NOT be modified via updates.
 */
export const updateSalesOrderSchema = z.object({
    // Order Progression - Editable Fields Only
    issue: z.string().optional(),
    salesPerson: z.string().optional(),
    typeOfOrder: z.string().optional(),
    salesPlatform: z.string().optional(),
    siteInspectionDate: z.string().optional(),
    isTechnicalInspectionRequired: z.boolean().optional(),
    technicalInspectionDate: z.string().optional(),
    technicalInspectionDetails: z.string().optional(),
    quotationFileUrl: z.string().optional(),
    quotationFileName: z.string().optional(),

    // First Follow-Up
    followUpFirst: z.string().optional(),
    quotationStatusFirstFollowUp: z.nativeEnum(QuotationStatus).optional(),
    reasonOfQuotation: z.string().optional(),

    // Second Follow-Up
    followUpSecond: z.string().optional(),
    statusSecondFollowUp: z.union([z.nativeEnum(SecondFollowUpStatus), z.literal('')]).optional(),

    // Third Follow-Up
    followUpThird: z.string().optional(),
    finalStatusThirdFollowUp: z.union([z.nativeEnum(ThirdFollowUpStatus), z.literal('')]).optional(),

    // Legacy fields
    quotationStatus: z.nativeEnum(QuotationStatus).optional(),
    finalStatus: z.nativeEnum(SalesOrderFinalStatus).optional(),

    notes: z.string().max(2000).optional(),
    quotation: z.any().optional(),
    orderStatus: z.string().optional(),
});

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>;
