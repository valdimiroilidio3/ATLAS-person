// Verifies i18n coverage: every t('...') key used in source must exist in
// the PT dictionary. Prints missing keys (to translate) and unused keys.

import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

// ---- load PT dictionary keys ----
const dictSrc = fs.readFileSync(path.join(ROOT, 'lib/i18n/dictionaries.ts'), 'utf8');
const dictSf = ts.createSourceFile('d.ts', dictSrc, ts.ScriptTarget.Latest, true);
let ptNode = null;
for (const stmt of dictSf.statements) {
  if (ts.isVariableStatement(stmt)) {
    for (const decl of stmt.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && decl.name.text === 'pt') ptNode = decl.initializer;
    }
  }
}
const dictKeys = new Set();
if (ptNode && ts.isObjectLiteralExpression(ptNode)) {
  for (const prop of ptNode.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const name = prop.name;
      if (ts.isStringLiteral(name) || ts.isIdentifier(name)) dictKeys.add(name.text);
    }
  }
}

// ---- scan source for t('...') / translate('...') ----
const used = new Map(); // key -> [files]
function scan(file) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 't' || node.expression.text === 'translate') &&
      node.arguments.length >= 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const key = node.arguments[0].text;
      if (!used.has(key)) used.set(key, []);
      used.get(key).push(path.relative(ROOT, file));
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield full;
  }
}

for (const dir of ['lib', 'app', 'components']) {
  for (const f of walk(path.join(ROOT, dir))) {
    if (f.includes('lib/i18n/')) continue;
    if (f.includes('scripts/')) continue;
    scan(f);
  }
}

const missing = [...used.keys()].filter((k) => !dictKeys.has(k)).sort();
const unused = [...dictKeys].filter((k) => !used.has(k)).sort();

console.log(`dictionary keys: ${dictKeys.size}`);
console.log(`used keys:       ${used.size}`);
console.log(`MISSING (${missing.length}):`);
for (const k of missing) console.log(`  + ${JSON.stringify(k)}   ← ${used.get(k)[0]}`);
console.log(`UNUSED (${unused.length}):`);
for (const k of unused) console.log(`  - ${JSON.stringify(k)}`);

fs.writeFileSync(
  path.join(ROOT, 'scripts', 'i18n-missing.json'),
  JSON.stringify(missing, null, 2),
);
process.exit(missing.length ? 1 : 0);
