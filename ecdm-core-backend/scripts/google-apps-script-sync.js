/**
 * Google Apps Script for ECDM Core - Marketing Leads Real-time Sync
 * 
 * This script sends row data to your ECDM Core backend whenever the Google Sheet is edited.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire script
 * 4. Replace 'YOUR_ECDM_BACKEND_URL' with your actual backend URL (e.g., https://api.yourdomain.com)
 * 5. Save the script (Ctrl+S or Cmd+S)
 * 6. Run the setup() function once to create the trigger
 * 7. Authorize the script when prompted
 * 
 * EXPECTED SHEET FORMAT:
 * Column A: Name
 * Column B: Phone
 * Column C: Type (Google, Facebook, Instagram, etc.)
 * Column D: Sector (B2B, B2C, B2G, Hybrid, Other)
 * Column E: Date
 * Column F: Notes
 * 
 * Row 1 should be headers (will be ignored)
 */

// ==================== CONFIGURATION ====================
// Replace this URL with your ECDM Core backend URL
const ECDM_WEBHOOK_URL = 'YOUR_ECDM_BACKEND_URL/api/marketing/leads/sheet-webhook';

// Optional: Add an API key for security (if implemented on backend)
const API_KEY = '';

// Column mapping (0-indexed)
const COLUMNS = {
  NAME: 0,    // Column A
  PHONE: 1,   // Column B
  TYPE: 2,    // Column C
  SECTOR: 3,  // Column D
  DATE: 4,    // Column E
  NOTES: 5    // Column F
};
// ========================================================

/**
 * Run this function ONCE to set up the onEdit trigger.
 * Go to Run > setup in the Apps Script menu.
 */
function setup() {
  // Remove existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onEditTrigger') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new onEdit trigger
  ScriptApp.newTrigger('onEditTrigger')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  
  Logger.log('✅ Trigger created successfully! The script will now sync edits to ECDM Core.');
  SpreadsheetApp.getUi().alert('Setup Complete', 'The sync trigger has been created. Edits will now be sent to ECDM Core.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Trigger function called on every edit.
 * Sends the edited row data to ECDM Core backend.
 */
function onEditTrigger(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const row = range.getRow();
    
    // Skip header row
    if (row <= 1) return;
    
    // Get the entire row data
    const rowData = sheet.getRange(row, 1, 1, 6).getValues()[0];
    
    // Skip if phone is empty (required field)
    const phone = String(rowData[COLUMNS.PHONE] || '').trim();
    if (!phone) {
      Logger.log('Skipping row ' + row + ': No phone number');
      return;
    }
    
    // Build the payload
    const payload = {
      row: {
        name: String(rowData[COLUMNS.NAME] || '').trim(),
        phone: phone,
        type: String(rowData[COLUMNS.TYPE] || '').trim(),
        sector: String(rowData[COLUMNS.SECTOR] || '').trim(),
        date: formatDate(rowData[COLUMNS.DATE]),
        notes: String(rowData[COLUMNS.NOTES] || '').trim()
      },
      action: 'update' // or 'create' - backend handles upsert logic
    };
    
    // Send to ECDM Core
    sendToECDM(payload);
    
    Logger.log('✅ Row ' + row + ' synced to ECDM Core');
    
  } catch (error) {
    Logger.log('❌ Error in onEditTrigger: ' + error.message);
  }
}

/**
 * Send data to ECDM Core backend webhook.
 */
function sendToECDM(payload) {
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  // Add API key header if configured
  if (API_KEY) {
    options.headers = {
      'x-api-key': API_KEY
    };
  }
  
  const response = UrlFetchApp.fetch(ECDM_WEBHOOK_URL, options);
  const responseCode = response.getResponseCode();
  
  if (responseCode !== 200) {
    Logger.log('Warning: ECDM response code ' + responseCode + ': ' + response.getContentText());
  }
  
  return response;
}

/**
 * Format date value from sheet to ISO string.
 */
function formatDate(dateValue) {
  if (!dateValue) return '';
  
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  
  // Try to parse as date string
  const parsed = new Date(dateValue);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return String(dateValue);
}

/**
 * Manual sync function - sync all rows at once.
 * Useful for initial import or manual refresh.
 */
function syncAllRows() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  let synced = 0;
  let skipped = 0;
  let errors = 0;
  
  // Skip header row (index 0)
  for (let i = 1; i < data.length; i++) {
    const rowData = data[i];
    const phone = String(rowData[COLUMNS.PHONE] || '').trim();
    
    if (!phone) {
      skipped++;
      continue;
    }
    
    const payload = {
      row: {
        name: String(rowData[COLUMNS.NAME] || '').trim(),
        phone: phone,
        type: String(rowData[COLUMNS.TYPE] || '').trim(),
        sector: String(rowData[COLUMNS.SECTOR] || '').trim(),
        date: formatDate(rowData[COLUMNS.DATE]),
        notes: String(rowData[COLUMNS.NOTES] || '').trim()
      },
      action: 'update'
    };
    
    try {
      sendToECDM(payload);
      synced++;
    } catch (e) {
      errors++;
      Logger.log('Error syncing row ' + (i + 1) + ': ' + e.message);
    }
    
    // Rate limiting - avoid hitting API too fast
    Utilities.sleep(100);
  }
  
  const message = 'Sync complete!\n\n✅ Synced: ' + synced + '\n⊘ Skipped: ' + skipped + '\n❌ Errors: ' + errors;
  SpreadsheetApp.getUi().alert('Sync Results', message, SpreadsheetApp.getUi().ButtonSet.OK);
  Logger.log(message);
}

/**
 * Add custom menu to sheet for manual operations.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ECDM Sync')
    .addItem('Setup Trigger', 'setup')
    .addItem('Sync All Rows', 'syncAllRows')
    .addItem('Test Connection', 'testConnection')
    .addToUi();
}

/**
 * Test the connection to ECDM Core backend.
 */
function testConnection() {
  try {
    const testPayload = {
      row: {
        name: 'Test Lead',
        phone: 'TEST-CONNECTION',
        type: 'Other',
        sector: 'Other',
        date: new Date().toISOString().split('T')[0],
        notes: 'This is a test connection from Google Apps Script'
      },
      action: 'update'
    };
    
    const response = sendToECDM(testPayload);
    const code = response.getResponseCode();
    
    if (code === 200) {
      SpreadsheetApp.getUi().alert('Success', '✅ Connection to ECDM Core successful!\n\nNote: A test lead may have been created. You can delete it from the ECDM dashboard.', SpreadsheetApp.getUi().ButtonSet.OK);
    } else {
      SpreadsheetApp.getUi().alert('Warning', 'Connection returned status code: ' + code + '\n\n' + response.getContentText(), SpreadsheetApp.getUi().ButtonSet.OK);
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', '❌ Connection failed: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
