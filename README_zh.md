# Superwork — 多 Agent 协作工作流

> [English](README.md)

Claude Code 插件，提供结构化的多 agent 协作工作流：主 agent（项目经理）+ 执行组（开发者）+ 验证组（QA）。

## 安装

插件文件位于 `~/.claude/plugins/superwork/`。

在 `~/.claude/settings.json` 中注册 hook（参见下方配置）。

## 使用

```
/superwork
```

主 agent 启动，读取项目开发日志和任务状态，与你讨论任务目标和组规模。

### 工作流

1. 你描述任务
2. 主 agent 建议执行组和验证组规模，你确认
3. 执行组并行开发
4. 验证组审查
5. 通过 → 自动记录 CHANGELOG + Git commit
6. 驳回 → 执行组从快照恢复，修复后重新验证（最多 3 轮）

## Hook 配置

在 `~/.claude/settings.json` 中添加：

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "command": "node ~/.claude/plugins/superwork/hooks/emergency-snapshot.js"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "command": "node ~/.claude/plugins/superwork/hooks/recovery-check.js"
      }
    ]
  }
}
```

## 项目文件结构

```
.workflow/
├── state.json              ← 当前任务状态
├── memory/
│   ├── context.md          ← 项目概述
│   ├── CHANGELOG.md        ← 开发日志
│   └── design-decisions.md ← 设计约定
├── snapshots/<task-id>/    ← 任务快照（崩溃恢复）
├── outputs/<task-id>/      ← 任务产出物
└── history/                ← 历史任务记录（兜底）
```

## 未来升级方向（方案 3：MCP Server 编排引擎）

当前版本采用 Skill + Hook 架构。当以下需求变得迫切时可升级：

- agent 间需要实时消息通信（而非文件轮询）
- 需要接入非 Claude 模型的 agent
- 需要跨项目/跨机器的 agent 池管理
- 需要 Web UI 查看工作流状态

### 升级兼容性

`.workflow/` 目录结构和快照格式在方案 3 中保持不变。升级时：

1. 将 `lib/workflow-state.js` 替换为 MCP server 的状态管理模块（文件格式不变）
2. 三个 Prompt 模板（superwork/executor/reviewer）逻辑保持不变
3. Hook 脚本退役，由 MCP server 的事件系统替代
4. 所有 L1 测试数据格式向后兼容

现有设计已预留清晰切面：编排逻辑、状态存储、agent 通信、生命周期管理各自独立，升级不需要改文件格式。

## 许可

CC BY-NC 4.0
