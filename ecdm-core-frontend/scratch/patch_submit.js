const fs = require('fs');

const files = [
  'src/app/(dashboard)/marketing/leads/page.tsx',
  'src/app/(dashboard)/operations/price-list/EditPriceListDialog.tsx',
  'src/app/(dashboard)/finance/expenses/page.tsx',
  'src/app/(dashboard)/finance/salaries/page.tsx',
  'src/app/(dashboard)/customer/orders/EditCustomerOrderDialog.tsx',
  'src/app/(dashboard)/customer/follow-up/EditFollowUpDialog.tsx',
  'src/app/(dashboard)/sales/data/page.tsx',
  'src/app/(dashboard)/marketing/content/page.tsx',
  'src/app/(dashboard)/marketing/campaigns/page.tsx',
  'src/app/(dashboard)/finance/invoices/InvoiceApprovalDialog.tsx',
  'src/app/(dashboard)/finance/order-finance/OrderFinanceDialog.tsx',
  'src/app/(dashboard)/finance/inventory/InventoryFinanceDialog.tsx',
  'src/app/(dashboard)/customer/list/EditCustomerDialog.tsx',
  'src/app/(dashboard)/customer/feedback/EditFeedbackDialog.tsx',
  'src/app/(dashboard)/operations/work-order/page.tsx',
  'src/app/(dashboard)/sales/order/EditSalesOrderDialog.tsx'
];

let changedCount = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Add protect-mount to the classList of any <button type="submit" ... className="..." ...>
  content = content.replace(/(type="submit"[^>]*className=["'])([^"']*)/ig, '$1protect-mount $2');
  
  // Clean up if double injected
  content = content.replace(/protect-mount\s+protect-mount/g, 'protect-mount');

  if (content !== original) {
    fs.writeFileSync(file, content);
    changedCount++;
    console.log('Patched submit protection safely: ' + file);
  }
}

console.log('Total files safely patched with submit protection: ' + changedCount);
