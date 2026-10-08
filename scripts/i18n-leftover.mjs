// Heuristic scan for leftover English-looking JSX text / template literals.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const STOP = new Set(['the','and','your','you','with','for','from','this','that','not','was','are','has','have','all','new','its','our','their','today','day','days','get','set','run','add','add ','use','using','per','via','out','off','now','here','one','two','top','see','view','open','close','save','edit','delete','back','next','last','more','less','very','just','only','also','than','then','when','what','why','how','who','its']);
function looksEnglish(s) {
  const words = s.toLowerCase().replace(/[^a-zà-ÿ€\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  const hits = words.filter((w) => STOP.has(w)).length;
  return hits >= 2 && /^[A-Z€]/.test(s);
}
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.name.endsWith('.tsx')) yield full;
  }
}
let count = 0;
for (const dir of ['app', 'components']) {
  for (const file of walk(path.join(ROOT, dir))) {
    if (file.endsWith('layout.tsx')) continue;
    const src = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      if (ts.isJsxText(node)) {
        const s = node.getText(sf).replace(/\s+/g, ' ').trim();
        if (s && looksEnglish(s)) { console.log(`${path.relative(ROOT, file)} [jsx] ${JSON.stringify(s)}`); count++; }
      }
      if (ts.isTemplateLiteral(node) || (ts.isNoSubstitutionTemplateLiteral(node))) {
        const s = node.getText(sf);
        if (looksEnglish(s)) { console.log(`${path.relative(ROOT, file)} [tpl] ${s.slice(0, 90)}`); count++; }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
}
console.log(`\n${count} suspicious leftovers`);
