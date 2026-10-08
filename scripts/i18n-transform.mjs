// One-shot i18n transform for app/ + components/.
// Uses the TypeScript AST to wrap user-facing strings in t('...'):
//  - JSX text nodes          → {t('...')}
//  - text-ish string literals (props, labels, returns, branches, toasts) → t('...')
// Brand names, ids, statuses, classNames and URLs are left untouched.
// Run once; the key-extraction script verifies coverage afterwards.

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
  '⌘K', 'Esc', 'Enter', '⏎', '⌘', 'Ctrl', 'Tab', 'Shift',
  '—', '–', '·', '→', '↑', '↓', '★', '✓', '✕', '…', '€', '%', '&', '+', '×',
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
  'tooltip', 'hint',
]);

const TEXT_VARS = new Set([
  'title', 'label', 'description', 'detail', 'body', 'hint', 'text', 'message', 'caption',
  'placeholder', 'eyebrow', 'cta', 'actionLabel', 'objective', 'reason', 'summary',
  'answer', 'question', 'note', 'emptyTitle', 'emptyBody', 'emptyHint', 'sectionTitle',
  'noResults', 'loadingText', 'errorText', 'header', 'footer', 'heading', 'subheading',
  'tooltip', 'altText', 'statusLabel', 'hintText',
]);

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

function escapeForJs(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function textyLiteral(s) {
  if (!s) return false;
  if (SAFE.has(s)) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(s)) return false;
  if (/^[./#@~]/.test(s)) return false;
  if (/^https?:\/\//i.test(s)) return false;
  if (/^[a-z][a-z0-9_]*$/i.test(s) && !/\s/.test(s)) return false; // single lowercase word = code-ish
  return /^[A-ZÀ-Þ€]/.test(s) || /\s/.test(s);
}

function textyJsx(raw) {
  const s = decodeEntities(raw).replace(/\s+/g, ' ').trim();
  if (!s) return false;
  if (SAFE.has(s)) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(s)) return false;
  if (s.length <= 2 && !/\s/.test(s)) return false;
  const hasLower = /[a-zà-ÿ]/.test(s);
  const allCaps = /^[A-ZÀ-Þ][A-ZÀ-Þ0-9 ·&/–—'(),.%«»"-]*$/.test(s);
  return hasLower || allCaps;
}

const report = { translated: [], skippedText: [] };

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

  const wrapLiteral = (node, s) => {
    const key = s.replace(/\s+/g, ' ').trim();
    edits.push({ pos: node.getStart(sf), end: node.getEnd(), text: `t('${escapeForJs(key)}')` });
    usesT = true;
    report.translated.push(`${path.relative(ROOT, filePath)} :: ${key}`);
  };

  const visit = (node) => {
    // ---- JSX text ----
    if (ts.isJsxText(node)) {
      const raw = node.getText(sf);
      if (textyJsx(raw)) {
        const decoded = decodeEntities(raw);
        const leading = decoded.match(/^\s*/)[0];
        const trailing = decoded.match(/\s*$/)[0];
        const core = decoded.trim().replace(/\s+/g, ' ');
        edits.push({
          pos: node.getStart(sf),
          end: node.getEnd(),
          text: `${leading}{t('${escapeForJs(core)}')}${trailing}`,
        });
        usesT = true;
        report.translated.push(`${path.relative(ROOT, filePath)} [jsx] :: ${core}`);
      } else {
        const t = decodeEntities(raw).trim();
        if (t && /[A-Za-zÀ-ÿ]/.test(t) && !SAFE.has(t)) report.skippedText.push(`${path.relative(ROOT, filePath)} [jsx-skip] :: ${t}`);
      }
      return; // no children
    }

    // ---- string literals ----
    if (ts.isStringLiteral(node)) {
      const s = node.text;
      const parent = node.parent;
      // never double-wrap
      if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && parent.expression.text === 't') {
        return;
      }
      if (!textyLiteral(s)) return;
      let translate = false;

      // JSX attribute: title="..." etc (attr value needs braces)
      if (ts.isJsxAttribute(parent) && TEXT_ATTRS.has(parent.name.text)) {
        const key = s.replace(/\s+/g, ' ').trim();
        edits.push({ pos: node.getStart(sf), end: node.getEnd(), text: `{t('${escapeForJs(key)}')}` });
        usesT = true;
        report.translated.push(`${path.relative(ROOT, filePath)} [attr] :: ${key}`);
        return;
      }
      if (
        ts.isJsxExpression(parent) &&
        ts.isJsxAttribute(parent.parent) &&
        TEXT_ATTRS.has(parent.parent.name.text)
      )
        translate = true;

      // object property: { title: '...' }
      if (ts.isPropertyAssignment(parent) && TEXT_KEYS.has(propName(parent) ?? '')) translate = true;

      // array element under a text-ish property (or nested in such arrays/objects)
      if (ts.isArrayLiteralExpression(parent)) {
        let p = parent.parent;
        while (p) {
          if (ts.isPropertyAssignment(p) && TEXT_KEYS.has(propName(p) ?? '')) {
            translate = true;
            break;
          }
          if (ts.isArrayLiteralExpression(p) || ts.isObjectLiteralExpression(p)) {
            p = p.parent;
            continue;
          }
          break;
        }
      }

      // return '...' / () => '...'
      if (ts.isReturnStatement(parent)) translate = true;
      if (ts.isArrowFunction(parent) && parent.body === node) translate = true;

      // toast('...', '...') / makeToast(...)
      if (
        ts.isCallExpression(parent) &&
        ts.isIdentifier(parent.expression) &&
        (parent.expression.text === 'toast' || parent.expression.text === 'makeToast')
      )
        translate = true;

      // const title = '...'
      if (
        ts.isVariableDeclaration(parent) &&
        ts.isIdentifier(parent.name) &&
        TEXT_VARS.has(parent.name.text) &&
        parent.initializer === node
      )
        translate = true;

      if (translate) wrapLiteral(node, s);
      return;
    }

    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (!usesT) return false;

  // apply edits from the end
  edits.sort((a, b) => b.pos - a.pos);
  let out = src;
  for (const e of edits) out = out.slice(0, e.pos) + e.text + out.slice(e.end);

  // add the i18n import if missing
  if (!out.includes("from '@/lib/i18n'")) {
    const sf2 = ts.createSourceFile(filePath, out, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let lastImportEnd = 0;
    for (const stmt of sf2.statements) {
      if (ts.isImportDeclaration(stmt)) lastImportEnd = stmt.getEnd();
    }
    if (lastImportEnd > 0) {
      out = out.slice(0, lastImportEnd) + "\nimport { t } from '@/lib/i18n';" + out.slice(lastImportEnd);
    } else {
      out = "import { t } from '@/lib/i18n';\n" + out;
    }
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
    if (transformFile(file)) changed++;
  }
}

console.log(`transformed ${changed} files`);
console.log(`translated ${report.translated.length} strings`);
fs.writeFileSync(
  path.join(ROOT, 'scripts', 'i18n-report.json'),
  JSON.stringify(report, null, 2),
);
console.log('report → scripts/i18n-report.json');
const skipped = [...new Set(report.skippedText)];
console.log(`\n--- skipped JSX texts that still look like words (${skipped.length}) ---`);
for (const s of skipped) console.log('  SKIP:', s);
