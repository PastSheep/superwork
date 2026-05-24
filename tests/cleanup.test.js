const fs = require('fs');
const path = require('path');
const ws = require(path.join(__dirname, '..', 'lib', 'workflow-state.js'));

const TMP = path.join(__dirname, 'tmp');
const TASK_ID = 'task-20250524-001';

function setup() {
  fs.rmSync(TMP, { recursive: true, force: true });
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

test('cleanupSnapshots removes only the specified task', () => {
  ws.ensureWorkflowDir(TMP);
  ws.writeIndex(TMP, 'task-001', ws.createDefaultIndex('task-001', ['e1'], ['r1'], 't1'));
  ws.writeIndex(TMP, 'task-002', ws.createDefaultIndex('task-002', ['e1'], ['r1'], 't2'));
  ws.cleanupSnapshots(TMP, 'task-001');

  if (fs.existsSync(ws.snapshotsDir(TMP, 'task-001'))) throw new Error('task-001 not cleaned');
  if (!fs.existsSync(ws.snapshotsDir(TMP, 'task-002'))) throw new Error('task-002 wrongly cleaned');
});

test('cleanupSnapshots does not crash when task does not exist', () => {
  ws.ensureWorkflowDir(TMP);
  ws.cleanupSnapshots(TMP, 'nonexistent');
});

test('ensureWorkflowDir is idempotent', () => {
  ws.ensureWorkflowDir(TMP);
  ws.ensureWorkflowDir(TMP);
  ws.ensureWorkflowDir(TMP);
  const root = ws.workflowRoot(TMP);
  if (!fs.existsSync(path.join(root, 'memory'))) throw new Error('memory dir missing');
  if (!fs.existsSync(path.join(root, 'snapshots'))) throw new Error('snapshots dir missing');
});

test('state.json is not cleared by ensureWorkflowDir on second call', () => {
  ws.ensureWorkflowDir(TMP);
  const state = ws.createDefaultState('t1', ['e1'], ['r1']);
  ws.writeState(TMP, state);
  ws.ensureWorkflowDir(TMP);
  const s = ws.readState(TMP);
  if (s.active_task !== 't1') throw new Error('state was overwritten by second ensureWorkflowDir');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
