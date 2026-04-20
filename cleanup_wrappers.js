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

let modifiedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Pattern 1: <div className="overflow-x-auto ... min-w-[1500px] ...">...</div>
  // We want to remove the min-w and overflow-x-auto
  content = content.replace(/<div\s+className=["']overflow-x-auto[^'"]*?["']>\s*(<DataTable|<table)/g, '<div className="w-full">\n        $1');
  
  // Specific catch for the min-w-[1500px] pattern
  content = content.replace(/<div\s+className=["']overflow-x-auto\s+min-w-\[1500px\][^'"]*?["']>/g, '<div className="w-full">');

  // Simple overflow-x-auto
  content = content.replace(/className=["']overflow-x-auto["']/g, 'className="w-full"');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
}

console.log('Modified files:', modifiedCount);
