/**
 * Excel Template Generator for Sales Data Import
 * Generates a blank Excel file with predefined headers for data entry
 */

import * as XLSX from 'xlsx';

/**
 * Generates and triggers download of an Excel template for Sales Data import
 * 
 * Template Headers:
 * - Name (required)
 * - Phone (required)
 * - Address (required)
 * - Region (required)
 * - Date
 * - Sector
 * - Status
 * - Type Of Order
 * - Sales platform
 * - Order
 * - Notes
 */
export const downloadSalesDataTemplate = () => {
    // Define the exact headers as specified
    const headers = [
        'Name',
        'Phone',
        'Address',
        'Region',
        'Date',
        'Sector',
        'Status',
        'Type Of Order',
        'Sales platform',
        'Order',
        'Notes',
    ];

    // Create a worksheet with just the header row
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);

    // Optional: Set column widths for better UX
    worksheet['!cols'] = [
        { wch: 20 }, // Name
        { wch: 15 }, // Phone
        { wch: 30 }, // Address
        { wch: 15 }, // Region
        { wch: 12 }, // Date
        { wch: 12 }, // Sector
        { wch: 12 }, // Status
        { wch: 15 }, // Type Of Order
        { wch: 15 }, // Sales platform
        { wch: 20 }, // Order
        { wch: 30 }, // Notes
    ];

    // Create a workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Data');

    // Trigger download
    const fileName = `sales-data-template-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
