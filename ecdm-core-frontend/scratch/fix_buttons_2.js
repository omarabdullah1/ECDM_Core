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
  'src/app/(dashboard)/marketing/campaigns/page.tsx'
];

let changedCount = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Fix setInternalPreviewMode for <button>
  content = content.replace(/<button([\s\S]*?)onClick=\{\(\) => setInternalPreviewMode\(false\)\}/g, '<button key="btn-edit"$1onClick={(e) => { e.preventDefault(); setInternalPreviewMode(false); }}');
  
  // Fix setInternalPreviewMode for <Button>
  content = content.replace(/<Button([\s\S]*?)onClick=\{\(\) => setInternalPreviewMode\(false\)\}/g, '<Button key="btn-edit"$1onClick={(e) => { e.preventDefault(); setInternalPreviewMode(false); }}');
  
  // Fix setIsReadOnly for <button>
  content = content.replace(/<button([\s\S]*?)onClick=\{\(\) => setIsReadOnly\(false\)\}/g, '<button key="btn-edit"$1onClick={(e) => { e.preventDefault(); setIsReadOnly(false); }}');
  
  // Fix setIsReadOnly for <Button>
  content = content.replace(/<Button([\s\S]*?)onClick=\{\(\) => setIsReadOnly\(false\)\}/g, '<Button key="btn-edit"$1onClick={(e) => { e.preventDefault(); setIsReadOnly(false); }}');

  // Find the else branch button (Save) and add key='btn-save'
  content = content.replace(/\) :\s*\(\s*<Button\s+type="submit"/g, ') : (\n                <Button key="btn-save" type="submit"');
  content = content.replace(/\) :\s*\(\s*<button\s+type="submit"/g, ') : (\n                <button key="btn-save" type="submit"');
  
  // Deduplicate keys just in case it was already applied
  content = content.replace(/key="btn-save"\s+key="btn-save"/g, 'key="btn-save"');
  content = content.replace(/key="btn-edit"\s+key="btn-edit"/g, 'key="btn-edit"');

  if (content !== original) {
    fs.writeFileSync(file, content);
    changedCount++;
    console.log('Patched: ' + file);
  }
}

console.log('Total files patched: ' + changedCount);
