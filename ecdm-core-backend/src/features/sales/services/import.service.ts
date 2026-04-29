import * as XLSX from 'xlsx';
import Customer from '../../shared/models/contact.model';
import SalesData from '../models/sales-data.model';
import { AppError } from '../../../utils/apiError';
import { CustomerType, CustomerSector } from '../../shared/types/contact.types';
import * as salesDataService from './sales-data.service';

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
        name: String(row.Name || '').trim(),
        phone: String(row.Phone || '').trim(),
        address: String(row.Address || '').trim(),
        region: String(row.Region || '').trim(),
        date: row.Date ? String(row.Date || '').trim() : undefined,
        sector: row.Sector ? String(row.Sector || '').trim() : undefined,
        status: row.Status ? String(row.Status || '').trim() : undefined,
        typeOfOrder: row['Type Of Order'] ? String(row['Type Of Order'] || '').trim() : undefined,
        salesPlatform: row['Sales platform'] ? String(row['Sales platform'] || '').trim() : undefined,
        order: row.Order ? String(row.Order || '').trim() : undefined,
        notes: row.Notes ? String(row.Notes || '').trim() : undefined,
    };
};

/**
 * STEP 1: Analyze Excel file
 */
export const analyzeExcelFile = async (fileBuffer: Buffer): Promise<AnalysisResult> => {
    const result: AnalysisResult = {
        newLeads: [],
        skipped: [],
        errors: [],
    };

    try {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new AppError('Excel file is empty or has no sheets', 400);
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

        if (rawData.length === 0) throw new AppError('Excel file contains no data rows', 400);

        for (let i = 0; i < rawData.length; i++) {
            const rowIndex = i + 2;
            const excelRow = rawData[i];
            const parsed = parseExcelRow(excelRow);

            const missingFields: string[] = [];
            if (!parsed.name) missingFields.push('Name');
            if (!parsed.phone) missingFields.push('Phone');
            if (!parsed.address) missingFields.push('Address');
            if (!parsed.region) missingFields.push('Region');

            if (missingFields.length > 0) {
                result.errors.push({ rowIndex, data: parsed, error: `Missing mandatory fields: ${missingFields.join(', ')}` });
                continue;
            }

            const normalizedPhone = normalizePhone(parsed.phone);
            const existingCustomer = await Customer.findOne({ phone: normalizedPhone }).lean();

            if (!existingCustomer) {
                result.newLeads.push({ rowIndex, data: parsed });
            } else {
                const existingSalesData = await SalesData.findOne({ customer: existingCustomer._id }).lean();
                if (!existingSalesData) {
                    result.newLeads.push({ rowIndex, data: parsed });
                } else {
                    result.skipped.push({ rowIndex, data: parsed });
                }
            }
        }
        return result;
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(`Failed to parse Excel file: ${(error as any).message}`, 500);
    }
};

/**
 * STEP 2: Commit approved leads
 * Uses the centralized salesDataService.create to ensure full synchronization.
 */
export const commitLeads = async (newLeads: AnalyzedLead[]): Promise<CommitResult> => {
    const result: CommitResult = {
        created: 0,
        skipped: 0,
        errors: [],
    };

    for (const lead of newLeads) {
        try {
            // Offload full resolution and sync to the robust Service layer
            await salesDataService.create({
                customerName: lead.data.name,
                customerPhone: lead.data.phone,
                customerAddress: lead.data.address,
                customerRegion: lead.data.region,
                customerSector: mapSector(lead.data.sector),
                callDate: lead.data.date ? new Date(lead.data.date).toISOString() : new Date().toISOString(),
                callOutcome: (lead.data.status as any) || 'Pending',
                typeOfOrder: (lead.data.typeOfOrder as any) || '',
                salesPlatform: (lead.data.salesPlatform as any) || '',
                order: (lead.data.order as any) || '',
                notes: lead.data.notes,
                // Note: followUp is currently not mapped from Excel, but we could add it if requested
                followUp: lead.data.status === 'Interested' ? 'Yes' : 'No', 
            });

            result.created++;
        } catch (err) {
            result.errors.push(`Row ${lead.rowIndex}: ${(err as any).message || 'Failed to create'}`);
        }
    }

    return result;
};

