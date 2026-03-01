import * as XLSX from 'xlsx';
import Customer from '../../shared/models/contact.model';
import SalesData from '../models/sales-data.model';
import { AppError } from '../../../utils/apiError';
import { CustomerType, CustomerSector } from '../../shared/types/contact.types';

/**
 * Excel Import Service for Sales Data
 * Replicates the 2-step (Analyze → Commit) process from Marketing Google Sheets sync
 * but uses uploaded Excel files instead
 */

interface ExcelRow {
    Name: string;
    Phone: string;
    Address: string;
    Region: string;
    Date?: string;
    Sector?: string;
    Status?: string;
    'Type Of Order'?: string;
    'Sales platform'?: string;
    Order?: string;
    Notes?: string;
}

interface ParsedRow {
    name: string;
    phone: string;
    address: string;
    region: string;
    date?: string;
    sector?: string;
    status?: string;
    typeOfOrder?: string;
    salesPlatform?: string;
    order?: string;
    notes?: string;
}

export interface AnalyzedLead {
    rowIndex: number;
    data: ParsedRow;
    error?: string;
}

export interface AnalysisResult {
    newLeads: AnalyzedLead[];
    skipped: AnalyzedLead[];
    errors: AnalyzedLead[];
}

export interface CommitResult {
    created: number;
    skipped: number;
    errors: string[];
}

/**
 * Normalize phone number for consistent matching
 */
const normalizePhone = (phone: string): string => {
    return phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
};

/**
 * Map sector value to CustomerSector enum
 */
const mapSector = (sectorStr?: string): CustomerSector => {
    if (!sectorStr) return CustomerSector.Other;
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
 * Parse Excel row into structured format
 */
const parseExcelRow = (row: ExcelRow): ParsedRow => {
    return {
        name: (row.Name || '').trim(),
        phone: (row.Phone || '').trim(),
        address: (row.Address || '').trim(),
        region: (row.Region || '').trim(),
        date: row.Date ? (row.Date || '').trim() : undefined,
        sector: row.Sector ? (row.Sector || '').trim() : undefined,
        status: row.Status ? (row.Status || '').trim() : undefined,
        typeOfOrder: row['Type Of Order'] ? (row['Type Of Order'] || '').trim() : undefined,
        salesPlatform: row['Sales platform'] ? (row['Sales platform'] || '').trim() : undefined,
        order: row.Order ? (row.Order || '').trim() : undefined,
        notes: row.Notes ? (row.Notes || '').trim() : undefined,
    };
};

/**
 * STEP 1: Analyze Excel file
 * 
 * Parses the uploaded Excel file and validates mandatory fields.
 * Checks SSOT (Customer collection) for duplicates and existing SalesData records.
 * 
 * Categories:
 * - newLeads: Valid rows that need to be imported (either new customer or existing customer without SalesData)
 * - skipped: Rows where both Customer AND SalesData already exist
 * - errors: Rows missing mandatory fields (Name, Phone, Address, Region)
 */
export const analyzeExcelFile = async (fileBuffer: Buffer): Promise<AnalysisResult> => {
    const result: AnalysisResult = {
        newLeads: [],
        skipped: [],
        errors: [],
    };

    try {
        // Parse Excel file
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        
        if (!firstSheetName) {
            throw new AppError('Excel file is empty or has no sheets', 400);
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

        if (rawData.length === 0) {
            throw new AppError('Excel file contains no data rows', 400);
        }

        // Process each row
        for (let i = 0; i < rawData.length; i++) {
            const rowIndex = i + 2; // +2 for header row and 0-index
            const excelRow = rawData[i];
            const parsed = parseExcelRow(excelRow);

            // STRICT MANDATORY FIELD VALIDATION
            // Name, Phone, Address, and Region are REQUIRED
            const missingFields: string[] = [];
            if (!parsed.name) missingFields.push('Name');
            if (!parsed.phone) missingFields.push('Phone');
            if (!parsed.address) missingFields.push('Address');
            if (!parsed.region) missingFields.push('Region');

            if (missingFields.length > 0) {
                result.errors.push({
                    rowIndex,
                    data: parsed,
                    error: `Missing mandatory fields: ${missingFields.join(', ')}`,
                });
                continue;
            }

            // Normalize phone for lookup
            const normalizedPhone = normalizePhone(parsed.phone);

            // SSOT Cross-Reference: Check Customer collection
            const existingCustomer = await Customer.findOne({ phone: normalizedPhone }).lean();

            if (!existingCustomer) {
                // Case A: Brand new customer - needs creation
                result.newLeads.push({
                    rowIndex,
                    data: parsed,
                });
            } else {
                // Case B: Customer exists - check if SalesData exists
                const existingSalesData = await SalesData.findOne({ 
                    customer: existingCustomer._id 
                }).lean();

                if (!existingSalesData) {
                    // Case B1: Customer exists but NO SalesData - needs linking
                    result.newLeads.push({
                        rowIndex,
                        data: parsed,
                    });
                } else {
                    // Case B2: Both Customer AND SalesData exist - skip
                    result.skipped.push({
                        rowIndex,
                        data: parsed,
                    });
                }
            }
        }

        return result;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        const err = error as { message?: string };
        throw new AppError(`Failed to parse Excel file: ${err.message}`, 500);
    }
};

/**
 * STEP 2: Commit approved leads
 * 
 * Creates/updates Customer records (SSOT) and creates SalesData records.
 * Follows the dual-insertion pattern: Customer first, then SalesData.
 */
export const commitLeads = async (newLeads: AnalyzedLead[]): Promise<CommitResult> => {
    const result: CommitResult = {
        created: 0,
        skipped: 0,
        errors: [],
    };

    for (const lead of newLeads) {
        try {
            const normalizedPhone = normalizePhone(lead.data.phone);

            // ═══════════════════════════════════════════════════════════════════════
            // STEP 1: SSOT Upsert - Create or retrieve Customer document
            // Use .findOne() + .save() to ensure pre('save') hook fires for customerId
            // ═══════════════════════════════════════════════════════════════════════
            let customerDoc = await Customer.findOne({ phone: normalizedPhone });

            if (!customerDoc) {
                // Create new customer - triggers pre('save') hook to generate 'CUS-XXXX'
                customerDoc = new Customer({
                    phone: normalizedPhone,
                    name: lead.data.name,
                    address: lead.data.address,
                    region: lead.data.region,
                    sector: mapSector(lead.data.sector),
                    type: CustomerType.Other, // Default type
                    notes: lead.data.notes,
                });
                await customerDoc.save();
            }
            // If customer exists, we don't update it - we only create the SalesData link

            // Null guard
            if (!customerDoc || !customerDoc._id) {
                throw new AppError(`Failed to create/retrieve Customer for phone: ${normalizedPhone}`, 500);
            }

            // ═══════════════════════════════════════════════════════════════════════
            // STEP 2: Module Creation - Create SalesData document
            // Reference the Customer _id and populate remaining fields from Excel
            // ═══════════════════════════════════════════════════════════════════════
            
            // Double-check: SalesData should not exist (analyze phase should have filtered)
            const existingSalesData = await SalesData.findOne({ customer: customerDoc._id });
            
            if (existingSalesData) {
                result.skipped++;
                continue;
            }

            // Create new SalesData record
            await SalesData.create({
                customer: customerDoc._id,
                // Note: The current SalesData model requires marketingData and salesPerson
                // These fields need to be optional or we need to provide defaults
                // For now, we'll handle this in the model update or provide dummy values
                callDate: lead.data.date ? new Date(lead.data.date) : new Date(),
                callOutcome: lead.data.status || 'Pending',
                notes: [
                    lead.data.notes,
                    lead.data.order ? `Order: ${lead.data.order}` : null,
                    lead.data.typeOfOrder ? `Type: ${lead.data.typeOfOrder}` : null,
                    lead.data.salesPlatform ? `Platform: ${lead.data.salesPlatform}` : null,
                ].filter(Boolean).join(' | '),
            });

            result.created++;
        } catch (err) {
            const error = err as { message?: string };
            result.errors.push(`Row ${lead.rowIndex}: ${error.message || 'Failed to create'}`);
        }
    }

    return result;
};
