#!/usr/bin/env node
// superwork recovery hook — 启动时检测 interrupted 标记

const path = require('path');
const projectRoot = process.env.CC_PROJECT_ROOT || process.cwd();

try {
  const ws = require(path.join(__dirname, '..', 'lib', 'workflow-state.js'));

  if (ws.isInterrupted(projectRoot)) {
    const state = ws.readState(projectRoot);
    const taskId = state.active_task;

    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║  ⚠ Superwork 检测到未完成的任务     ║');
    console.log(`║  任务: ${taskId.padEnd(27)}║`);
    console.log('║  输入 /superwork 恢复               ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
    process.exit(0);
  }
  process.exit(0);
} catch (err) {
  process.exit(0);
}
