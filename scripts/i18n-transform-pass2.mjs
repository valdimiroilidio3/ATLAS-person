// Second-pass i18n transform — catches single-word literals the first pass
// skipped (its "code-ish" heuristic treated any single word as an identifier):
//   - JSX attributes in TEXT_ATTRS:  label="Name"     → label={t('Name')}
//   - TEXT_KEYS property values:     label: 'Monday'   → label: t('Monday')
//   - TEXT_VARS initializers:        const title = 'Active'
//   - return 'Done' / () => 'Done'
// Only Capitalized single words are touched (statuses/ids stay lowercase).

import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const SAFE = new Set([
  'ATLAS', 'ORBITA', 'WEAF', 'SCOUT', 'RESEARCH', 'CONTENT', 'SEO', 'EXECUTION', 'DEPLOYMENT',
  'Gmail', 'WhatsApp', 'Vercel', 'GitHub', 'LinkedIn', 'Stripe', 'Slack', 'Google',
  'Google Calendar', 'Google Drive', 'WooCommerce', 'Clearbit', 'Apollo', 'Ahrefs',
  'SimilarWeb', 'Crunchbase', 'Hacker News', 'Stack Overflow', 'Dev.to', 'REST Countries',
  'Frankfurter', 'Quotable', 'Nationalize', 'IPify', 'npm', 'npm Registry', 'CI', 'CMS',
  'API', 'ICP', 'MRR', 'URL', 'IP', 'AI', 'ID', 'HN', 'PT', 'EN', 'UX', 'UI', 'FAQ',
  'L0', 'L1', 'L2', 'L3', 'L4', 'L?', 'Q3', 'Q4', 'EUR', 'USD', 'GBP', 'CHF', 'BRL', 'SEK',
  'Chelton',
]);

const TEXT_KEYS = new Set([
  'title', 'label', 'description', 'detail', 'body', 'hint', 'text', 'message', 'caption',
  'placeholder', 'eyebrow', 'cta', 'actionLabel', 'objective', 'reason', 'summary',
  'answer', 'question', 'note', 'emptyTitle', 'emptyBody', 'emptyDescription', 'emptyHint',
  'sectionTitle', 'helperText', 'tooltip', 'alt', 'header', 'footer', 'heading',
  'subheading', 'kicker', 'badge', 'tag', 'noResults', 'loading', 'error', 'titleText',
  'hintText', 'ariaLabel', 'chip', 'valueLabel', 'statusText', 'footnote', 'overline',
]);

const TEXT_ATTRS = new Set([
  'title', 'placeholder', 'alt', 'aria-label', 'label', 'description', 'content',
  'tooltip', 'hint', 'eyebrow',
]);

const TEXT_VARS = new Set([
  'title', 'label', 'description', 'detail', 'body', 'hint', 'text', 'message', 'caption',
  'placeholder', 'eyebrow', 'cta', 'actionLabel', 'objective', 'reason', 'summary',
  'answer', 'question', 'note', 'emptyTitle', 'emptyBody', 'emptyHint', 'sectionTitle',
  'noResults', 'loadingText', 'errorText', 'header', 'footer', 'heading', 'subheading',
  'tooltip', 'altText', 'statusLabel', 'hintText',
]);

// A single Capitalized word that is meant as a label (not a brand/code).
function singleWordLabel(s) {
  if (!/^[A-ZÀ-Þ][A-Za-zÀ-ÿ'’-]*$/.test(s)) return false;
  if (SAFE.has(s)) return false;
  return true;
}

function propName(node) {
  if (ts.isPropertyAssignment(node)) {
    const n = node.name;
    if (ts.isIdentifier(n) || ts.isStringLiteral(n)) return n.text;
  }
  return null;
}

function transformFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  let usesT = false;

  const wrap = (node, s, braces) => {
    const text = braces ? `{t('${s}')}` : `t('${s}')`;
    edits.push({ pos: node.getStart(sf), end: node.getEnd(), text });
    usesT = true;
  };

  const visit = (node) => {
    if (ts.isStringLiteral(node)) {
      const s = node.text;
      const parent = node.parent;
      if (!singleWordLabel(s)) return;
      // never double-wrap
      if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && parent.expression.text === 't') return;

      // JSX attribute (direct string value)
      if (ts.isJsxAttribute(parent) && TEXT_ATTRS.has(parent.name.text)) {
        wrap(node, s, true);
        return;
      }
      // JSX attribute via expression container: label={'Name'}
      if (
        ts.isJsxExpression(parent) &&
        ts.isJsxAttribute(parent.parent) &&
        TEXT_ATTRS.has(parent.parent.name.text)
      ) {
        wrap(node, s, false);
        return;
      }
      // object property under a text-ish key
      if (ts.isPropertyAssignment(parent) && TEXT_KEYS.has(propName(parent) ?? '')) {
        wrap(node, s, false);
        return;
      }
      // const title = 'Active'
      if (
        ts.isVariableDeclaration(parent) &&
        ts.isIdentifier(parent.name) &&
        TEXT_VARS.has(parent.name.text) &&
        parent.initializer === node
      ) {
        wrap(node, s, false);
        return;
      }
      // return 'Done' / () => 'Done'
      if (ts.isReturnStatement(parent)) {
        wrap(node, s, false);
        return;
      }
      if (ts.isArrowFunction(parent) && parent.body === node) {
        wrap(node, s, false);
        return;
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (!usesT) return false;
  edits.sort((a, b) => b.pos - a.pos);
  let out = src;
  for (const e of edits) out = out.slice(0, e.pos) + e.text + out.slice(e.end);
  if (!out.includes("from '@/lib/i18n'")) {
    const sf2 = ts.createSourceFile(filePath, out, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let lastImportEnd = 0;
    for (const stmt of sf2.statements) {
      if (ts.isImportDeclaration(stmt)) lastImportEnd = stmt.getEnd();
    }
    out = lastImportEnd > 0
      ? out.slice(0, lastImportEnd) + "\nimport { t } from '@/lib/i18n';" + out.slice(lastImportEnd)
      : "import { t } from '@/lib/i18n';\n" + out;
  }
  fs.writeFileSync(filePath, out);
  return true;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.tsx')) yield full;
  }
}

let changed = 0;
for (const dir of ['app', 'components']) {
  for (const file of walk(path.join(ROOT, dir))) {
    if (file.endsWith('layout.tsx')) continue;
    if (transformFile(file)) {
      changed++;
      console.log('pass2:', path.relative(ROOT, file));
    }
  }
}
console.log(`pass2 transformed ${changed} files`);
