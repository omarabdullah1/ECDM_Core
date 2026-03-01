import { z } from 'zod';
import { MarketingLeadSource, MarketingLeadStatus } from '../types/marketing-leads.types';
import { ContactType, ContactSector } from '../../shared/types/contact.types';

/**
 * Schema for creating a marketing lead
 * Accepts either:
 * - contactId (if Contact already exists)
 * - name + phone + type + sector (will upsert Contact automatically)
 */
export const createMarketingLeadSchema = z.object({
    // Reference to existing Contact (optional - will be created if not provided)
    contactId:   z.string().optional(),
    // Contact data (for upsert - required if contactId not provided)
    name:        z.string().min(1, 'Name is required').optional(),
    phone:       z.string().min(1, 'Phone is required').optional(),
    type:        z.nativeEnum(ContactType).optional(),
    sector:      z.nativeEnum(ContactSector).optional(),
    email:       z.string().email().optional(),
    company:     z.string().optional(),
    // Marketing-specific fields
    date:        z.string().or(z.date()).optional(),
    notes:       z.string().max(2000).optional(),
    source:      z.nativeEnum(MarketingLeadSource).optional(),
    status:      z.nativeEnum(MarketingLeadStatus).optional(),
    value:       z.number().min(0).optional(),
    campaign:    z.string().optional(),
    assignedTo:  z.string().optional(),
    // Legacy fields for backward compatibility
    title:       z.string().max(200).optional(),
    contactName: z.string().optional(),
    fullName:    z.string().optional(),
}).refine(
    (data) => data.contactId || (data.name && data.phone),
    { message: 'Either contactId or (name + phone) is required' }
);

export const updateMarketingLeadSchema = z.object({
    // Contact data updates (will update the referenced Contact)
    name:        z.string().min(1).optional(),
    type:        z.nativeEnum(ContactType).optional(),
    sector:      z.nativeEnum(ContactSector).optional(),
    email:       z.string().email().optional(),
    company:     z.string().optional(),
    // Marketing-specific fields
    date:        z.string().or(z.date()).optional(),
    notes:       z.string().max(2000).optional(),
    source:      z.nativeEnum(MarketingLeadSource).optional(),
    status:      z.nativeEnum(MarketingLeadStatus).optional(),
    value:       z.number().min(0).optional(),
    campaign:    z.string().optional(),
    assignedTo:  z.string().optional(),
});

export type CreateMarketingLeadInput = z.infer<typeof createMarketingLeadSchema>;
export type UpdateMarketingLeadInput = z.infer<typeof updateMarketingLeadSchema>;

// Google Sheets sync schemas
export const sheetSyncSchema = z.object({
    spreadsheetId: z.string().min(1, 'Spreadsheet ID is required'),
    sheetRange: z.string().min(1, 'Sheet range is required'),
    serviceAccountJson: z.string().min(1, 'Service account JSON is required'),
});

export const sheetWebhookSchema = z.object({
    row: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        type: z.string().optional(),
        sector: z.string().optional(),
        date: z.string().optional(),
        notes: z.string().optional(),
    }),
    action: z.enum(['create', 'update', 'delete']).optional(),
});

export type SheetSyncInput = z.infer<typeof sheetSyncSchema>;
export type SheetWebhookInput = z.infer<typeof sheetWebhookSchema>;
