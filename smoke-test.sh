#!/usr/bin/env bash
set -euo pipefail

echo "=== oh-my-awesome-agent Smoke Test ==="
echo ""

# 1. TypeScript compile check
echo "[1/8] TypeScript compile check..."
npx tsc -p tsconfig.smoke.json
echo "  ✅ Extension compiles without errors"
echo ""

# 2. Package manifest integrity
echo "[2/8] Package manifest integrity..."
node -e "
const pkg = require('./package.json');
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
assert(pkg.name === 'oh-my-awesome-agent', 'name mismatch');
assert(pkg.pi, 'missing pi field');
assert(Array.isArray(pkg.pi.extensions), 'pi.extensions must be array');
assert(Array.isArray(pkg.pi.prompts), 'pi.prompts must be array');
assert(Array.isArray(pkg.pi.skills), 'pi.skills must be array');
assert(Array.isArray(pkg.pi.themes), 'pi.themes must be array');
console.log('  ✅ package.json structure valid');
"
echo ""

# 3. Referenced paths exist
echo "[3/8] Referenced paths exist..."
node -e "
const fs = require('fs');
const pkg = require('./package.json');
const check = (arr, label) => {
  for (const p of arr) {
    if (!fs.existsSync(p)) throw new Error('Missing ' + label + ': ' + p);
  }
};
check(pkg.pi.extensions, 'extension');
check(pkg.pi.prompts, 'prompt');
check(pkg.pi.skills, 'skill');
check(pkg.pi.themes, 'theme');
console.log('  ✅ All referenced paths exist');
"
echo ""

# 4. Prompt templates sanity
echo "[4/8] Prompt templates sanity..."
node -e "
const fs = require('fs');
const path = require('path');
const promptsDir = './prompts';
const files = fs.readdirSync(promptsDir).filter(f => f.endsWith('.md'));
if (files.length === 0) throw new Error('No prompt templates found');
if (files.length < 5) throw new Error('Expected at least 5 prompt templates, found ' + files.length);
for (const f of files) {
  const content = fs.readFileSync(path.join(promptsDir, f), 'utf-8');
  if (!content.startsWith('---')) throw new Error(f + ' missing frontmatter');
  if (!content.includes('\$ARGUMENTS')) throw new Error(f + ' missing \$ARGUMENTS placeholder');
}
console.log('  ✅ ' + files.length + ' prompt templates OK');
"
echo ""

# 5. Skills sanity
echo "[5/8] Skills sanity..."
node -e "
const fs = require('fs');
const path = require('path');
const skillsDir = './skills';
const dirs = fs.readdirSync(skillsDir).filter(d => fs.statSync(path.join(skillsDir, d)).isDirectory());
if (dirs.length === 0) throw new Error('No skills found');
for (const d of dirs) {
  const skillFile = path.join(skillsDir, d, 'SKILL.md');
  if (!fs.existsSync(skillFile)) throw new Error('Missing SKILL.md in ' + d);
  const content = fs.readFileSync(skillFile, 'utf-8');
  if (!content.startsWith('---')) throw new Error(d + ' missing frontmatter');
  if (!content.includes('name:')) throw new Error(d + ' missing name in frontmatter');
  if (!content.includes('description:')) throw new Error(d + ' missing description in frontmatter');
}
console.log('  ✅ ' + dirs.length + ' skills OK');
"
echo ""

# 6. Themes sanity
echo "[6/8] Themes sanity..."
node -e "
const fs = require('fs');
const path = require('path');
const themesDir = './themes';
const files = fs.readdirSync(themesDir).filter(f => f.endsWith('.json'));
if (files.length === 0) throw new Error('No themes found');
const required = [
  'accent','border','borderAccent','borderMuted','success','error','warning','muted','dim','text','thinkingText',
  'selectedBg','userMessageBg','userMessageText','customMessageBg','customMessageText','customMessageLabel','toolPendingBg','toolSuccessBg','toolErrorBg','toolTitle','toolOutput',
  'mdHeading','mdLink','mdLinkUrl','mdCode','mdCodeBlock','mdCodeBlockBorder','mdQuote','mdQuoteBorder','mdHr','mdListBullet',
  'toolDiffAdded','toolDiffRemoved','toolDiffContext',
  'syntaxComment','syntaxKeyword','syntaxFunction','syntaxVariable','syntaxString','syntaxNumber','syntaxType','syntaxOperator','syntaxPunctuation',
  'thinkingOff','thinkingMinimal','thinkingLow','thinkingMedium','thinkingHigh','thinkingXhigh','bashMode'
];
for (const f of files) {
  const theme = JSON.parse(fs.readFileSync(path.join(themesDir, f), 'utf-8'));
  if (!theme.name) throw new Error(f + ' missing name');
  for (const token of required) {
    if (!(token in theme.colors)) throw new Error(f + ' missing color token: ' + token);
  }
}
console.log('  ✅ ' + files.length + ' themes OK');
"
echo ""

# 7. Source structure
echo "[7/8] Source structure..."
node -e "
const fs = require('fs');
const required = [
  'src/index.ts',
  'src/constants.ts',
  'src/commands/ultrawork.ts',
  'src/commands/hyperplan.ts',
  'src/commands/scout.ts',
  'src/commands/review.ts',
  'src/commands/finish.ts',
  'src/commands/doctor.ts',
  'src/guardrails/bash-guard.ts',
  'src/guardrails/protected-paths.ts',
  'src/utils/session.ts'
];
for (const f of required) {
  if (!fs.existsSync(f)) throw new Error('Missing source file: ' + f);
}
console.log('  ✅ All required source files present');
"
echo ""

# 8. Extension exports a default function
echo "[8/8] Extension exports check..."
grep -q "export default function" src/index.ts || { echo "  ❌ Missing default export"; exit 1; }
echo "  ✅ Extension exports a default function"
echo ""

echo "=== All smoke tests passed ==="
