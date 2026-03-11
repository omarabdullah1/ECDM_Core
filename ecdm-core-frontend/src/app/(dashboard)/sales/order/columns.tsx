'use client';
import { useState, useEffect } from 'react';
import { Edit2, Trash2, History, Eye, Download, FileText, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { API_BASE_URL } from '@/lib/constants';
import { generateQuotationPDF } from '@/utils/generateQuotationPDF';

/**
 * Sales Orders Data Table - Column Definitions
 * 
 * CEO-Approved Column Structure (23 Columns Total)
 * Implements SSOT pattern for Customer data
 * All date fields formatted as DateTime (dd/MM/yyyy HH:mm)
 */

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface Customer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  address?: string;
  sector?: string;
  email?: string;
}

interface SalesLead {
  _id: string;
  issue?: string;
  order?: string;
  salesPerson?: string;
  date?: string;
  typeOfOrder?: string;
  salesPlatform?: string;
}

interface SalesData {
  _id: string;
  issue?: string;
  salesPerson?: {
    _id: string;
    firstName?: string;
    lastName?: string;
  };
  typeOfOrder?: string;
  salesPlatform?: string;
}

export interface SalesOrder {
  _id: string;
  salesOrderId?: string;

  // Populated references (SSOT)
  customer?: Customer;
  customerId?: Customer; // Alternative population field name
  salesLead?: SalesLead;
  salesData?: SalesData;

  // Core order fields
  issueDescription?: string;
  issue?: string;  // Editable issue field for order phase
  typeOfOrder?: string;
  salesPlatform?: string;
  siteInspectionDate?: string;
  isTechnicalInspectionRequired?: boolean; // ✓ CORRECTED: matches backend schema
  technicalInspectionDate?: string;
  technicalInspectionDetails?: string;
  quotationNumber?: string;
  quotationFileUrl?: string;
  quotationFileName?: string;
  quotationStatus?: string;
  reasonOfQuotation?: string;
  finalStatus?: string;
  salesPerson?: string; // Reference to User (salesperson)
  salesPersonId?: string; // Alternative field name for backward compatibility
  notes?: string;

  // Dynamic Quotation Builder
  quotation?: {
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subTotal: number;
    discount: number;
    grandTotal: number;
    notes?: string;
    createdAt?: Date;
  };

  // Follow-up fields
  followUpFirst?: string;
  quotationStatusFirstFollowUp?: string;
  followUpSecond?: string;
  statusSecondFollowUp?: string;
  followUpThird?: string;
  finalStatusThirdFollowUp?: string;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────// File URL Helper
// ─────────────────────────────────────────────────────────────────────────

/**
 * Convert relative file path to full URL
 * @param relativePath - Path stored in DB (e.g., "/uploads/quotations/file.pdf")
 * @returns Full URL to access the file
 */
const getFileUrl = (relativePath: string): string => {
  if (!relativePath) return '';

  // Safely remove /api and trailing slashes from the base URL
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

  // Ensure the relative path starts with exactly one slash
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  // Construct the full URL
  const fullUrl = `${baseUrl}${cleanPath}`;

  console.log('🔗 Constructed file URL:', fullUrl);
  return fullUrl;
};

/**
 * Robust file download handler with error handling
 * @param url - Full URL of the file to download
 * @param filename - Desired filename for the download
 */
const handleDownload = async (url: string, filename: string) => {
  try {
    console.log('⬇️ Attempting download from:', url);

    const response = await fetch(url);
    const contentType = response.headers.get('content-type');

    console.log('📊 Response status:', response.status);
    console.log('📄 Content-Type:', contentType);

    // Guard: If not OK, or if the server returned an HTML error page instead of a file
    if (!response.ok || (contentType && contentType.includes('text/html'))) {
      throw new Error('File not found or invalid response from server');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    console.log('✅ Download successful:', filename);
    toast.success('File downloaded successfully!');
  } catch (err) {
    console.error('❌ Download failed:', err);
    toast.error('File not found! It may have been deleted or the path is invalid.');
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Quotation Cell Component (Smart File Viewer)
// - PDFs: Blob Object URLs (bypasses X-Frame-Options)
// - Word Docs: Microsoft Office Web Viewer (with localhost fallback)
// ─────────────────────────────────────────────────────────────────────────

interface QuotationCellProps {
  fileUrl: string | undefined;
  fileName: string | undefined;
}

function QuotationCell({ fileUrl, fileName }: QuotationCellProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Memory cleanup: Revoke blob URL when dialog closes or component unmounts
  useEffect(() => {
    if (!isPreviewOpen && blobUrl) {
      console.log('🧹 Cleaning up blob URL:', blobUrl);
      window.URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  }, [isPreviewOpen, blobUrl]);

  if (!fileUrl) {
    return <span className="text-gray-400 text-xs">No File</span>;
  }

  const fullFileUrl = getFileUrl(fileUrl);
  const displayFileName = fileName || 'Document';

  // Detect file type
  const fileExtension = fileName?.split('.').pop()?.toLowerCase();
  const isPdf = fileExtension === 'pdf';
  const isWordDoc = fileExtension === 'doc' || fileExtension === 'docx';

  // Localhost detection (Microsoft Office Viewer cannot access localhost files)
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  /**
   * Handle View button click
   * - For PDFs: Fetch as Blob and create Object URL
   * - For Word Docs on localhost: Just open dialog (will show fallback UI)
   * - For Word Docs on live domain: Just open dialog (will use MS Office Viewer)
   */
  const handleView = async () => {
    setIsPreviewOpen(true);

    // For Word docs, skip blob fetching (use MS Office Viewer or show fallback)
    if (isWordDoc) {
      console.log('📝 Word document detected:', displayFileName);
      if (isLocalhost) {
        console.log('⚠️ Localhost detected - Microsoft Office Viewer unavailable');
      } else {
        console.log('✅ Using Microsoft Office Web Viewer');
      }
      return;
    }

    // For PDFs: Fetch as Blob
    if (isPdf) {
      setIsLoadingPreview(true);

      try {
        console.log('👁️ Loading PDF preview from:', fullFileUrl);

        const response = await fetch(fullFileUrl);
        const contentType = response.headers.get('content-type');

        if (!response.ok || (contentType && contentType.includes('text/html'))) {
          throw new Error('Failed to fetch file for preview');
        }

        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);

        console.log('✅ Blob URL created:', objectUrl);
        setBlobUrl(objectUrl);
      } catch (error) {
        console.error('❌ Preview error:', error);
        toast.error('Could not load document preview.');
        setIsPreviewOpen(false);
      } finally {
        setIsLoadingPreview(false);
      }
    }
  };

  /**
   * Render Dialog Content based on file type
   */
  const renderDialogContent = () => {
    // PDF: Show loading, blob iframe, or error
    if (isPdf) {
      if (isLoadingPreview) {
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading PDF preview...</span>
          </div>
        );
      }

      if (blobUrl) {
        return (
          <iframe
            src={blobUrl}
            className="w-full h-full border-0"
            title="PDF Viewer"
          />
        );
      }

      return (
        <div className="flex flex-col items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">Preview not available</span>
          <button
            onClick={handleView}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    // Word Doc on Localhost: Show fallback UI
    if (isWordDoc && isLocalhost) {
      return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-full">
            <FileText className="h-16 w-16 text-blue-500" />
          </div>
          <div className="text-center max-w-md space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Word Document Preview Unavailable
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Word document previews require a live internet domain. Microsoft Office Viewer cannot access files on localhost.
            </p>
          </div>
          <button
            onClick={() => {
              handleDownload(fullFileUrl, displayFileName);
              setIsPreviewOpen(false);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            <Download className="h-5 w-5" />
            Download to View
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {displayFileName}
          </p>
        </div>
      );
    }

    // Word Doc on Live Domain: Use Microsoft Office Viewer
    if (isWordDoc && !isLocalhost) {
      // Construct full URL for Microsoft Office Viewer
      const msViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullFileUrl)}`;

      return (
        <iframe
          src={msViewerUrl}
          className="w-full h-full border-0"
          title="Word Document Viewer"
        />
      );
    }

    // Unsupported file type
    return (
      <div className="flex flex-col items-center gap-4">
        <FileText className="h-12 w-12 text-gray-400" />
        <span className="text-gray-500 dark:text-gray-400">Preview not available for this file type</span>
        <button
          onClick={() => {
            handleDownload(fullFileUrl, displayFileName);
            setIsPreviewOpen(false);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Download File
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <span className="truncate max-w-[80px] text-xs" title={displayFileName}>
          {displayFileName}
        </span>

        {/* View Button */}
        <button
          onClick={handleView}
          className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-500 transition-colors"
          title="View File"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>

        {/* Download Button */}
        <button
          onClick={() => handleDownload(fullFileUrl, displayFileName)}
          className="p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded text-green-500 transition-colors"
          title="Download File"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Smart File Viewer Dialog - PDF/Word Support */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-[hsl(var(--border))]">
            <DialogTitle className="text-lg font-semibold">
              {displayFileName}
              {isWordDoc && isLocalhost && (
                <span className="ml-2 text-xs font-normal text-yellow-600 dark:text-yellow-500">
                  (Preview unavailable on localhost)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full h-full bg-gray-100 dark:bg-gray-900 overflow-hidden flex items-center justify-center">
            {renderDialogContent()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────// DateTime Formatting Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format date as DateTime: dd/MM/yyyy HH:mm
 * @param dateValue - ISO date string or Date object
 * @returns Formatted date string or "-"
 */
const formatDateTime = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return '-';

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '-';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Column Definitions (23 Columns - CEO Approved Order)
// ─────────────────────────────────────────────────────────────────────────────

interface SalesOrderColumnsConfig {
  onEdit?: (row: SalesOrder) => void;
  onDelete?: (row: SalesOrder) => void;
  onHistory?: (row: SalesOrder) => void;
  onCreateQuotation?: (row: SalesOrder) => void;
}

export const createSalesOrderColumns = (config?: SalesOrderColumnsConfig) => {
  const { onEdit, onDelete, onHistory, onCreateQuotation } = config || {};

  return [
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Checkbox Column (Bulk Delete)
    // Note: This is handled automatically by DataTable component
    // No need to define explicitly - it's added when bulkDeleteEndpoint is provided
    // ─────────────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────────────
    // 2. CustomerID (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.customerId',
      header: 'Customer ID',
      render: (row: SalesOrder) => {
        const customer = row.customer || row.customerId;
        const custId = customer?.customerId;
        return (
          <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
            {custId || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Name (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.name',
      header: 'Name',
      render: (row: SalesOrder) => {
        const customer = row.customer || row.customerId;
        const name = customer?.name;
        return (
          <span className="font-medium">
            {name || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Phone (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.phone',
      header: 'Phone',
      render: (row: SalesOrder) => {
        const customer = row.customer || row.customerId;
        const phone = customer?.phone;
        return (
          <span className="font-mono text-sm">
            {phone || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Address (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.address',
      header: 'Address',
      render: (row: SalesOrder) => {
        const customer = row.customer || row.customerId;
        const address = customer?.address;
        return (
          <div className="max-w-[150px] truncate text-sm" title={address}>
            {address || '-'}
          </div>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Sector (SSOT from Customer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'customer.sector',
      header: 'Sector',
      render: (row: SalesOrder) => {
        const customer = row.customer || row.customerId;
        const sector = customer?.sector;
        return (
          <span className="text-sm">
            {sector || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Initial Issue (From Lead/Data) - Read-Only Base Data
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'initialIssue',
      header: 'Initial Issue',
      render: (row: SalesOrder) => {
        const issue = row.salesLead?.issue || row.salesData?.issue || '-';
        return (
          <div className="max-w-[150px] truncate text-sm text-gray-500 dark:text-gray-400" title={issue}>
            {issue}
          </div>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Order Issue (Operational/Technical Notes) - Editable in Orders
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'orderIssue',
      header: 'Order Issue',
      render: (row: SalesOrder) => {
        const issue = row.issue || '-';
        return (
          <div className="max-w-[150px] truncate font-medium text-sm" title={issue}>
            {issue}
          </div>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Date (DateTime: dd/MM/yyyy HH:mm)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'createdAt',
      header: 'Date',
      render: (row: SalesOrder) => (
        <span className="text-xs font-mono whitespace-nowrap">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Type Of Order (Smart Inheritance: Order → Lead → Data)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'typeOfOrder',
      header: 'Type Of Order',
      render: (row: SalesOrder) => {
        const type = row.typeOfOrder || row.salesLead?.typeOfOrder || row.salesData?.typeOfOrder || '-';
        return (
          <span className="text-sm">
            {type}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Sales Platform (Smart Inheritance: Order → Lead → Data)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'salesPlatform',
      header: 'Platform',
      render: (row: SalesOrder) => {
        const platform = row.salesPlatform || row.salesLead?.salesPlatform || row.salesData?.salesPlatform || '-';
        return (
          <span className="text-sm">
            {platform}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 12. Site Inspections (DateTime if date field)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'siteInspectionDate',
      header: 'Site Inspections',
      render: (row: SalesOrder) => (
        <span className="text-xs font-mono whitespace-nowrap">
          {formatDateTime(row.siteInspectionDate)}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 13. Technical Inspection (isTechnicalInspectionRequired)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'isTechnicalInspectionRequired',
      header: 'Technical Inspection',
      render: (row: SalesOrder) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${row.isTechnicalInspectionRequired
          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}>
          {row.isTechnicalInspectionRequired ? 'Yes' : 'No'}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 14. Quotation (Advanced File Cell with View & Download + Dialog PDF Viewer)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'quotationFileUrl',
      header: 'Quotation',
      render: (row: SalesOrder) => (
        <div className="flex items-center gap-2">
          <QuotationCell
            fileUrl={row.quotationFileUrl}
            fileName={row.quotationFileName}
          />
          {row.quotationFileUrl && (
            <button
              onClick={async () => {
                if (!window.confirm('Remove uploaded quotation?')) return;
                try {
                  const response = await api.patch(`/sales/orders/${row._id}`, {
                    quotationFileUrl: '',
                    quotationFileName: ''
                  });
                  if (response.status === 200 || response.status === 204 || response.status === 202) {
                    toast.success('Removed successfully');
                    window.location.reload();
                  }
                } catch (error) {
                  toast.error('Failed to remove');
                }
              }}
              title="Remove File"
              className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 14b. Dynamic Quotation Builder Actions (View/Download/Create PDF)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'quotationActions',
      header: 'Quotation PDF',
      render: (row: SalesOrder) => {
        const hasQuotation = row.quotation && row.quotation.items && row.quotation.items.length > 0;

        if (hasQuotation) {
          // If quotation EXISTS: Hide the '+' button and show View/Download
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  try {
                    generateQuotationPDF(row as any, 'view');
                  } catch (error) {
                    console.error('Failed to generate PDF:', error);
                    toast.error('Failed to generate PDF preview');
                  }
                }}
                title="View PDF"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-blue-200 text-blue-600 hover:bg-blue-50 h-8 px-3"
              >
                <FileText className="w-4 h-4 mr-1" /> View
              </button>
              <button
                onClick={() => {
                  try {
                    generateQuotationPDF(row as any, 'download');
                  } catch (error) {
                    console.error('Failed to generate PDF:', error);
                    toast.error('Failed to download PDF');
                  }
                }}
                title="Download PDF"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-green-200 text-green-600 hover:bg-green-50 h-8 px-3"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm('Delete system quotation?')) return;
                  try {
                    const response = await api.patch(`/sales/orders/${row._id}`, {
                      quotation: null
                    });
                    if (response.status === 200 || response.status === 204 || response.status === 202) {
                      toast.success('Quotation removed');
                      window.location.reload();
                    }
                  } catch (error) {
                    toast.error('Failed to remove');
                  }
                }}
                title="Remove Quotation"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-red-200 text-red-600 hover:bg-red-50 h-8 px-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        }

        // If NO quotation: Show the '+' button ONLY
        return (
          <button
            onClick={() => onCreateQuotation?.(row)}
            title="Create Quotation"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-gray-100 text-gray-900 hover:bg-gray-200 h-8 px-3"
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Create
          </button>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 15. Follow Up First (DateTime)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'followUpFirst',
      header: 'Follow Up First',
      render: (row: SalesOrder) => (
        <span className="text-xs font-mono whitespace-nowrap">
          {formatDateTime(row.followUpFirst)}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 16. Quotation Status for First Follow Up
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'quotationStatusFirstFollowUp',
      header: 'Quotation Status (1st)',
      render: (row: SalesOrder) => (
        <span className="text-xs px-2 py-1 rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
          {row.quotationStatusFirstFollowUp || '-'}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 17. Reason of Quotation
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'reasonOfQuotation',
      header: 'Reason of Quotation',
      render: (row: SalesOrder) => (
        <span className="text-sm max-w-[200px] truncate block" title={row.reasonOfQuotation}>
          {row.reasonOfQuotation || '-'}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 18. Follow Up Second (DateTime)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'followUpSecond',
      header: 'Follow Up Second',
      render: (row: SalesOrder) => (
        <span className="text-xs font-mono whitespace-nowrap">
          {formatDateTime(row.followUpSecond)}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 19. Status of Second Follow Up
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'statusSecondFollowUp',
      header: 'Status (2nd Follow Up)',
      render: (row: SalesOrder) => (
        <span className="text-xs px-2 py-1 rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
          {row.statusSecondFollowUp || '-'}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 20. Follow Up Third (DateTime)
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'followUpThird',
      header: 'Follow Up Third',
      render: (row: SalesOrder) => (
        <span className="text-xs font-mono whitespace-nowrap">
          {formatDateTime(row.followUpThird)}
        </span>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 21. Final Status of Third Follow Up
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'finalStatusThirdFollowUp',
      header: 'Final Status (3rd)',
      render: (row: SalesOrder) => {
        const status = row.finalStatusThirdFollowUp;
        const getStatusColor = () => {
          if (!status || status === '-') return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
          if (status.toLowerCase().includes('won') || status.toLowerCase().includes('approved')) {
            return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
          }
          if (status.toLowerCase().includes('lost') || status.toLowerCase().includes('rejected')) {
            return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
          }
          return 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]';
        };

        return (
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor()}`}>
            {status || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 22. SalesPerson ID
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'salesPersonId',
      header: 'SalesPerson ID',
      render: (row: SalesOrder) => {
        // Try to get from multiple possible sources
        const salesPersonId = row.salesPersonId
          || row.salesLead?.salesPerson
          || row.salesData?.salesPerson?._id
          || (row.salesData?.salesPerson?.firstName && row.salesData?.salesPerson?.lastName
            ? `${row.salesData.salesPerson.firstName} ${row.salesData.salesPerson.lastName}`
            : null);

        return (
          <span className="text-sm font-mono">
            {salesPersonId || '-'}
          </span>
        );
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 23. Notes
    // ─────────────────────────────────────────────────────────────────────────
    {
      key: 'notes',
      header: 'Notes',
      render: (row: SalesOrder) => (
        <div className="max-w-[120px] truncate text-gray-500 text-sm" title={row.notes}>
          {row.notes || '-'}
        </div>
      ),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 24. Actions (Edit / Delete / History)
    // Note: This is handled by renderActions prop in DataTable
    // Individual action handlers are passed via config
    // ─────────────────────────────────────────────────────────────────────────
  ];
};

// ─────────────────────────────────────────────────────────────────────────────
// Export Helper for Actions Rendering
// ─────────────────────────────────────────────────────────────────────────────

export const createActionsRenderer = (config: {
  onEdit: (row: SalesOrder) => void;
  onDelete: (row: SalesOrder) => void;
  onHistory?: (row: SalesOrder) => void;
}) => {
  return (row: SalesOrder) => (
    <div className="flex items-center gap-1">
      {/* Edit Button */}
      <button
        onClick={() => config.onEdit(row)}
        className="p-1 hover:text-[hsl(var(--primary))] transition-colors"
        title="Edit Order"
      >
        <Edit2 className="h-3.5 w-3.5" />
      </button>

      {/* Delete Button */}
      <button
        onClick={() => config.onDelete(row)}
        className="p-1 hover:text-destructive transition-colors"
        title="Delete Order"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* History Button (Optional) */}
      {config.onHistory && (
        <button
          onClick={() => config.onHistory?.(row)}
          className="p-1 hover:text-[hsl(var(--primary))] transition-colors"
          title="View History"
        >
          <History className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
