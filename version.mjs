// Erhöht die Spielversion in allen Dateien, die sie kennen müssen.
// Aufruf:  node version.mjs 1.3
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const v = process.argv[2];
if (!/^\d+(\.\d+)*$/.test(v || '')) { console.error('Aufruf: node version.mjs <version>, z. B. 1.3'); process.exit(1); }
const root = dirname(fileURLToPath(import.meta.url));
const edit = (file, re, to) => {
  const p = join(root, file), src = readFileSync(p, 'utf8'), out = src.replace(re, to);
  if (!new RegExp(re.source).test(src)) throw new Error(`${file}: Version nicht gefunden`);
  writeFileSync(p, out);
  console.log('✓', file);
};
edit('js/game.js', /const VERSION = '[^']*';/, `const VERSION = '${v}';`);
edit('sw.js', /const VERSION = '[^']*';/, `const VERSION = '${v}';`);
edit('index.html', /\?v=[\d.]+/g, `?v=${v}`);
writeFileSync(join(root, 'version.json'), JSON.stringify({ version: v }) + '\n');
console.log('✓ version.json');
console.log(`Version ${v} gesetzt.`);
