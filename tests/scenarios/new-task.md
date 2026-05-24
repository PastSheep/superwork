# 场景：新任务启动

## 初始状态
- .workflow/ 不存在

## 预期行为
1. 主 agent 调用 ensureWorkflowDir 创建 .workflow/ 结构
2. 读取 context.md → 发现占位内容 → 提示用户填写项目概述
3. 读取 CHANGELOG.md → 空日志 → 知道这是新项目
4. state.json 不存在 → 确认没有未完成任务
5. 向用户询问本次任务目标

## 验证方式
人工：输入 `/superwork` 在无 `.workflow/` 的项目中，观察主 agent 行为是否符合预期
