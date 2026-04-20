const fs = require('fs');

const files = [
  'src/app/(dashboard)/sales/order/EditSalesOrderDialog.tsx',
  'src/app/(dashboard)/marketing/leads/page.tsx',
  'src/app/(dashboard)/operations/price-list/EditPriceListDialog.tsx',
  'src/app/(dashboard)/finance/expenses/page.tsx',
  'src/app/(dashboard)/finance/salaries/page.tsx',
  'src/app/(dashboard)/finance/order-finance/OrderFinanceDialog.tsx',
  'src/app/(dashboard)/finance/inventory/InventoryFinanceDialog.tsx',
  'src/app/(dashboard)/finance/invoices/InvoiceApprovalDialog.tsx',
  'src/app/(dashboard)/customer/orders/EditCustomerOrderDialog.tsx',
  'src/app/(dashboard)/customer/list/EditCustomerDialog.tsx',
  'src/app/(dashboard)/customer/follow-up/EditFollowUpDialog.tsx',
  'src/app/(dashboard)/customer/feedback/EditFeedbackDialog.tsx',
  'src/app/(dashboard)/sales/data/page.tsx',
  'src/app/(dashboard)/marketing/content/page.tsx',
  'src/app/(dashboard)/marketing/campaigns/page.tsx'
];

let changedCount = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace setInternalPreviewMode
  content = content.replace(/<Button([\s\S]*?)onClick=\{\(\) => setInternalPreviewMode\(false\)\}/g, '<Button key="btn-edit"$1onClick={(e) => { e.preventDefault(); setInternalPreviewMode(false); }}');
  
  // Replace setIsReadOnly
  content = content.replace(/<button([\s\S]*?)onClick=\{\(\) => setIsReadOnly\(false\)\}/g, '<button key="btn-edit"$1onClick={(e) => { e.preventDefault(); setIsReadOnly(false); }}');
  content = content.replace(/<Button([\s\S]*?)onClick=\{\(\) => setIsReadOnly\(false\)\}/g, '<Button key="btn-edit"$1onClick={(e) => { e.preventDefault(); setIsReadOnly(false); }}');
  
  // Identify the else branch (Save button) and add key='btn-save'
  content = content.replace(/\) :\s*\(\s*<(Button|button)\s+type="submit"/g, ') : (\n                <$1 key="btn-save" type="submit"');

  if (content !== original) {
    fs.writeFileSync(file, content);
    changedCount++;
    console.log('Patched: ' + file);
  }
}

console.log('Total files patched: ' + changedCount);
