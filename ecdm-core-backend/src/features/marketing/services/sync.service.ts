import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import Customer from '../../shared/models/contact.model';
import MarketingLead from '../models/marketing-lead.model';
import SalesLead from '../../sales/models/sales-lead.model';
import { CustomerType, CustomerSector } from '../../shared/types/contact.types';
import { AppError } from '../../../utils/apiError';

interface ServiceAccountCredentials {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
}

interface SheetRow {
    name: string;
    phone: string;
    type: string;
    sector: string;
    address?: string;
    date?: string;
    notes?: string;
}

// Types for the 2-step sync process
export interface AnalyzedLead {
    rowIndex: number;
    sheetData: SheetRow;
    existingData?: {
        _id: string;
        customerId: string;
        name: string;
        phone: string;
        type: string;
        sector: string;
        address?: string;
    };
}

export interface AnalysisResult {
    new: AnalyzedLead[];
    exactMatch: AnalyzedLead[];
    conflicts: AnalyzedLead[];
}

export interface CommitInput {
    serviceAccountJson: string;
    newLeads: AnalyzedLead[];
    conflictResolutions: Array<{
        rowIndex: number;
        action: 'update' | 'keep';
        data: AnalyzedLead;
    }>;
}

export interface CommitResult {
    created: number;
    updated: number;
    skipped: number;
    forwarded: number;
    errors: string[];
}

/**
 * Get authenticated Google Sheets client using service account credentials
 */
const getSheetsClient = async (serviceAccountJson: string): Promise<sheets_v4.Sheets> => {
    let credentials: ServiceAccountCredentials;
    
    try {
        credentials = JSON.parse(serviceAccountJson);
    } catch {
        throw new AppError('Invalid service account JSON format', 400);
    }

    if (!credentials.client_email || !credentials.private_key) {
        throw new AppError('Service account JSON missing required fields (client_email, private_key)', 400);
    }

    const auth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return google.sheets({ version: 'v4', auth });
};

/**
 * Normalize header names for consistent mapping
 * Handles variations like "Phone ", " phone", "PHONE", etc.
 */
const normalizeHeader = (header: string): string => {
    return (header || '').trim().toLowerCase();
};

/**
 * Build a column index map from the header row
 * Returns mapping of field names to column indices
 */
interface ColumnMap {
    name: number;
    phone: number;
    type: number;
    sector: number;
    address: number;
    notes: number;
}

const buildColumnMap = (headerRow: string[]): ColumnMap => {
    const map: ColumnMap = {
        name: -1,
        phone: -1,
        type: -1,
        sector: -1,
        address: -1,
        notes: -1,
    };

    headerRow.forEach((header, index) => {
        const normalized = normalizeHeader(header);
        
        // Map common variations of column names
        if (normalized === 'name' || normalized === 'customer name' || normalized === 'client name' || normalized === 'contact') {
            map.name = index;
        } else if (normalized === 'phone' || normalized === 'phone number' || normalized === 'mobile' || normalized === 'tel') {
            map.phone = index;
        } else if (normalized === 'type' || normalized === 'lead type' || normalized === 'source' || normalized === 'channel') {
            map.type = index;
        } else if (normalized === 'sector' || normalized === 'business type' || normalized === 'category') {
            map.sector = index;
        } else if (normalized === 'address' || normalized === 'location' || normalized === 'city') {
            map.address = index;
        } else if (normalized === 'notes' || normalized === 'note' || normalized === 'comments' || normalized === 'remarks') {
            map.notes = index;
        }
    });

    return map;
};

/**
 * Parse sheet row values into a structured lead object using column map
 * Applies value sanitization for enums
 */
const parseSheetRow = (row: string[], columnMap: ColumnMap): SheetRow => {
    const getValue = (index: number): string => {
        if (index < 0 || index >= row.length) return '';
        return (row[index] || '').trim();
    };

    return {
        name: getValue(columnMap.name),
        phone: getValue(columnMap.phone),
        type: getValue(columnMap.type),
        sector: getValue(columnMap.sector),
        address: getValue(columnMap.address),
        notes: getValue(columnMap.notes),
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
 * Normalize phone number for consistent matching
 */
const normalizePhone = (phone: string): string => {
    return phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
};

/**
 * Check if two values are effectively equal (handles type/sector enum mapping)
 */
const isEqual = (sheetVal: string, dbVal: string, type: 'type' | 'sector' | 'text'): boolean => {
    if (type === 'type') {
        return mapType(sheetVal) === dbVal;
    }
    if (type === 'sector') {
        return mapSector(sheetVal) === dbVal;
    }
    return (sheetVal || '').trim().toLowerCase() === (dbVal || '').trim().toLowerCase();
};

/**
 * STEP 1: Analyze Google Sheet data for conflicts
 * 
 * Fetches sheet data and compares with existing Customer records.
 * Categorizes results into: new, exactMatch, and conflicts.
 */
export const analyzeSheet = async (config: {
    spreadsheetId: string;
    sheetRange: string;
    serviceAccountJson: string;
}): Promise<AnalysisResult> => {
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
        return { new: [], exactMatch: [], conflicts: [] };
    }

    // Build column map from header row (first row)
    const headerRow = rows[0] as string[];
    const columnMap = buildColumnMap(headerRow);
    
    // Validate required columns were found
    if (columnMap.name < 0 || columnMap.phone < 0) {
        throw new AppError(
            'Could not find required columns. Please ensure your sheet has "Name" and "Phone" columns in the header row.',
            400
        );
    }

    // Skip header row, process data rows
    const dataRows = rows.slice(1);
    
    const result: AnalysisResult = {
        new: [],
        exactMatch: [],
        conflicts: [],
    };

    // Get all unique phones from the sheet
    const parsedRows: Array<{ rowIndex: number; data: SheetRow; normalizedPhone: string }> = [];
    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as string[];
        const parsed = parseSheetRow(row, columnMap);
        
        // Skip rows without phone or name
        if (!parsed.phone || !parsed.name) continue;
        
        const normalizedPhone = normalizePhone(parsed.phone);
        parsedRows.push({ rowIndex: i + 2, data: parsed, normalizedPhone }); // +2 for header + 0-index
    }

    // Fetch all existing customers with matching phones in one query
    const phones = parsedRows.map(r => r.normalizedPhone);
    const existingCustomers = await Customer.find({
        phone: { $in: phones }
    }).lean();
    
    const existingByPhone = new Map(
        existingCustomers.map(c => [c.phone, c])
    );

    // Fetch all existing MarketingLeads for these customers (two-tier SSOT check)
    const customerIds = existingCustomers.map(c => c._id);
    const existingMarketingLeads = await MarketingLead.find({
        customerId: { $in: customerIds }
    }).lean();
    
    const marketingLeadByCustomerId = new Map(
        existingMarketingLeads.map(ml => [ml.customerId.toString(), ml])
    );

    // Categorize each row
    for (const { rowIndex, data, normalizedPhone } of parsedRows) {
        const existing = existingByPhone.get(normalizedPhone);
        
        const analyzedLead: AnalyzedLead = {
            rowIndex,
            sheetData: data,
        };

        if (!existing) {
            // Condition A: Brand New - phone doesn't exist in Customer collection
            result.new.push(analyzedLead);
        } else {
            // Customer exists - now check if MarketingLead exists (two-tier check)
            const marketingLead = marketingLeadByCustomerId.get(existing._id.toString());
            
            if (!marketingLead) {
                // Condition B: Existing Customer, Missing Module Record
                // Classify as 'new' because it's a new lead for the Marketing module
                result.new.push(analyzedLead);
            } else {
                // Condition C: Both Customer and MarketingLead exist
                analyzedLead.existingData = {
                    _id: existing._id.toString(),
                    customerId: existing.customerId,
                    name: existing.name,
                    phone: existing.phone,
                    type: existing.type,
                    sector: existing.sector,
                    address: existing.address,
                };

                const nameMatch = isEqual(data.name, existing.name, 'text');
                const typeMatch = isEqual(data.type, existing.type, 'type');
                const sectorMatch = isEqual(data.sector, existing.sector, 'sector');
                const addressMatch = isEqual(data.address || '', existing.address || '', 'text');

                if (nameMatch && typeMatch && sectorMatch && addressMatch) {
                    // Exact match - skip
                    result.exactMatch.push(analyzedLead);
                } else {
                    // Conflict - data differs
                    result.conflicts.push(analyzedLead);
                }
            }
        }
    }

    return result;
};

/**
 * STEP 2: Commit approved changes
 * 
 * Creates new customers and updates selected conflicts.
 * Automatically forwards new customers to the Sales pipeline.
 */
export const commitSync = async (input: CommitInput): Promise<CommitResult> => {
    const result: CommitResult = {
        created: 0,
        updated: 0,
        skipped: 0,
        forwarded: 0,
        errors: [],
    };

    // ═══════════════════════════════════════════════════════════════════════
    // SMART AUTO-INCREMENT SETUP
    // Instead of relying on the counter, we use mathematical analysis to find
    // the highest existing customer ID to prevent E11000 duplicate key errors
    // ═══════════════════════════════════════════════════════════════════════
    const existingCustomersForId = await Customer.find({}, { customerId: 1 }).lean();
    let currentMaxId = 0;
    for (const c of existingCustomersForId) {
        if (c.customerId && c.customerId.startsWith('CUS-')) {
            const num = parseInt(c.customerId.replace('CUS-', ''), 10);
            if (!isNaN(num) && num > currentMaxId) currentMaxId = num;
        }
    }

    console.log(`📊 Smart Auto-Increment: Starting from CUS-${currentMaxId + 1}`);

    // Process new leads - create/upsert Customer and MarketingLead, forward to Sales if newly created
    for (const lead of input.newLeads) {
        try {
            const normalizedPhone = normalizePhone(lead.sheetData.phone);
            
            // ═══════════════════════════════════════════════════════════════════════
            // CRITICAL FIX: Use .findOne() + .save() instead of findOneAndUpdate
            // This ensures the Mongoose pre('save') hook fires to generate customerId
            // ═══════════════════════════════════════════════════════════════════════
            let customerDoc = await Customer.findOne({ phone: normalizedPhone });
            
            if (!customerDoc) {
                // Create new customer with smart auto-increment ID
                currentMaxId++;
                const newCustomerId = `CUS-${currentMaxId}`;
                
                customerDoc = new Customer({
                    customerId: newCustomerId,  // Explicitly assign to bypass pre-save hook
                    phone: normalizedPhone,
                    name: lead.sheetData.name,
                    type: mapType(lead.sheetData.type),
                    sector: mapSector(lead.sheetData.sector),
                    address: lead.sheetData.address,
                    notes: lead.sheetData.notes,
                });
                await customerDoc.save();
                console.log(`✅ Created customer with ID: ${newCustomerId}`);
            } else {
                // Update existing customer
                customerDoc.name = lead.sheetData.name;
                customerDoc.type = mapType(lead.sheetData.type);
                customerDoc.sector = mapSector(lead.sheetData.sector);
                customerDoc.address = lead.sheetData.address;
                customerDoc.notes = lead.sheetData.notes;
                await customerDoc.save();
            }
            
            // Null guard: Ensure Customer document was created/retrieved
            if (!customerDoc || !customerDoc._id) {
                throw new AppError(`Failed to create/retrieve Customer for phone: ${normalizedPhone}`, 500);
            }
            
            result.created++;

            // Upsert MarketingLead - recreates if deleted
            const marketingLeadDoc = await MarketingLead.findOneAndUpdate(
                { customerId: customerDoc._id },
                {
                    $set: {
                        date: new Date(),
                        notes: lead.sheetData.notes || '',
                    }
                },
                { upsert: true, new: true }
            );
            
            // Null guard: Ensure MarketingLead document was created/retrieved
            if (!marketingLeadDoc || !marketingLeadDoc._id) {
                throw new AppError(`Failed to create/retrieve MarketingLead for Customer ID: ${customerDoc._id}`, 500);
            }

            // ═══════════════════════════════════════════════════════════════════════
            // AUTO-FORWARDING PIPELINE: Marketing Leads → Sales Leads
            // ═══════════════════════════════════════════════════════════════════════
            // For EVERY lead synced from Google Sheets, check if it exists in Sales.
            // If not, automatically create a SalesLead so the Sales team can immediately
            // see and action it without manual intervention.
            
            try {
                // Step 1: Get the Customer ID (with explicit type validation)
                const customerId = customerDoc._id;
                const marketingLeadId = marketingLeadDoc._id;
                
                // Defensive check: Ensure we have valid IDs before proceeding
                if (!customerId) {
                    throw new Error('Customer ID is undefined');
                }
                if (!marketingLeadId) {
                    throw new Error('MarketingLead ID is undefined');
                }
                
                // Step 2: Duplicate Check - Does a SalesLead already exist for this customer?
                const existingSalesLead = await SalesLead.findOne({ customerId });
                
                // Step 3: Auto-Create Sales Lead (only if it doesn't exist)
                if (!existingSalesLead) {
                    await SalesLead.create({
                        customerId,
                        marketingLeadId,
                        date: new Date(),
                        issue: '',
                        order: '',
                        reason: '',
                        salesPerson: '',
                        notes: '',
                        status: 'New', // Critical: Visual indicator for Sales team
                    });
                    result.forwarded++;
                }
                // If SalesLead already exists, skip forwarding (no duplicate)
            } catch (err) {
                console.error('Failed to forward to Sales:', err);
                const error = err as { message?: string };
                result.errors.push(`Row ${lead.rowIndex}: Failed to forward to Sales pipeline - ${error.message}`);
            }
        } catch (err) {
            const error = err as { message?: string };
            result.errors.push(`Row ${lead.rowIndex}: ${error.message || 'Failed to create'}`);
        }
    }

    // Process conflict resolutions
    for (const resolution of input.conflictResolutions) {
        if (resolution.action === 'keep') {
            result.skipped++;
            continue;
        }

        if (resolution.action === 'update' && resolution.data.existingData) {
            try {
                // Use .findById() + .save() pattern to ensure pre-save hooks fire
                const customer = await Customer.findById(resolution.data.existingData._id);
                if (!customer) {
                    throw new AppError('Customer not found', 404);
                }
                
                customer.name = resolution.data.sheetData.name;
                customer.type = mapType(resolution.data.sheetData.type);
                customer.sector = mapSector(resolution.data.sheetData.sector);
                customer.address = resolution.data.sheetData.address;
                
                await customer.save();
                result.updated++;
            } catch (err) {
                const error = err as { message?: string };
                result.errors.push(`Row ${resolution.rowIndex}: ${error.message || 'Failed to update'}`);
            }
        }
    }

    return result;
};
