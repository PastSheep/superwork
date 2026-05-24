const fs = require('fs');
const path = require('path');
const ws = require(path.join(__dirname, '..', 'lib', 'workflow-state.js'));

const TMP = path.join(__dirname, 'tmp');

function setup() {
  fs.rmSync(TMP, { recursive: true, force: true });
  ws.ensureWorkflowDir(TMP);
}

function teardown() {
  fs.rmSync(TMP, { recursive: true, force: true });
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    setup();
    fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL: ${name} — ${e.message}`);
  }
  teardown();
}

test('readChangelog returns non-empty after ensure', () => {
  const c = ws.readChangelog(TMP);
  if (!c.includes('项目开发日志')) throw new Error('missing header');
});

test('appendChangelog adds dated entries', () => {
  ws.appendChangelog(TMP, '测试功能A (superwork)');
  ws.appendChangelog(TMP, '测试功能B (superwork)');
  const c = ws.readChangelog(TMP);
  const lines = c.split('\n').filter(l => l.match(/^- \d{4}-\d{2}-\d{2}: /));
  if (lines.length !== 2) throw new Error('expected 2 dated entries, got ' + lines.length);
});

test('readContext returns placeholder on first read', () => {
  const c = ws.readContext(TMP);
  if (!c.includes('项目概述')) throw new Error('missing placeholder');
});

test('writeContext and readContext round-trip', () => {
  ws.writeContext(TMP, '# MyProject\nA cool project.');
  const c = ws.readContext(TMP);
  if (!c.includes('MyProject')) throw new Error('context mismatch');
});

test('readDesignDecisions and appendDesignDecision', () => {
  const d = ws.readDesignDecisions(TMP);
  if (!d.includes('设计约定')) throw new Error('missing header');

  ws.appendDesignDecision(TMP, '使用 Codec 序列化');
  ws.appendDesignDecision(TMP, 'Mod ID: mysupermod');
  const d2 = ws.readDesignDecisions(TMP);
  const lines = d2.split('\n').filter(l => l.match(/^- \d{4}-\d{2}-\d{2}: /));
  if (lines.length !== 2) throw new Error('expected 2 entries');
});

test('writeHistory creates dated file', () => {
  ws.writeHistory(TMP, '附魔系统', { verdict: 'approved', executors: ['e1'] });
  const historyDir = path.join(ws.workflowRoot(TMP), 'history');
  const files = fs.readdirSync(historyDir);
  const match = files.find(f => f.includes('附魔系统'));
  if (!match) throw new Error('history file not found in ' + files.join(', '));
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
