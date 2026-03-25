const { execSync } = require('child_process');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe', encoding: 'utf-8' });
  console.log('SUCCESS');
} catch (e) {
  require('fs').writeFileSync('ts-error-utf8.txt', e.stdout || e.stderr || e.message);
  console.log('Wrote to ts-error-utf8.txt');
}
