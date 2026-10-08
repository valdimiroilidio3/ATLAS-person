// Verifies dynamically-referenced dictionary keys:
// labelKey / nameKey / descriptionKey (constants.ts) and powersKey (registry.ts).
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');

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
for (const prop of ptNode.properties) {
  if (ts.isPropertyAssignment(prop)) dictKeys.add(prop.name.text);
}

const KEY_PROPS = new Set(['labelKey', 'nameKey', 'descriptionKey', 'powersKey']);
const missing = [];
for (const file of ['lib/atlas/constants.ts', 'lib/api/registry.ts']) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && KEY_PROPS.has(node.name.text) && ts.isStringLiteral(node.initializer)) {
      const key = node.initializer.text;
      if (!dictKeys.has(key)) missing.push(`${file}: ${JSON.stringify(key)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
if (missing.length) {
  console.log('MISSING dynamic keys:');
  missing.forEach((m) => console.log('  +', m));
  process.exit(1);
}
console.log('all dynamic keys (labelKey/nameKey/descriptionKey/powersKey) present in PT dictionary');
