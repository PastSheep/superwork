const fs = require('fs');
const path = require('path');

const WORKFLOW_DIR = '.workflow';

function workflowRoot(projectRoot) {
  return path.join(projectRoot, WORKFLOW_DIR);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureWorkflowDir(projectRoot) {
  const root = workflowRoot(projectRoot);
  ensureDir(root);
  ensureDir(path.join(root, 'memory'));
  ensureDir(path.join(root, 'snapshots'));
  ensureDir(path.join(root, 'outputs'));
  ensureDir(path.join(root, 'history'));

  const contextPath = path.join(root, 'memory', 'context.md');
  if (!fs.existsSync(contextPath)) {
    fs.writeFileSync(contextPath, '# 项目概述\n\n（请描述你的项目，主 agent 会在每次启动时读取此文件）\n', 'utf-8');
  }

  const changelogPath = path.join(root, 'memory', 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    fs.writeFileSync(changelogPath, '# 项目开发日志\n\n', 'utf-8');
  }

  const designPath = path.join(root, 'memory', 'design-decisions.md');
  if (!fs.existsSync(designPath)) {
    fs.writeFileSync(designPath, '# 设计约定\n\n', 'utf-8');
  }
}

// --- State ---

function readState(projectRoot) {
  const p = path.join(workflowRoot(projectRoot), 'state.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeState(projectRoot, state) {
  ensureWorkflowDir(projectRoot);
  state.last_updated = new Date().toISOString();
  const p = path.join(workflowRoot(projectRoot), 'state.json');
  fs.writeFileSync(p, JSON.stringify(state, null, 2), 'utf-8');
}

function createDefaultState(taskId, executors, reviewers) {
  return {
    active_task: taskId,
    status: 'executing',
    interrupted: false,
    round: 1,
    executors: executors,
    reviewers: reviewers,
    blocked_tasks: [],
    deferred_issues: [],
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString()
  };
}

// --- Task ID ---

function generateTaskId(projectRoot) {
  const root = workflowRoot(projectRoot);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  ensureDir(root);

  // 从独立计数器文件读取（不受 state.json 覆盖影响）
  const counterPath = path.join(root, '.task-counter');
  let counter = 1;
  if (fs.existsSync(counterPath)) {
    const data = JSON.parse(fs.readFileSync(counterPath, 'utf-8'));
    if (data.date === today) {
      counter = data.counter + 1;
    }
  }

  fs.writeFileSync(counterPath, JSON.stringify({ date: today, counter }), 'utf-8');

  const seq = String(counter).padStart(3, '0');
  return `task-${today}-${seq}`;
}

// --- Interrupted ---

function markInterrupted(projectRoot) {
  const state = readState(projectRoot);
  if (state && state.active_task) {
    state.interrupted = true;
    state.status = 'interrupted';
    writeState(projectRoot, state);
  }
}

function clearInterrupted(projectRoot) {
  const state = readState(projectRoot);
  if (state && state.interrupted) {
    state.interrupted = false;
    if (state.status === 'interrupted') {
      state.status = 'executing';
    }
    writeState(projectRoot, state);
  }
}

function isInterrupted(projectRoot) {
  const state = readState(projectRoot);
  return state && state.interrupted === true;
}

// --- Snapshots ---

function snapshotsDir(projectRoot, taskId) {
  return path.join(workflowRoot(projectRoot), 'snapshots', taskId);
}

function readIndex(projectRoot, taskId) {
  const p = path.join(snapshotsDir(projectRoot, taskId), 'index.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeIndex(projectRoot, taskId, data) {
  ensureDir(snapshotsDir(projectRoot, taskId));
  const p = path.join(snapshotsDir(projectRoot, taskId), 'index.json');
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

function createDefaultIndex(taskId, executors, reviewers, taskSummary) {
  return {
    task_id: taskId,
    status: 'executing',
    round: 1,
    task_summary: taskSummary,
    executors: executors.map(id => ({ id, status: 'in_progress' })),
    reviewers: reviewers.map(id => ({ id, status: 'pending' })),
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString()
  };
}

function readAgentSnapshot(projectRoot, taskId, agentId) {
  const p = path.join(snapshotsDir(projectRoot, taskId), `${agentId}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeAgentSnapshot(projectRoot, taskId, agentId, data) {
  ensureDir(snapshotsDir(projectRoot, taskId));
  const p = path.join(snapshotsDir(projectRoot, taskId), `${agentId}.json`);
  data.last_updated = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

function writeMainAgentSnapshot(projectRoot, taskId, data) {
  writeAgentSnapshot(projectRoot, taskId, 'main-agent', data);
}

function readMainAgentSnapshot(projectRoot, taskId) {
  return readAgentSnapshot(projectRoot, taskId, 'main-agent');
}

function writeReviewFeedback(projectRoot, taskId, feedback) {
  ensureDir(snapshotsDir(projectRoot, taskId));
  const p = path.join(snapshotsDir(projectRoot, taskId), 'review-feedback.json');
  fs.writeFileSync(p, JSON.stringify(feedback, null, 2), 'utf-8');
}

function readReviewFeedback(projectRoot, taskId) {
  const p = path.join(snapshotsDir(projectRoot, taskId), 'review-feedback.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function cleanupSnapshots(projectRoot, taskId) {
  const dir = snapshotsDir(projectRoot, taskId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// --- Memory ---

function readFileSafe(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf-8');
}

function readChangelog(projectRoot) {
  return readFileSafe(path.join(workflowRoot(projectRoot), 'memory', 'CHANGELOG.md'));
}

function appendChangelog(projectRoot, entry) {
  const p = path.join(workflowRoot(projectRoot), 'memory', 'CHANGELOG.md');
  const line = `- ${new Date().toISOString().slice(0, 10)}: ${entry}\n`;
  fs.appendFileSync(p, line, 'utf-8');
}

function readContext(projectRoot) {
  return readFileSafe(path.join(workflowRoot(projectRoot), 'memory', 'context.md'));
}

function writeContext(projectRoot, content) {
  ensureWorkflowDir(projectRoot);
  const p = path.join(workflowRoot(projectRoot), 'memory', 'context.md');
  fs.writeFileSync(p, content, 'utf-8');
}

function readDesignDecisions(projectRoot) {
  return readFileSafe(path.join(workflowRoot(projectRoot), 'memory', 'design-decisions.md'));
}

function appendDesignDecision(projectRoot, entry) {
  const p = path.join(workflowRoot(projectRoot), 'memory', 'design-decisions.md');
  const line = `- ${new Date().toISOString().slice(0, 10)}: ${entry}\n`;
  fs.appendFileSync(p, line, 'utf-8');
}

// --- History ---

function writeHistory(projectRoot, taskName, data) {
  ensureWorkflowDir(projectRoot);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${date}-${taskName}.json`;
  const p = path.join(workflowRoot(projectRoot), 'history', filename);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  workflowRoot,
  ensureDir,
  ensureWorkflowDir,
  readState,
  writeState,
  createDefaultState,
  generateTaskId,
  markInterrupted,
  clearInterrupted,
  isInterrupted,
  snapshotsDir,
  readIndex,
  writeIndex,
  createDefaultIndex,
  readAgentSnapshot,
  writeAgentSnapshot,
  writeMainAgentSnapshot,
  readMainAgentSnapshot,
  writeReviewFeedback,
  readReviewFeedback,
  cleanupSnapshots,
  readChangelog,
  appendChangelog,
  readContext,
  writeContext,
  readDesignDecisions,
  appendDesignDecision,
  writeHistory
};
