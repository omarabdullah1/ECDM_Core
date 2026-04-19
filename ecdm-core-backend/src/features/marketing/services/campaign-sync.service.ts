import { google, sheets_v4 } from 'googleapis';
import { getSheetsClient } from '../../../utils/googleAuth.utils';
import Campaign from '../models/campaign.model';
import { AppError } from '../../../utils/apiError';

interface SheetSyncInput {
    spreadsheetId: string;
    sheetRange: string;
    serviceAccountJson: string;
}

/**
 * Parse and normalize numeric values from Google Sheets
 * Handles formatted numbers with commas, currency symbols (EGP, USD, etc.)
 */
const parseNumber = (value: string | undefined): number => {
    if (!value) return 0;
    // Remove commas, currency symbols, whitespace, and common prefixes
    const cleaned = String(value).replace(/[,\s$€£¥EGP]/gi, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * Sync campaigns from Google Sheet to database
 * Expected columns (in order): Campaign, Status, Impressions, Conversions, Sales Revenue, Region 1, Region 2, Region 3, Ad Spend, CPA, ROAS, Next Steps, Notes
 */
export const syncCampaignsFromSheet = async (config: SheetSyncInput): Promise<{
    synced: number;
    created: number;
    updated: number;
    errors: string[];
}> => {
    console.log('📊 Starting campaign sync service...');
    console.log('Spreadsheet ID:', config.spreadsheetId);
    console.log('Sheet Range:', config.sheetRange);
    
    const sheets = await getSheetsClient(config.serviceAccountJson);
    console.log('✅ Google Sheets client authenticated');
    
    let response;
    try {
        console.log('📡 Fetching data from Google Sheets...');
        response = await sheets.spreadsheets.values.get({
            spreadsheetId: config.spreadsheetId,
            range: config.sheetRange,
        });
        console.log('✅ Data fetched successfully');
    } catch (error: unknown) {
        const err = error as { message?: string; code?: number };
        console.error('❌ Failed to fetch from Google Sheets:', err);
        if (err.code === 404) {
            throw new AppError('Spreadsheet not found. Check the Spreadsheet ID.', 404);
        }
        if (err.code === 403) {
            throw new AppError('Permission denied. Ensure the service account has access to the sheet.', 403);
        }
        throw new AppError(err.message || 'Failed to fetch data from Google Sheets', 500);
    }

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
        console.error('❌ No data found in the sheet');
        throw new AppError('No data found in the specified range', 404);
    }

    console.log(`📋 Found ${rows.length} total rows (including header)`);
    
    // Skip header row (assuming first row is headers)
    const dataRows = rows.slice(1);
    console.log(`🔄 Processing ${dataRows.length} data rows...`);
    
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2; // +2 because: 1 for header, 1 for 1-based index

        try {
            // Extract values from columns (A-M for 13 columns)
            const [
                campaign,
                status,
                impressions,
                conversions,
                salesRevenue,
                region1,
                region2,
                region3,
                adSpend,
                cpa,
                roas,
                nextSteps,
                notes
            ] = row;

            // Skip empty rows (no campaign name)
            if (!campaign || campaign.trim() === '') {
                continue;
            }

            const campaignName = campaign.trim();

            // Prepare campaign data with robust parsing
            const campaignData = {
                campaignName: campaignName,
                status: status?.trim() || '',
                impressions: parseNumber(impressions),
                conversions: parseNumber(conversions),
                salesRevenue: parseNumber(salesRevenue), // Parse as currency
                salesRevenuePercent: parseNumber(salesRevenue), // Keep for compatibility
                region1: region1?.trim() || '',
                region2: region2?.trim() || '',
                region3: region3?.trim() || '',
                adSpend: parseNumber(adSpend),
                cpa: parseNumber(cpa),
                roas: parseNumber(roas),
                nextSteps: nextSteps?.trim() || '',
                notes: notes?.trim() || '',
            };

            // Upsert campaign by campaignName
            const existingCampaign = await Campaign.findOne({ campaignName });

            if (existingCampaign) {
                // Update existing campaign
                await Campaign.findByIdAndUpdate(
                    existingCampaign._id,
                    { $set: campaignData },
                    { new: true, runValidators: true }
                );
                updated++;
            } else {
                // Create new campaign
                await Campaign.create(campaignData);
                created++;
            }

        } catch (error: unknown) {
            const err = error as { message?: string };
            const errorMsg = `Row ${rowNumber}: ${err.message || 'Unknown error'}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
        }
    }

    console.log('✅ Sync processing complete:');
    console.log(`  - Created: ${created}`);
    console.log(`  - Updated: ${updated}`);
    console.log(`  - Total synced: ${created + updated}`);
    console.log(`  - Errors: ${errors.length}`);

    return {
        synced: created + updated,
        created,
        updated,
        errors,
    };
};
