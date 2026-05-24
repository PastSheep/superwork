# 场景：崩溃恢复

## 初始状态
```json
// state.json
{ "active_task": "task-20250524-001", "status": "interrupted", "interrupted": true, ... }

// snapshots/task-20250524-001/index.json
{ "status": "verifying", "executors": [...], "reviewers": [{ "id": "reviewer-1", "status": "in_progress" }], ... }
```

## 预期行为
1. 用户输入 `/superwork`
2. 主 agent 读 state.json → 发现 interrupted
3. 主 agent 读 index.json (T1) → 知道验证组在审查中
4. 主 agent 汇报：「上次任务附魔系统在进行中，验证组 reviewer-1 未完成。是否继续？」
5. 用户选择继续 → 主 agent 恢复验证流程

## 验证方式
人工：手动构造上述文件状态，输入 `/superwork` 观察恢复行为
