# 项目 RFC 索引

本目录包含项目的 RFC（Request for Comments）文档。

## RFC 是什么

RFC 用于记录技术设计决策。每个 RFC 描述一个特定功能、架构变更或工程决策，包括问题背景、设计方案、权衡取舍、实现计划和验证方式。

## RFC 状态

| 状态 | 说明 |
|------|------|
| `draft` | 草稿，正在讨论 |
| `accepted` | 已接受，待实现 |
| `implementing` | 实现中 |
| `implemented` | 已实现 |
| `superseded` | 被更新的 RFC 取代 |
| `rejected` | 已拒绝 |

## RFC 列表

### 工程协作

| RFC | 标题 | 状态 | 优先级 |
|-----|------|------|--------|
| [RFC-0000](./0000-pr-rc-number-and-conflict-gate.md) | PR RC 编号与合并冲突门禁 | draft | P2 |

## RFC 编号规则

- 使用 4 位数字编号，如 `0000`、`0001`；
- 编号顺序分配，不跳号；
- 被 superseded 的 RFC 保留原编号；
- 相关功能的 RFC 使用连续编号。
