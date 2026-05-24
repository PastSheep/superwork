const fs = require('fs');
const path = require('path');
const ws = require(path.join(__dirname, '..', 'lib', 'workflow-state.js'));

const TMP = path.join(__dirname, 'tmp');
const TASK_ID = 'task-20250524-001';

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

test('readIndex returns null when not exists', () => {
  if (ws.readIndex(TMP, TASK_ID) !== null) throw new Error('expected null');
});

test('writeIndex and readIndex round-trip', () => {
  const idx = ws.createDefaultIndex(TASK_ID, ['e1', 'e2'], ['r1'], '测试');
  ws.writeIndex(TMP, TASK_ID, idx);
  const r = ws.readIndex(TMP, TASK_ID);
  if (r.task_id !== TASK_ID) throw new Error('task_id mismatch');
  if (r.executors.length !== 2) throw new Error('executors count');
  if (r.reviewers[0].id !== 'r1') throw new Error('reviewer id');
});

test('writeAgentSnapshot and readAgentSnapshot', () => {
  const data = { agent_id: 'executor-1', progress: 'done', key_decisions: ['k1'] };
  ws.writeAgentSnapshot(TMP, TASK_ID, 'executor-1', data);
  const r = ws.readAgentSnapshot(TMP, TASK_ID, 'executor-1');
  if (r.progress !== 'done') throw new Error('progress mismatch');
  if (!r.last_updated) throw new Error('missing last_updated');
});

test('main agent snapshot convenience methods', () => {
  const data = { summary: '所有执行组完成', next: '派发验证组' };
  ws.writeMainAgentSnapshot(TMP, TASK_ID, data);
  const r = ws.readMainAgentSnapshot(TMP, TASK_ID);
  if (r.summary !== data.summary) throw new Error('main agent snapshot mismatch');
});

test('review feedback round-trip', () => {
  const fb = { verdict: 'rejected', issues: [{ file: 'x.java', severity: 'blocker', desc: 'bad' }] };
  ws.writeReviewFeedback(TMP, TASK_ID, fb);
  const r = ws.readReviewFeedback(TMP, TASK_ID);
  if (r.verdict !== 'rejected') throw new Error('verdict mismatch');
  if (r.issues.length !== 1) throw new Error('issues count');
});

test('cleanupSnapshots removes directory', () => {
  ws.writeIndex(TMP, TASK_ID, ws.createDefaultIndex(TASK_ID, ['e1'], ['r1'], 't'));
  ws.cleanupSnapshots(TMP, TASK_ID);
  if (fs.existsSync(ws.snapshotsDir(TMP, TASK_ID))) throw new Error('directory not removed');
});

test('createDefaultIndex sets initial statuses', () => {
  const idx = ws.createDefaultIndex(TASK_ID, ['e1', 'e2'], ['r1'], 'summary');
  if (idx.executors[0].status !== 'in_progress') throw new Error('executor status');
  if (idx.reviewers[0].status !== 'pending') throw new Error('reviewer status');
  if (idx.status !== 'executing') throw new Error('task status');
  if (idx.round !== 1) throw new Error('round');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
