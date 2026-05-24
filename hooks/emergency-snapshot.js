#!/usr/bin/env node
// superwork Stop hook — 紧急快照 + 标记 interrupted

const path = require('path');
const projectRoot = process.env.CC_PROJECT_ROOT || process.cwd();

try {
  const ws = require(path.join(__dirname, '..', 'lib', 'workflow-state.js'));

  const state = ws.readState(projectRoot);
  if (!state || !state.active_task) {
    process.exit(0);
  }

  ws.markInterrupted(projectRoot);
  console.log(`[superwork] 紧急快照已保存: ${state.active_task}`);
  process.exit(0);
} catch (err) {
  console.error(`[superwork] 紧急快照失败: ${err.message}`);
  process.exit(0);
}
