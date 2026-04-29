import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

/**
 * Quotation Item Interface
 */
export interface QuotationItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Quotation Interface
 */
export interface Quotation {
  items: QuotationItem[];
  subTotal: number;
  discount: number;
  grandTotal: number;
  notes?: string;
  createdAt?: Date;
}

/**
 * Customer Interface
 */
export interface Customer {
  _id?: string;
  customerId?: string;
  name?: string;
  phone?: string;
  address?: string;
  sector?: string;
  email?: string;
}

/**
 * Sales Order Interface (minimal for PDF generation)
 */
export interface SalesOrderForPDF {
  _id: string;
  salesOrderId?: string;
  customer?: Customer;
  customerId?: Customer; // Alternative field name
  quotation: Quotation;
  createdAt?: string;
}

/**
 * Generate a professional PDF quotation from sales order data
 * 
 * @param order - The sales order containing quotation data
 * @param action - Whether to 'view' the PDF in a new tab or 'download' it
 */
export const generateQuotationPDF = (order: SalesOrderForPDF, action: 'view' | 'download' | 'blob' = 'view'): void | Blob => {
  const doc = new jsPDF();
  
  // Get customer data (handle both possible field names)
  const customer = order.customer || order.customerId;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. COMPANY LOGO / HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  // If you have a logo in base64 format, use:
  // const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANS...";
  // doc.addImage(logoBase64, 'PNG', 14, 10, 40, 15);
  
  // Text placeholder for company name (replace with logo if available)
  doc.setFontSize(22);
  doc.setTextColor(40, 116, 166); // Brand Blue Color
  doc.setFont('helvetica', 'bold');
  doc.text("IGNOVA", 14, 20);
  doc.setFont('helvetica', 'normal');
  
  // Company tagline or slogan (optional)
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Quality Solutions, Delivered on Time", 14, 26);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 2. QUOTATION HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text("QUOTATION", 150, 20);
  doc.setFont('helvetica', 'normal');
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const quotationDate = order.quotation.createdAt 
    ? format(new Date(order.quotation.createdAt), 'dd/MM/yyyy')
    : format(new Date(), 'dd/MM/yyyy');
  doc.text(`Date: ${quotationDate}`, 150, 28);
  const orderId = order.salesOrderId || (typeof order._id === 'string' ? order._id.slice(-6).toUpperCase() : 'N/A');
  doc.text(`Ref: ${orderId}`, 150, 34);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 3. CUSTOMER INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text("Bill To:", 14, 45);
  doc.setFont('helvetica', 'normal');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(customer?.name || 'Customer Name', 14, 52);
  doc.setFont('helvetica', 'normal');
  
  if (customer?.phone) {
    doc.text(`Phone: ${customer.phone}`, 14, 58);
  }
  
  if (customer?.email) {
    doc.text(`Email: ${customer.email}`, 14, 64);
  }
  
  if (customer?.address) {
    // Handle long addresses with text wrapping
    const addressLines = doc.splitTextToSize(`Address: ${customer.address}`, 80);
    doc.text(addressLines, 14, customer?.email ? 70 : 64);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ITEMS TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  const tableData = order.quotation.items.map((item: QuotationItem, index: number) => [
    index + 1,
    item.description,
    item.quantity.toString(),
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.total.toFixed(2)}`
  ]);
 
  autoTable(doc, {
    startY: 85,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { 
      fillColor: [40, 116, 166], // Brand Blue
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left', cellWidth: 80 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 35 }
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    styles: {
      fontSize: 9,
      cellPadding: 4
    }
  });
 
  // ═══════════════════════════════════════════════════════════════════════════
  // 5. TOTALS SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const finalY = (doc as any).lastAutoTable.finalY || 85;
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  
  const totalsX = 145;
  let currentY = finalY + 12;
  
  // Subtotal
  doc.text(`Subtotal:`, totalsX, currentY);
  doc.text(`$${order.quotation.subTotal.toFixed(2)}`, 190, currentY, { align: 'right' });
  
  // Discount (if applicable)
  if (order.quotation.discount > 0) {
    currentY += 6;
    doc.text(`Discount:`, totalsX, currentY);
    doc.text(`-$${order.quotation.discount.toFixed(2)}`, 190, currentY, { align: 'right' });
  }
  
  // Grand Total
  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Grand Total:`, totalsX, currentY);
  doc.text(`$${order.quotation.grandTotal.toFixed(2)}`, 190, currentY, { align: 'right' });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 6. NOTES SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  if (order.quotation.notes && order.quotation.notes.trim()) {
    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("Notes:", 14, currentY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const notesLines = doc.splitTextToSize(order.quotation.notes, 180);
    doc.text(notesLines, 14, currentY + 6);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 7. FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  doc.text("Thank you for your business!", 105, pageHeight - 15, { align: 'center' });
  doc.text("This quotation is valid for 30 days from the date of issue.", 105, pageHeight - 10, { align: 'center' });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 8. OUTPUT ACTION
  // ═══════════════════════════════════════════════════════════════════════════
  if (action === 'view') {
    // Open PDF in a new browser tab
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
    
    // Clean up the blob URL after opening (with a delay to ensure it loads)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  } else if (action === 'download') {
    // Download the PDF file
    const orderId = order.salesOrderId || (typeof order._id === 'string' ? order._id.slice(-6).toUpperCase() : 'N/A');
    const fileName = `Quotation_${orderId}.pdf`;
    doc.save(fileName);
  } else if (action === 'blob') {
    // Return the blob for bundling
    return doc.output('blob');
  }
};

