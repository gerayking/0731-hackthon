---
name: north-food-site-constitution
description: Use for the North Food hackathon group 3 repository when starting development, writing RFCs, creating/updating Feishu Base development tasks, claiming tasks, updating task status/assignee, or following the local AGENTS.md site constitution. Trigger on requests like “先写 RFC”, “创建开发任务”, “认领任务”, “更新状态”, “第 3 组 North Food 开发待办”, or any change that needs RFC-first workflow enforcement.
---

# North Food Site Constitution Skill

## Purpose

This skill turns the local `AGENTS.md` into an actionable workflow for the 第 3 组「North Food」repository. Use it before starting any development work so RFCs, Feishu Base tasks, ownership, and status updates stay consistent.

## Required workflow

1. **Start with RFC**
   - For new features, refactors, bug fixes with design impact, UI/API changes, or delivery-scope changes, create or update an RFC before implementation.
   - The RFC must cover background, goals, non-goals, scope, design, acceptance criteria, risks, dependencies, and rollback/verification plan.

2. **Create or update the Feishu Base task**
   - Base: `第 3 组 North Food 开发待办`
   - URL: `https://sxddhcrtbqu.feishu.cn/base/ZkmTb8cl9aqfBesBXmic6qTonqe`
   - Table: `开发任务`
   - Initial status: `待认领`
   - Fill title, description, linked RFC, linked file, priority, and acceptance criteria.

3. **Claiming by different members**
   - When someone claims a task, update the Feishu Base record:
     - `状态`: `已认领` or `进行中`
     - `认领人`: current owner
     - `认领时间`: current time
   - If blocked, set `状态` to `已阻塞` and explain the blocker in `备注`.

4. **Completion**
   - When implementation is done, update the task to `待评审` or `已完成`.
   - Record implementation summary, verification result, and unresolved issues in `备注`.
   - Open or update a PR that references the RFC, Feishu task, validation steps, and risks.

## Local constitution files

- `AGENTS.md`: the source-of-truth site constitution for agents.
- `现场文件.md`: Feishu Base configuration and on-site workflow notes.
- This skill: reusable guidance for following the constitution.

## Do not skip

Do not start implementation before both conditions are true:

- RFC exists or has been updated for the change.
- Feishu Base task exists with initial status `待认领`.
