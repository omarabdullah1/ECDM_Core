const fs = require('fs');
const path = require('path');

const targetDir = 'd:/DOCUMENTS/ECDM_Core/ecdm-core-frontend/src/app/(dashboard)';

const replacements = [
  {
    regex: /className=\"rounded-xl border border-\[hsl\(var\(--border\)\)\] bg-\[hsl\(var\(--card\)\)\] px-3 py-2 text-sm\"/g,
    replacement: 'className="h-9 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10"'
  },
  {
    regex: /bg-black\/50 backdrop-blur-sm p-4/g,
    replacement: 'bg-black/60 backdrop-blur-sm p-4 transition-all'
  },
  {
    regex: /rounded-2xl border border-\[hsl\(var\(--border\)\)\] bg-\[hsl\(var\(--card\)\)\] p-6 shadow-2xl max-w-sm w-full/g,
    replacement: 'rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--card))] p-6 shadow-lg sm:max-w-md w-full'
  },
  {
    regex: /className=\"flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white\"/g,
    replacement: 'className="flex-1 rounded-md bg-[hsl(var(--destructive))] py-2 text-sm font-medium text-[hsl(var(--destructive-foreground))] shadow-sm transition-all hover:opacity-90 focus-visible:outline-none"'
  },
  {
    regex: /className=\"flex-1 rounded-xl border py-2 text-sm\"/g,
    replacement: 'className="flex-1 rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] py-2 text-sm font-medium shadow-sm transition-all hover:bg-[hsl(var(--accent))] focus-visible:outline-none"'
  },
  {
    regex: /className=\"rounded-xl border border-\[hsl\(var\(--border\)\)\] bg-\[hsl\(var\(--card\)\)\] px-4 py-3 text-sm placeholder:text-\[hsl\(var\(--muted-foreground\)\)\] focus:border-\[hsl\(var\(--primary\)\)\] focus:outline-none focus:ring-2 focus:ring-\[hsl\(var\(--primary\)\)\]\/20 transition-all\"/g,
    replacement: 'className="flex h-9 w-full rounded-md border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] px-3 py-1 text-sm shadow-sm transition-all placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:border-[hsl(var(--primary))]/50 focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--primary))]/10"'
  }
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      replacements.forEach(({regex, replacement}) => {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          changed = true;
        }
      });
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(targetDir);
console.log('Global design system enforcement complete.');
