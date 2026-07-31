# 0001 - 现场开发宪法与第 3 组任务技能

## 状态

Accepted

## 背景

第 3 组「North Food」现场开发需要统一协作规则，避免开发任务没有 RFC、认领状态不透明、PR 与现场任务脱节。

此前已创建飞书多维表格维护开发待办，但缺少根目录宪法文件和可复用的 Codex skill，导致后续开发时无法稳定触发同一套 RFC-first 流程。

## 目标

1. 在仓库根目录提供 `AGENTS.md`，作为后续开发宪法。
2. 提供 `skills/north-food-site-constitution`，让 Codex 在开发前自动遵循 RFC-first 和飞书任务更新流程。
3. 保持 `现场文件.md` 与宪法内容一致，记录飞书多维表格配置和现场流程。
4. 明确第 3 组、North Food 开发待办这一上下文。

## 非目标

1. 不实现 North Food 业务功能。
2. 不创建具体业务 RFC。
3. 不修改飞书多维表格字段结构。

## 设计

本 RFC 定义的现场方案由四部分共同落地：根目录 `AGENTS.md` 中的 Agent 宪法、`现场文件.md` 中的飞书多维表格配置、飞书多维表格 `第 3 组 North Food 开发待办` 本身，以及 `skills/north-food-site-constitution` 这个 Codex skill。

### 根目录宪法

新增 `AGENTS.md`，包含：

- RFC first 原则；
- 飞书多维表格作为唯一现场看板；
- 任务创建、认领、阻塞、完成规则；
- PR 关联 RFC、飞书任务、验证方式和风险。

### Codex skill

新增 `skills/north-food-site-constitution`：

- `SKILL.md`：描述触发场景和必须执行的工作流。
- `agents/openai.yaml`：提供 UI 展示名称、简短描述和默认 prompt。

Skill 名称使用 `north-food-site-constitution`，用于第 3 组 North Food 仓库。

### 现场文件

保留 `现场文件.md`，记录：

- 飞书多维表格 Base URL 和 token；
- 数据表 `第 3 组 North Food 开发待办`；
- 字段说明；
- 现场开发流程。

## 验收标准

- 根目录存在 `AGENTS.md`，且明确第 3 组 North Food 开发宪法。
- 根目录存在 `现场文件.md`，且飞书表名和组号为第 3 组。
- 存在 `skills/north-food-site-constitution/SKILL.md`，且 frontmatter `name` 为 `north-food-site-constitution`。
- 存在 `skills/north-food-site-constitution/agents/openai.yaml`。
- `python3 /Users/guxiang/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/north-food-site-constitution` 通过。
- PR 中包含上述文件，不包含临时图片资源或误建的现场开发宪法文件。

## 风险与依赖

- 飞书多维表格依赖当前登录身份具备 user 权限。
- Skill 需要被 Codex 自动发现或手动加载后才能生效。
- 若后续项目从第 3 组切换到其他组，需要同步更新 `AGENTS.md`、`现场文件.md`、skill 描述和飞书表名。
