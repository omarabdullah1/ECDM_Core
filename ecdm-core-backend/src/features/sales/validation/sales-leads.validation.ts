import { z } from 'zod';
import { SalesLeadStatus } from '../types/sales-leads.types';

/**
 * Schema for creating a sales lead
 * Requires contactId reference to the SSOT Contact entity
 */
const TYPE_OF_ORDER = ['', 'Maintenance', 'General supplies', 'Supply and installation'] as const;
const SALES_PLATFORM = ['', 'Online', 'In Side', 'Phone', 'Out side', 'Data'] as const;

export const createSalesLeadSchema = z.object({
    // Reference to Contact (SSOT) - required
    contactId:       z.string().min(1, 'Contact ID is required'),
    // Sales-specific pipeline fields
    issue:           z.string().optional(),
    order:           z.string().optional(),
    reason:          z.string().optional(),
    salesPerson:     z.string().optional(),
    status:          z.nativeEnum(SalesLeadStatus).optional(),
    typeOfOrder:     z.enum(TYPE_OF_ORDER).optional(),
    salesPlatform:   z.enum(SALES_PLATFORM).optional(),
    date:            z.string().optional(),
    notes:           z.string().max(2000).optional(),
    marketingLeadId: z.string().optional(),
});

/**
 * Schema for updating a sales lead
 * Cannot change contactId - update Contact directly if needed
 * 
 * Address and Region are included here for dual-update convenience:
 * The controller will route these to the Customer model (SSOT)
 */
export const updateSalesLeadSchema = z.object({
    // Sales-specific pipeline fields
    issue:         z.string().optional(),
    order:         z.string().optional(),
    reason:        z.string().optional(),
    salesPerson:   z.string().optional(),
    status:        z.nativeEnum(SalesLeadStatus).optional(),
    typeOfOrder:   z.enum(TYPE_OF_ORDER).optional(),
    salesPlatform: z.enum(SALES_PLATFORM).optional(),
    notes:         z.string().max(2000).optional(),
    // Customer fields (SSOT) - will be routed to Customer model
    address:       z.string().max(500).optional(),
    region:        z.string().optional(),
});

export type CreateSalesLeadInput = z.infer<typeof createSalesLeadSchema>;
export type UpdateSalesLeadInput = z.infer<typeof updateSalesLeadSchema>;
