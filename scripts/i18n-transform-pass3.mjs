// Third-pass i18n transform — catches what passes 1 & 2 missed:
//   - ternary branches with text (guarded against cn()/clsx()/twMerge classNames)
//   - multi-word / ALL-CAPS literals under text-ish keys (statusLabel, context, …)
//   - capitalized single words under text-ish keys / attrs / returns
// Run after pass1+pass2; the key checker verifies coverage.

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
  'Chelton', 'P1', 'P2', 'P3',
]);

const TEXT_KEYS = new Set([
  'title', 'label', 'description', 'detail', 'body', 'hint', 'text', 'message', 'caption',
  'placeholder', 'eyebrow', 'cta', 'actionLabel', 'objective', 'reason', 'summary',
  'answer', 'question', 'note', 'emptyTitle', 'emptyBody', 'emptyDescription', 'emptyHint',
  'sectionTitle', 'helperText', 'tooltip', 'alt', 'header', 'footer', 'heading',
  'subheading', 'kicker', 'badge', 'tag', 'noResults', 'loading', 'error', 'titleText',
  'hintText', 'ariaLabel', 'chip', 'valueLabel', 'statusText', 'footnote', 'overline',
  'statusLabel', 'context',
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

// Text-like literal: starts uppercase/€ and is not a brand/URL/path/code.
function texty(s) {
  if (!s) return false;
  if (SAFE.has(s)) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(s)) return false;
  if (!/^[A-ZÀ-Þ€]/.test(s)) return false;
  if (/^[./#@~]/.test(s)) return false;
  if (/^https?:\/\//i.test(s)) return false;
  return true;
}

function propName(node) {
  if (ts.isPropertyAssignment(node)) {
    const n = node.name;
    if (ts.isIdentifier(n) || ts.isStringLiteral(n)) return n.text;
  }
  return null;
}

const CN_FUNCS = new Set(['cn', 'clsx', 'twMerge']);
function insideCnCall(node) {
  let p = node.parent;
  while (p) {
    if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && CN_FUNCS.has(p.expression.text)) return true;
    if (ts.isStatement(p) || ts.isBlock(p)) return false;
    p = p.parent;
  }
  return false;
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
      if (!texty(s)) return;
      if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && parent.expression.text === 't') return;

      // JSX attribute (direct string) — needs braces
      if (ts.isJsxAttribute(parent) && TEXT_ATTRS.has(parent.name.text)) {
        wrap(node, s, true);
        return;
      }
      // JSX attribute via expression container
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
      // array element under a text-ish property
      if (ts.isArrayLiteralExpression(parent)) {
        let p = parent.parent;
        while (p) {
          if (ts.isPropertyAssignment(p) && TEXT_KEYS.has(propName(p) ?? '')) {
            wrap(node, s, false);
            return;
          }
          if (ts.isArrayLiteralExpression(p) || ts.isObjectLiteralExpression(p)) {
            p = p.parent;
            continue;
          }
          break;
        }
      }
      // ternary branches — but never inside cn()/clsx()/twMerge()
      if (ts.isConditionalExpression(parent) && !insideCnCall(parent)) {
        wrap(node, s, false);
        return;
      }
      // return '…' / () => '…'
      if (ts.isReturnStatement(parent)) {
        wrap(node, s, false);
        return;
      }
      if (ts.isArrowFunction(parent) && parent.body === node) {
        wrap(node, s, false);
        return;
      }
      // const title = '…'
      if (
        ts.isVariableDeclaration(parent) &&
        ts.isIdentifier(parent.name) &&
        TEXT_VARS.has(parent.name.text) &&
        parent.initializer === node
      ) {
        wrap(node, s, false);
        return;
      }
      // toast('…', '…')
      if (
        ts.isCallExpression(parent) &&
        ts.isIdentifier(parent.expression) &&
        (parent.expression.text === 'toast' || parent.expression.text === 'makeToast')
      ) {
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
      console.log('pass3:', path.relative(ROOT, file));
    }
  }
}
console.log(`pass3 transformed ${changed} files`);
