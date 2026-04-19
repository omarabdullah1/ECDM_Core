import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { AppError } from './apiError';

interface ServiceAccountCredentials {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
}

/**
 * Get authenticated Google Sheets client using service account credentials
 * Consolidates authentication logic and fixes common private_key formatting issues.
 */
export const getSheetsClient = async (serviceAccountJson: string): Promise<sheets_v4.Sheets> => {
    let credentials: ServiceAccountCredentials;
    
    try {
        // Handle both object and string inputs
        credentials = typeof serviceAccountJson === 'string' 
            ? JSON.parse(serviceAccountJson) 
            : serviceAccountJson;
    } catch {
        throw new AppError('Invalid service account JSON format', 400);
    }

    if (!credentials.client_email || !credentials.private_key) {
        throw new AppError('Service account JSON missing required fields (client_email, private_key)', 400);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CRITICAL FIX: The private_key must have real newline characters (\n).
    // Sometimes when provided via string or env variables, they are escaped as
    // literal "\n" characters. This regex fix ensures they are proper newlines.
    // ═══════════════════════════════════════════════════════════════════════
    const formattedKey = credentials.private_key.replace(/\\n/g, '\n');

    const now = Math.floor(Date.now() / 1000);
    const auth = new JWT({
        email: credentials.client_email,
        key: formattedKey.trim(),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        additionalClaims: {
            iat: now - 120,    // 2 minutes buffer for clock skew
            exp: now + 3360,   // 56 minutes from now (58 minutes total from iat)
        },
    });

    return google.sheets({ version: 'v4', auth });
};
