import { google, sheets_v4 } from 'googleapis';
import { getSheetsClient } from '../../../utils/googleAuth.utils';
import Contact from '../../shared/models/contact.model';
import MarketingLead from '../models/marketing-lead.model';
import SalesLead from '../../sales/models/sales-lead.model';
import { IMarketingLeadDocument } from '../types/marketing-leads.types';
import { CustomerType, CustomerSector } from '../../shared/types/contact.types';
import { SheetSyncInput, SheetWebhookInput } from '../validation/marketing-leads.validation';
import { AppError } from '../../../utils/apiError';

interface SheetRow {
    name?: string;
    phone?: string;
    type?: string;
    sector?: string;
    date?: string;
    notes?: string;
}

/**
 * Parse sheet row values into a structured lead object
 * Expected column order: Name, Phone, Type, Sector, Date, Notes
 */
const parseSheetRow = (row: string[]): SheetRow => {
    return {
        name: row[0]?.trim() || '',
        phone: row[1]?.trim() || '',
        type: row[2]?.trim() || '',
        sector: row[3]?.trim() || '',
        date: row[4]?.trim() || '',
        notes: row[5]?.trim() || '',
    };
};

/**
 * Map sheet type value to CustomerType enum
 */
const mapType = (typeStr: string): CustomerType => {
    const normalized = typeStr.toLowerCase().replace(/\s+/g, '');
    const typeMap: Record<string, CustomerType> = {
        'google': CustomerType.Google,
        'googleads': CustomerType.Google,
        'facebook': CustomerType.Facebook,
        'instagram': CustomerType.Instagram,
        'tiktok': CustomerType.TikTok,
        'snapchat': CustomerType.Snapchat,
        'whatsapp': CustomerType.WhatsApp,
        'website': CustomerType.Website,
        'referral': CustomerType.Referral,
        'coldcall': CustomerType.ColdCall,
        'cold call': CustomerType.ColdCall,
        'exhibition': CustomerType.Exhibition,
    };
    return typeMap[normalized] || CustomerType.Other;
};

/**
 * Map sheet sector value to CustomerSector enum
 */
const mapSector = (sectorStr: string): CustomerSector => {
    const normalized = sectorStr.toUpperCase().replace(/\s+/g, '');
    const sectorMap: Record<string, CustomerSector> = {
        'B2B': CustomerSector.B2B,
        'B2C': CustomerSector.B2C,
        'B2G': CustomerSector.B2G,
        'HYBRID': CustomerSector.Hybrid,
    };
    return sectorMap[normalized] || CustomerSector.Other;
};

/**
 * Parse date string (supports various formats)
 */
const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    
    // Try common date formats
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
    
    // Handle DD/MM/YYYY format
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
        const [day, month, year] = parts;
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        if (!isNaN(date.getTime())) return date;
    }
    
    return new Date();
};

/**
 * Sync leads from Google Sheet to database using SSOT Contact pattern
 * - Upserts Contact records first using phone as unique identifier
 * - Creates MarketingLead records referencing Contact
 * - Only forwards truly NEW leads to SalesLead collection
 */
export const syncFromSheet = async (config: SheetSyncInput): Promise<{
    synced: number;
    created: number;
    updated: number;
    skipped: number;
    forwarded: number;
    errors: string[];
}> => {
    const sheets = await getSheetsClient(config.serviceAccountJson);
    
    let response;
    try {
        response = await sheets.spreadsheets.values.get({
            spreadsheetId: config.spreadsheetId,
            range: config.sheetRange,
        });
    } catch (error: unknown) {
        const err = error as { message?: string; code?: number };
        if (err.code === 404) {
            throw new AppError('Spreadsheet not found. Check the Spreadsheet ID.', 404);
        }
        if (err.code === 403) {
            throw new AppError('Access denied. Make sure the service account has access to the spreadsheet.', 403);
        }
        throw new AppError(`Failed to fetch sheet data: ${err.message}`, 500);
    }

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
        return { synced: 0, created: 0, updated: 0, skipped: 0, forwarded: 0, errors: [] };
    }

    // Skip header row (first row)
    const dataRows = rows.slice(1);
    
    let skipped = 0;
    const errors: string[] = [];
    const parsedRows: Array<{ rowNum: number; normalizedPhone: string; data: ReturnType<typeof parseSheetRow> }> = [];

    // Parse and validate all rows
    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as string[];
        const rowNum = i + 2; // Account for 0-index and header row
        
        try {
            const parsed = parseSheetRow(row);
            
            // Skip rows without phone (unique identifier)
            if (!parsed.phone) {
                skipped++;
                continue;
            }

            // Skip rows without name
            if (!parsed.name) {
                skipped++;
                errors.push(`Row ${rowNum}: Missing name`);
                continue;
            }

            // Normalize phone for consistent matching
            const normalizedPhone = parsed.phone.replace(/\s+/g, '');
            parsedRows.push({ rowNum, normalizedPhone, data: parsed });
        } catch (error: unknown) {
            const err = error as { message?: string };
            errors.push(`Row ${rowNum}: ${err.message || 'Unknown error'}`);
        }
    }

    if (parsedRows.length === 0) {
        return { synced: 0, created: 0, updated: 0, skipped, forwarded: 0, errors };
    }

    // Step 1: Upsert Contact records
    const contactBulkOps = parsedRows.map(({ normalizedPhone, data }) => ({
        updateOne: {
            filter: { phone: normalizedPhone },
            update: {
                $set: {
                    name: data.name,
                    phone: normalizedPhone,
                    type: mapType(data.type || ''),
                    sector: mapSector(data.sector || ''),
                },
                $setOnInsert: { createdAt: new Date() },
            },
            upsert: true,
        },
    }));

    const contactResult = await Contact.bulkWrite(contactBulkOps, { ordered: false });
    const contactsCreated = contactResult.upsertedCount;
    const contactsUpdated = contactResult.modifiedCount;

    // Build a map of phone -> contactId (fetch all contacts we just upserted)
    const phones = parsedRows.map(r => r.normalizedPhone);
    const contacts = await Contact.find({ phone: { $in: phones } }, { _id: 1, phone: 1 }).lean();
    const phoneToCustomerId = new Map(contacts.map(c => [c.phone, c._id]));

    // Step 2: Upsert MarketingLead records (using contactId)
    const marketingBulkOps = parsedRows.map(({ normalizedPhone, data }) => {
        const customerId = phoneToCustomerId.get(normalizedPhone);
        return {
            updateOne: {
                filter: { customerId },
                update: {
                    $set: {
                        customerId,
                        date: parseDate(data.date || ''),
                        notes: data.notes || '',
                    },
                    $setOnInsert: { createdAt: new Date() },
                },
                upsert: true,
            },
        };
    });

    const marketingResult = await MarketingLead.bulkWrite(marketingBulkOps, { ordered: false });
    const created = marketingResult.upsertedCount;
    const updated = marketingResult.modifiedCount;
    let forwarded = 0;

    // Step 3: Auto-forward ONLY truly new MarketingLeads to Sales pipeline
    if (marketingResult.upsertedCount > 0 && marketingResult.upsertedIds) {
        const newLeadIds = Object.values(marketingResult.upsertedIds);
        
        // Fetch the newly created MarketingLeads
        const newMarketingLeads = await MarketingLead.find({
            _id: { $in: newLeadIds },
        }).lean();

        // Create SalesLead records for each new marketing lead
        const salesLeadOps = newMarketingLeads.map((ml) => ({
            insertOne: {
                document: {
                    customerId: ml.customerId,
                    date: ml.date || new Date(),
                    marketingLeadId: ml._id,
                    issue: '',
                    order: '',
                    reason: '',
                    salesPerson: '',
                    notes: '',
                    status: 'New',
                },
            },
        }));

        if (salesLeadOps.length > 0) {
            try {
                const salesResult = await SalesLead.bulkWrite(salesLeadOps, { ordered: false });
                forwarded = salesResult.insertedCount;
            } catch (error) {
                console.error('Failed to forward new leads to Sales pipeline:', error);
                errors.push('Some leads failed to forward to Sales pipeline');
            }
        }
    }

    return {
        synced: contactsCreated + contactsUpdated,
        created,
        updated,
        skipped,
        forwarded,
        errors,
    };
};

/**
 * Handle webhook from Google Apps Script when sheet is edited
 * - Uses SSOT Contact pattern with phone as unique identifier
 * - Only forwards truly NEW leads to SalesLead collection
 */
export const handleSheetWebhook = async (data: SheetWebhookInput): Promise<{
    lead: IMarketingLeadDocument | null;
    isNew: boolean;
    forwardedToSales: boolean;
}> => {
    const { row, action = 'create' } = data;
    
    if (!row.phone) {
        throw new AppError('Phone number is required for sync', 400);
    }

    // Normalize phone for consistent matching
    const normalizedPhone = row.phone.replace(/\s+/g, '');

    if (action === 'delete') {
        // Find the contact first to get the MarketingLead
        const contact = await Contact.findOne({ phone: normalizedPhone }).lean();
        if (contact) {
            const deleted = await MarketingLead.findOneAndDelete({ customerId: contact._id });
            return { lead: deleted, isNew: false, forwardedToSales: false };
        }
        return { lead: null, isNew: false, forwardedToSales: false };
    }

    // Step 1: Upsert Contact record
    const contactData = {
        name: row.name || '',
        phone: normalizedPhone,
        type: mapType(row.type || ''),
        sector: mapSector(row.sector || ''),
    };

    const contact = await Contact.findOneAndUpdate(
        { phone: normalizedPhone },
        {
            $set: contactData,
            $setOnInsert: { createdAt: new Date() },
        },
        {
            upsert: true,
            new: true,
            runValidators: true,
        }
    );

    // Step 2: Check if MarketingLead exists BEFORE upserting (to detect if this is truly new)
    const existingLead = await MarketingLead.findOne({ customerId: contact._id }).lean();
    const isNew = !existingLead;

    const leadData = {
        customerId: contact._id,
        date: parseDate(row.date || ''),
        notes: row.notes || '',
    };

    // Step 3: Upsert the MarketingLead
    const lead = await MarketingLead.findOneAndUpdate(
        { customerId: contact._id },
        {
            $set: leadData,
            $setOnInsert: { createdAt: new Date() },
        },
        {
            upsert: true,
            new: true,
            runValidators: true,
        }
    );

    let forwardedToSales = false;

    // Step 4: Auto-forward to Sales ONLY if this is a truly NEW lead
    if (isNew && lead) {
        try {
            await SalesLead.create({
                customerId: contact._id,
                date: lead.date || new Date(),
                marketingLeadId: lead._id,
                issue: '',
                order: '',
                reason: '',
                salesPerson: '',
                notes: '',
                status: 'New',
            });
            forwardedToSales = true;
        } catch (error) {
            console.error('Failed to forward new lead to Sales pipeline:', error);
        }
    }

    return { lead, isNew, forwardedToSales };
};

