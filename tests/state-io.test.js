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

test('readState returns null when state.json does not exist', () => {
  const s = ws.readState(TMP);
  if (s !== null) throw new Error('expected null');
});

test('writeState and readState round-trip', () => {
  const state = ws.createDefaultState('task-001', ['e1'], ['r1']);
  ws.writeState(TMP, state);
  const s = ws.readState(TMP);
  if (s.active_task !== 'task-001') throw new Error('active_task mismatch');
  if (s.status !== 'executing') throw new Error('status mismatch');
  if (!s.last_updated) throw new Error('missing last_updated');
});

test('createDefaultState has correct structure', () => {
  const s = ws.createDefaultState('t1', ['e1', 'e2'], ['r1']);
  if (s.round !== 1) throw new Error('round mismatch');
  if (s.executors.length !== 2) throw new Error('executors count mismatch');
  if (s.reviewers.length !== 1) throw new Error('reviewers count mismatch');
  if (s.blocked_tasks.length !== 0) throw new Error('blocked_tasks not empty');
  if (s.deferred_issues.length !== 0) throw new Error('deferred_issues not empty');
});

test('generateTaskId creates unique IDs', () => {
  const id1 = ws.generateTaskId(TMP);
  const id2 = ws.generateTaskId(TMP);
  if (id1 === id2) throw new Error('IDs should be unique');
  if (!id1.startsWith('task-')) throw new Error('invalid ID format');
});

test('markInterrupted and isInterrupted', () => {
  const state = ws.createDefaultState('t1', ['e1'], ['r1']);
  ws.writeState(TMP, state);
  if (ws.isInterrupted(TMP)) throw new Error('should not be interrupted initially');
  ws.markInterrupted(TMP);
  if (!ws.isInterrupted(TMP)) throw new Error('should be interrupted after mark');
  const s = ws.readState(TMP);
  if (s.status !== 'interrupted') throw new Error('status should be interrupted');
});

test('clearInterrupted restores status', () => {
  const state = ws.createDefaultState('t1', ['e1'], ['r1']);
  ws.writeState(TMP, state);
  ws.markInterrupted(TMP);
  ws.clearInterrupted(TMP);
  if (ws.isInterrupted(TMP)) throw new Error('should not be interrupted after clear');
  if (ws.readState(TMP).status !== 'executing') throw new Error('status should be executing');
});

test('markInterrupted does nothing without active task', () => {
  ws.markInterrupted(TMP);
  // should not crash
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
