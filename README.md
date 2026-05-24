# Superwork — Multi-Agent Collaborative Workflow

> [中文版](README_zh.md)

A Claude Code plugin providing a structured multi-agent collaborative workflow: lead agent (PM) + execution group (developers) + verification group (QA).

## Installation

Plugin files live in `~/.claude/plugins/superwork/`.

Register hooks in `~/.claude/settings.json` (see configuration below).

## Usage

```
/superwork
```

The lead agent starts, reads the project changelog and task state, then discusses the task goals and group size with you.

### Workflow

1. You describe the task
2. The lead agent suggests execution and verification group sizes, you confirm
3. Execution group develops in parallel
4. Verification group reviews
5. Pass → auto-record CHANGELOG + Git commit
6. Reject → execution group recovers from snapshots, fixes, re-verified (max 3 rounds)

## Hook Configuration

Add to `~/.claude/settings.json`:

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

## Project File Structure

```
.workflow/
├── state.json              ← current task state
├── memory/
│   ├── context.md          ← project overview
│   ├── CHANGELOG.md        ← development log
│   └── design-decisions.md ← design conventions
├── snapshots/<task-id>/    ← task snapshots (crash recovery)
├── outputs/<task-id>/      ← task outputs
└── history/                ← historical task records (fallback)
```

## Future Upgrade Path (Plan 3: MCP Server Orchestration Engine)

The current version uses a Skill + Hook architecture. Upgrade when these needs become urgent:

- Real-time messaging between agents (instead of file polling)
- Integration of non-Claude model agents
- Cross-project / cross-machine agent pool management
- Web UI for workflow status

### Upgrade Compatibility

The `.workflow/` directory structure and snapshot format remain unchanged in Plan 3. To upgrade:

1. Replace `lib/workflow-state.js` with the MCP server's state management module (file format unchanged)
2. The three prompt templates (superwork/executor/reviewer) logic remains unchanged
3. Hook scripts retire, replaced by the MCP server's event system
4. All L1 test data formats are backward-compatible

The design already reserves clear seams: orchestration logic, state storage, agent communication, and lifecycle management are independent — upgrades require no file format changes.

## License

CC BY-NC 4.0
