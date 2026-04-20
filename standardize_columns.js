const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    const dirent = fs.statSync(dirFile);
    if (dirent.isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.tsx')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
};

const dashboardDir = path.join('d:/DOCUMENTS/ECDM_Core/ecdm-core-frontend/src/app/(dashboard)');
const files = walkSync(dashboardDir);

const coreKeywords = ['id', 'name', 'title', 'company', 'phone', 'email', 'user'];
const secondaryKeywords = ['date', 'time', 'type', 'category', 'platform', 'status', 'total', 'amount', 'price', 'inspection', 'follow', 'feedback'];
const tertiaryKeywords = ['note', 'address', 'details', 'createdat', 'updatedat', 'sector', 'issue', 'description', 'reason', 'audit', 'request'];

let modifiedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Pattern: { key: '...', header: '...', ... }
  // We want to replace or add className: '...'
  // This is hard to do with regex perfectly but let's try a better approach
  
  // Find column objects like { key: ..., header: ... }
  // We'll look for blocks that have 'header:' but no 'className:' yet (or replace existing)
  
  const regex = /({[^}]*?header:\s*['"`]([^'"`]+)['"`][^}]*?})/g;
  
  content = content.replace(regex, (match, block, headerText) => {
    const lowHeader = headerText.toLowerCase();
    
    // Determine priority
    const isActions = lowHeader.includes('action');
    const isCore = coreKeywords.some(k => lowHeader.includes(k));
    const isSecondary = secondaryKeywords.some(k => lowHeader.includes(k));
    const isTertiary = tertiaryKeywords.some(k => lowHeader.includes(k));
    
    let classes = [];
    
    if (isActions) {
      classes.push('md:w-48');
    } else if (isCore && !isSecondary && !isTertiary) {
      if (lowHeader.includes('id')) {
        classes.push('md:w-24');
      } else if (lowHeader.includes('name') || lowHeader.includes('title')) {
        classes.push('md:w-auto flex-1'); // absorb space
      } else {
        classes.push('md:w-1/4');
      }
    } else if (isSecondary || isTertiary) {
      if (isTertiary) {
        classes.push('hidden xl:table-cell md:w-1/6');
      } else {
        classes.push('hidden md:table-cell md:w-1/6');
      }
    } else {
      // Default fallback
      classes.push('hidden lg:table-cell md:w-1/6');
    }
    
    // Aggressive truncation for specific content
    if (lowHeader.includes('email') || lowHeader.includes('url') || lowHeader.includes('note') || lowHeader.includes('detail') || lowHeader.includes('issue') || lowHeader.includes('address')) {
      classes.push('md:max-w-[200px] truncate');
    }

    const classNameLine = `className: '${classes.join(' ')}',`;
    
    // Check if block already has className
    if (block.includes('className:')) {
      // Replace existing className
      return block.replace(/className:\s*['"`][^'"`]*['"`],?/g, classNameLine);
    } else {
      // Add after header
      return block.replace(/(header:\s*['"`][^'"`]+['"`],)/, `$1\n      ${classNameLine}`);
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
}

console.log('Modified files:', modifiedCount);
