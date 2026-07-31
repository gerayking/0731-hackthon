# Potluck 概要设计：三大模块接口契约版

> 来源：飞书 PRD「Potluck 产品需求文档（PRD）—— 一桌人的点餐 Agent」第 5 章 6 个 Epic。  
> 目标：按大模块拆分给 3 个人并行开发，重点定义模块边界、输入输出接口和集成方式，避免开发过程中互相等待。

## 0. 核心结论

按用户指定的三人并行方式，本方案拆成 **三个大模块**：

| 模块 | 负责人 | 覆盖范围 | 核心职责 | 是否直接修改业务状态 |
|---|---|---|---|---|
| M1：菜单与组局前后端模块 | A | Epic 1 获取菜单、Epic 2 组局 | 菜单数据、组局数据、菜单/组局 UI、前后端 API | 是，只修改菜单和组局状态 |
| M2：OCR 与用户需求 Agent 模块 | B | Epic 1 OCR、Epic 3 表达需求 | 菜单图片识别、文本菜单识别、用户需求解析、AgentIntent 输出 | 否，只输出结构化意图/候选结果 |
| M3：方案生成与解释 Agent 模块 | C | Epic 4 生成方案、Epic 5 解释方案、Epic 6 调整方案 | 基于快照生成方案、解释方案、生成调整建议 | 否，输出 PlanIntent/PlanResult，由后端规则层执行 |

### 并行原则

1. **三个模块都可以当天开工。**
2. **模块之间只通过 JSON snapshot 和 API contract 交互。**
3. **模块之间不共享运行时状态，不互相 import 业务实现。**
4. **Agent 模块只输出结构化意图或方案草案，不直接写菜单、组局、订单、库存。**
5. **最终集成由页面 wiring 和轻量 adapter 完成，不要求重构核心模块。**

---

## 1. 总体架构

```text
app/
  页面与 Route Handlers

src/
  menu-session/          M1：菜单与组局前后端模块
  ocr-requirement-agent/ M2：OCR 与用户需求 Agent 模块
  plan-explanation-agent/ M3：方案生成与解释 Agent 模块

contracts/
  snapshots.ts           只放 JSON 契约类型或示例，不暴露业务实现
```

### 模块关系

```text
M2 OCR/需求 Agent
  ├─ 输出 MenuCandidateSnapshot
  └─ 输出 RequirementsSnapshot
        ↓
M1 菜单与组局模块
  ├─ 管理 MenuItem
  ├─ 管理 MealSession
  └─ 输出 MenuSessionSnapshot
        ↓
M3 方案生成与解释 Agent
  ├─ 输入 MenuSessionSnapshot + RequirementsSnapshot
  ├─ 输出 PlanIntent / PlanResult
  └─ 输出 ExplanationSnapshot / PlanDiff
```

### 重要边界

- M1 是唯一维护菜单和组局运行时状态的模块。
- M2 不直接改菜单，只把 OCR 结果作为 `MenuCandidateSnapshot` 交给 M1 确认。
- M3 不直接改菜单、需求、订单或库存，只基于快照生成方案、解释和调整建议。
- 所有 Agent 输出必须经过 `zod` 校验，再进入后端服务规则层。

---

## 2. 6 个 Epic 的模块归属

| Epic | 产品目标 | 归属模块 | 并行说明 |
|---|---|---|---|
| Epic 1：获取菜单 | 让系统知道菜单、价格、口味 | M1 + M2 | M1 做菜单 CRUD 和 UI；M2 做 OCR/识别候选 |
| Epic 2：组局 | 设定预算、人数、成员 | M1 | M1 独立实现 session 状态和 UI |
| Epic 3：表达需求 | 成员用自然语言说忌口和偏好 | M2 | M2 独立实现需求解析和 AgentIntent |
| Epic 4：生成方案 | 基于菜单、预算、硬需求生成方案 | M3 | M3 使用本地 planning fixture 独立开发 |
| Epic 5：解释方案 | 说明为什么选、为什么排除、是否满足 | M3 | M3 基于 Plan JSON 独立生成解释 |
| Epic 6：调整方案 | 改口后重算，并展示差异 | M3 | M3 基于 Plan JSON diff 独立开发 |

---

## 3. 模块间接口总览

### 3.1 M1 对外提供的接口

M1 提供两类接口：

```text
POST /api/menu/items              创建/更新菜单项
GET  /api/menu-session/snapshot   获取菜单 + 组局快照
```

M1 输出：

```ts
MenuSessionSnapshot
```

M1 接收：

```ts
MenuItemInput
MealSessionInput
MenuCandidateSnapshot
```

### 3.2 M2 对外提供的接口

M2 提供两类接口：

```text
POST /api/ocr/extract-menu      OCR 菜单图片，输出菜单候选
POST /api/requirements/parse    解析用户需求，输出需求候选
```

M2 输出：

```ts
MenuCandidateSnapshot
RequirementsSnapshot
AgentIntent
```

M2 接收：

```ts
OcrInput
RequirementInput
```

### 3.3 M3 对外提供的接口

M3 提供三类接口：

```text
POST /api/plans/generate   生成方案
POST /api/plans/explain    解释方案
POST /api/plans/revise     调整方案
```

M3 输出：

```ts
PlanIntent
PlanResult
ExplanationSnapshot
PlanDiff
```

M3 接收：

```ts
PlanningInputSnapshot
RevisionInputSnapshot
```

---

## 4. 公共 JSON Snapshot 契约

> 这些 snapshot 是模块间唯一需要尽早对齐的内容。每个模块都可以先在自己的 fixture 中维护样例，不需要等待其他模块实现。

### 4.1 MenuSessionSnapshot

由 M1 输出，M3 消费。

```json
{
  "menu": [
    {
      "id": "dish_001",
      "name": "宫保鸡丁饭",
      "price": 48,
      "category": "主食",
      "spiciness": "微辣",
      "ingredients": ["鸡肉", "花生", "米饭"],
      "containsPork": false,
      "containsBeef": false,
      "containsChicken": true,
      "containsSeafood": false,
      "containsPeanut": true,
      "containsEgg": false,
      "containsDairy": false,
      "isVegetarian": false,
      "suggestedServings": 1,
      "confidence": 0.82,
      "confirmedFields": ["name", "price"]
    }
  ],
  "session": {
    "id": "session_demo",
    "budget": 250,
    "memberCount": 4,
    "members": [
      { "id": "member_a", "name": "A", "needsTakeout": false },
      { "id": "member_b", "name": "B", "needsTakeout": false },
      { "id": "member_c", "name": "C", "needsTakeout": false },
      { "id": "member_d", "name": "D", "needsTakeout": true }
    ],
    "promotions": []
  }
}
```

### 4.2 MenuCandidateSnapshot

由 M2 OCR 输出，M1 接收后由用户确认是否写入菜单。

```json
{
  "source": "ocr",
  "candidates": [
    {
      "name": "宫保鸡丁饭",
      "price": 48,
      "category": "主食",
      "spiciness": "微辣",
      "ingredients": ["鸡肉", "花生", "米饭"],
      "confidence": 0.82,
      "lowConfidenceFields": []
    }
  ]
}
```

### 4.3 RequirementsSnapshot

由 M2 输出，M3 消费。

```json
{
  "requirementsByMember": {
    "member_a": [
      {
        "id": "req_001",
        "type": "exclude_ingredient",
        "value": "猪肉",
        "hardness": "hard",
        "sourceText": "不吃猪肉",
        "status": "active"
      }
    ],
    "member_b": [
      {
        "id": "req_002",
        "type": "exclude_ingredient",
        "value": "花生",
        "hardness": "hard",
        "sourceText": "花生过敏",
        "status": "active"
      }
    ],
    "member_c": [
      {
        "id": "req_003",
        "type": "spiciness_upper_bound",
        "value": "微辣",
        "hardness": "soft",
        "sourceText": "我可以吃微辣",
        "status": "active"
      }
    ]
  }
}
```

### 4.4 PlanningInputSnapshot

由 M3 接收，通常由页面 wiring 拼接：

```text
MenuSessionSnapshot + RequirementsSnapshot -> PlanningInputSnapshot
```

```json
{
  "menu": [],
  "session": {},
  "requirementsByMember": {},
  "strategy": "balanced"
}
```

### 4.5 PlanResult

由 M3 输出，页面展示，后续也可交给后端规则层执行。

```json
{
  "plan": {
    "id": "plan_demo",
    "items": [
      {
        "dishId": "dish_001",
        "dishName": "宫保鸡丁饭",
        "quantity": 2,
        "unitPrice": 48,
        "subtotal": 96,
        "sharedBy": ["member_a", "member_c"]
      }
    ],
    "totalPrice": 96,
    "budget": 250,
    "status": "valid"
  },
  "explanation": {
    "selectedReasons": [],
    "memberRequirementStatus": [],
    "excludedItems": [],
    "budget": {
      "used": 96,
      "budget": 250,
      "percent": 38.4
    },
    "conflicts": []
  }
}
```

---

## 5. M1：菜单与组局前后端模块

### 5.1 负责人与范围

负责人：A。

覆盖：

- Epic 1：获取菜单；
- Epic 2：组局；
- 菜单前后端；
- 组局前后端；
- 菜单状态管理；
- 组局状态管理；
- 与 M2/M3 的 snapshot 接口。

### 5.2 模块职责

M1 负责维护系统中“真实可用”的菜单和组局数据：

- 菜品名称；
- 菜品价格；
- 菜品品类；
- 辣度；
- 食材；
- 过敏原标记；
- 是否素食；
- 建议份数；
- 置信度；
- 人工确认字段；
- 总预算；
- 用餐人数；
- 成员；
- 打包标记；
- 优惠信息。

### 5.3 建议目录

```text
src/menu-session/
  domain/
    menu.ts
    session.ts
  repository/
    memory-menu-repository.ts
    memory-session-repository.ts
  api/
    menu-routes.ts
    session-routes.ts
    snapshot-routes.ts
  ui/
    menu-panel.tsx
    session-panel.tsx
  fixtures/
    menu-seed.ts
    session-seed.ts
```

### 5.4 M1 输入接口

```ts
type MenuItemInput = {
  id?: string
  name: string
  price: number
  category?: string
  spiciness?: string
  ingredients?: string[]
  containsPork?: boolean
  containsBeef?: boolean
  containsChicken?: boolean
  containsSeafood?: boolean
  containsPeanut?: boolean
  containsEgg?: boolean
  containsDairy?: boolean
  isVegetarian?: boolean
  suggestedServings?: number
  confidence?: number
  confirmedFields?: string[]
}
```

```ts
type MealSessionInput = {
  id?: string
  budget: number
  memberCount: number
  members?: MemberInput[]
  promotions?: PromotionInput[]
}
```

### 5.5 M1 输出接口

```ts
type MenuSessionSnapshot = {
  menu: MenuItem[]
  session: MealSession
}
```

### 5.6 M1 与 M2 的接口

M2 可以输出 `MenuCandidateSnapshot`，但 M1 必须让用户确认后再写入真实菜单：

```text
M2 OCR 输出候选
  → M1 展示候选
  → 用户确认
  → M1 写入 MenuItem
  → M1 更新 MenuSessionSnapshot
```

M1 不直接调用 OCR。

### 5.7 M1 与 M3 的接口

M3 不读取 M1 的内部状态，只消费 M1 输出的 `MenuSessionSnapshot`：

```text
M1 GET /api/menu-session/snapshot
  → M3 PlanningInputSnapshot.menu
  → M3 PlanningInputSnapshot.session
```

---

## 6. M2：OCR 与用户需求 Agent 模块

### 6.1 负责人与范围

负责人：B。

覆盖：

- Epic 1 OCR；
- Epic 3 表达需求；
- 菜单 OCR；
- 文本菜单识别；
- 用户自然语言需求解析；
- AgentIntent 输出；
- 需求候选结果。

### 6.2 模块职责

M2 负责把非结构化输入转成结构化候选：

- 菜单图片 OCR；
- 菜单文本解析；
- 菜品字段识别；
- 用户自然语言需求解析；
- 原话到需求类型的映射；
- 未理解文本；
- 硬需求/软需求区分；
- 撤销/覆盖意图识别。

M2 不维护真实菜单状态，也不生成最终方案。

### 6.3 建议目录

```text
src/ocr-requirement-agent/
  domain/
    agent-intent.ts
    requirements.ts
    menu-candidate.ts
  parser/
    menu-ocr-parser.ts
    requirement-parser.ts
  api/
    ocr-routes.ts
    requirement-routes.ts
  ui/
    ocr-panel.tsx
    requirement-panel.tsx
  fixtures/
    ocr-seed.ts
    requirement-seed.ts
```

### 6.4 M2 输入接口

```ts
type OcrInput = {
  mode: "image" | "text"
  content: string
}
```

```ts
type RequirementInput = {
  memberId: string
  text: string
}
```

### 6.5 M2 输出接口

```ts
type MenuCandidateSnapshot = {
  source: "ocr" | "text"
  candidates: MenuItemInput[]
}
```

```ts
type RequirementsSnapshot = {
  requirementsByMember: Record<string, Requirement[]>
}
```

```ts
type AgentIntent =
  | { action: "add_requirement"; memberId: string; text: string; requirements: RequirementInput[]; unresolvedTexts: string[] }
  | { action: "revoke_requirement"; requirementId: string }
  | { action: "override_requirement"; memberId: string; text: string; previousRequirementId: string; requirements: RequirementInput[] }
```

### 6.6 M2 与 M1 的接口

M2 输出菜单候选，M1 负责确认和落库：

```text
M2 MenuCandidateSnapshot
  → M1 用户确认
  → M1 MenuItem
```

### 6.7 M2 与 M3 的接口

M2 输出 `RequirementsSnapshot`，M3 消费：

```text
M2 RequirementsSnapshot
  → M3 PlanningInputSnapshot.requirementsByMember
```

---

## 7. M3：方案生成与解释 Agent 模块

### 7.1 负责人与范围

负责人：C。

覆盖：

- Epic 4 生成方案；
- Epic 5 解释方案；
- Epic 6 调整方案；
- 方案生成 Agent；
- 方案解释 Agent；
- 方案调整 Agent；
- Plan diff。

### 7.2 模块职责

M3 负责基于输入快照生成方案、解释和调整建议：

- 读取 `PlanningInputSnapshot`；
- 过滤违反硬需求的菜品；
- 检查预算；
- 生成推荐方案；
- 生成每道菜的选择理由；
- 生成每个成员的需求满足状态；
- 生成排除原因；
- 生成冲突说明；
- 生成调整建议；
- 生成 Plan diff。

M3 不直接写菜单、组局、需求、订单或库存。

### 7.3 建议目录

```text
src/plan-explanation-agent/
  domain/
    plan.ts
    planning-context.ts
    explanation.ts
    revision.ts
  service/
    generate-plan.ts
    explain-plan.ts
    revise-plan.ts
    diff-plan.ts
  api/
    plan-routes.ts
  ui/
    plan-panel.tsx
  fixtures/
    planning-seed.ts
```

### 7.4 M3 输入接口

```ts
type PlanningInputSnapshot = {
  menu: MenuItem[]
  session: MealSession
  requirementsByMember: Record<string, Requirement[]>
  strategy?: "balanced" | "cheap" | "coverage"
}
```

```ts
type RevisionInputSnapshot = {
  previousPlan: Plan
  currentContext: PlanningInputSnapshot
  requestedChanges: PlanChangeRequest[]
}
```

### 7.5 M3 输出接口

```ts
type PlanIntent = {
  action: "create_plan" | "revise_plan"
  input: PlanningInputSnapshot
  requestedChanges?: PlanChangeRequest[]
}
```

```ts
type PlanResult =
  | { ok: true; plan: Plan }
  | { ok: false; conflicts: Conflict[]; suggestions: string[] }
```

```ts
type ExplanationSnapshot = {
  selectedReasons: SelectedReason[]
  memberRequirementStatus: MemberRequirementStatus[]
  excludedItems: ExcludedItemReason[]
  budget: BudgetExplanation
  conflicts: Conflict[]
}
```

```ts
type PlanDiff = {
  addedItems: PlanItem[]
  removedItems: PlanItem[]
  changedItems: PlanItemChange[]
  summary: string
}
```

### 7.6 M3 与 M1/M2 的接口

M3 不直接调用 M1/M2 的内部实现，只通过 snapshot 获取数据：

```text
M1 MenuSessionSnapshot.menu
M1 MenuSessionSnapshot.session
M2 RequirementsSnapshot.requirementsByMember
  → M3 PlanningInputSnapshot
  → M3 PlanResult
  → M3 ExplanationSnapshot
```

---

## 8. 后端规则层边界

为了满足 AGENTS.md 的 Agent 边界，M2 和 M3 的 Agent 输出不能直接修改业务状态。

### 8.1 标准流程

```text
用户输入自然语言或上传图片
  ↓
M2 Agent 输出结构化意图 JSON
  ↓
zod 校验
  ↓
M1 或后端规则层确认是否写入菜单/需求
  ↓
M1 输出 MenuSessionSnapshot
  ↓
M2 输出 RequirementsSnapshot
  ↓
M3 生成 PlanIntent / PlanResult
  ↓
后端规则层校验预算、库存、过敏原、订单状态
  ↓
业务状态更新
  ↓
前端展示结果
```

### 8.2 禁止行为

Agent 模块禁止：

- 直接写数据库；
- 直接扣库存；
- 直接恢复库存；
- 直接创建、修改、取消订单；
- 跳过业务校验；
- 把自然语言字符串当作唯一事实来源。

---

## 9. 并行开发接口约定

### 9.1 A/M1 可以先做什么

A 不需要等 B/C，直接开发：

- `MenuItemInput` 局部类型；
- `MealSessionInput` 局部类型；
- 菜单 CRUD；
- 组局 CRUD；
- 菜单 UI；
- 组局 UI；
- `GET /api/menu-session/snapshot`；
- 本地 fixture。

A 只需要保证最终能输出：

```ts
MenuSessionSnapshot
```

### 9.2 B/M2 可以先做什么

B 不需要等 A/C，直接开发：

- `OcrInput`；
- `MenuCandidateSnapshot`；
- `RequirementInput`；
- `RequirementsSnapshot`；
- `AgentIntent`；
- OCR/需求解析 UI；
- 本地 fixture。

B 只需要保证最终能输出：

```ts
MenuCandidateSnapshot
RequirementsSnapshot
```

### 9.3 C/M3 可以先做什么

C 不需要等 A/B，直接开发：

- `PlanningInputSnapshot` 本地 fixture；
- `generatePlan`；
- `explainPlan`；
- `revisePlan`；
- `diffPlan`；
- 方案 UI；
- Plan 展示；
- Explanation 展示。

C 只需要保证最终能消费：

```ts
PlanningInputSnapshot
```

并输出：

```ts
PlanResult
ExplanationSnapshot
PlanDiff
```

---

## 10. 最终集成方式

### 10.1 页面 wiring

最终页面只负责把三个模块串起来：

```text
M1 MenuSessionPanel
M1 SessionPanel
M2 OcrPanel
M2 RequirementPanel
M3 PlanPanel
```

页面不实现业务规则，只做：

- 展示 M1 菜单；
- 展示 M1 组局；
- 展示 M2 OCR/需求；
- 调用 M1 snapshot；
- 调用 M2 requirements snapshot；
- 拼接 `PlanningInputSnapshot`；
- 调用 M3 生成方案；
- 展示 M3 解释和 diff。

### 10.2 Adapter

建议只写一个轻量 adapter：

```text
src/integration/snapshot-adapter.ts
```

职责：

```text
MenuSessionSnapshot + RequirementsSnapshot -> PlanningInputSnapshot
```

不写复杂业务逻辑。

### 10.3 集成顺序

```text
1. M1 能导出 MenuSessionSnapshot
2. M2 能导出 RequirementsSnapshot
3. adapter 能拼接 PlanningInputSnapshot
4. M3 能消费 PlanningInputSnapshot
5. 页面能展示 PlanResult / ExplanationSnapshot / PlanDiff
```

---

## 11. API 汇总

### 11.1 M1：菜单与组局 API

```text
POST /api/menu/items
PATCH /api/menu/items/:id
DELETE /api/menu/items/:id
POST /api/menu/candidates/confirm
POST /api/session
PATCH /api/session/:id
GET /api/menu-session/snapshot
```

### 11.2 M2：OCR 与需求 API

```text
POST /api/ocr/extract-menu
POST /api/requirements/parse
POST /api/requirements
PATCH /api/requirements/:id
DELETE /api/requirements/:id
GET /api/requirements/snapshot
```

### 11.3 M3：方案 API

```text
POST /api/plans/generate
POST /api/plans/explain
POST /api/plans/revise
POST /api/plans/diff
```

---

## 12. 最小可演示路径

Demo 可以固定为：

1. M1 粘贴菜单；
2. M2 OCR 菜单图片，输出菜单候选；
3. M1 确认菜单候选；
4. M1 设置预算 250、4 人；
5. M1 添加成员 A/B/C/D；
6. M2 输入 A 的需求：“不吃猪肉”；
7. M2 输入 B 的需求：“花生过敏”；
8. M2 输入 C 的需求：“想吃辣一点”；
9. M2 展示结构化需求；
10. M3 生成方案；
11. M3 展示解释；
12. M2 让 B 改口：“花生可以吃一点”；
13. M3 重算并展示差异；
14. M3 手动移除一道菜，系统补菜；
15. M1/M3 展示预算使用率。

---

## 13. 每个模块的 Definition of Done

### 13.1 M1 的 DoD

- 菜单 CRUD 可运行；
- 组局 CRUD 可运行；
- 菜单 UI 可展示；
- 组局 UI 可展示；
- 能确认 M2 的菜单候选；
- 能导出 `MenuSessionSnapshot`；
- M1 不 import M2/M3 的业务实现。

### 13.2 M2 的 DoD

- OCR 菜单可输出 `MenuCandidateSnapshot`；
- 用户需求可输出 `RequirementsSnapshot`；
- AgentIntent 有 `zod` schema；
- 原话到需求映射可展示；
- 未理解文本可展示；
- 撤销/覆盖需求可展示；
- M2 不直接写菜单、订单、库存。

### 13.3 M3 的 DoD

- 可消费 `PlanningInputSnapshot`；
- 可生成 `PlanResult`；
- 可生成 `ExplanationSnapshot`；
- 可生成 `PlanDiff`；
- 不违反硬需求；
- 不超预算；
- 每人至少有一份能吃；
- M3 不直接写菜单、需求、订单、库存。

---

## 14. 风险与取舍

### 14.1 风险：snapshot 字段漂移

建议：

- 每个模块维护自己的 fixture；
- 每个模块先按本地类型开发；
- 最终通过 `contracts/snapshots.ts` 对齐字段；
- 不要求开发过程中共享运行时状态。

### 14.2 风险：Agent 越权

建议：

- M2/M3 的 Agent 只输出结构化 JSON；
- 所有 Agent 输出经过 `zod` 校验；
- 写菜单、写需求、写订单必须走 M1 或后端规则层；
- 不允许 Agent 直接调用 repository 修改状态。

### 14.3 风险：集成时字段不一致

建议：

- M1 输出 `MenuSessionSnapshot`；
- M2 输出 `RequirementsSnapshot`；
- M3 只消费 `PlanningInputSnapshot`；
- 集成只写 adapter，不改业务模块核心逻辑。

---

## 15. 最终建议

三人并行时建议采用：

```text
A：M1 菜单与组局前后端模块
B：M2 OCR 与用户需求 Agent 模块
C：M3 方案生成与解释 Agent 模块
```

每个模块各自维护：

```text
domain
api
ui
fixtures
tests
```

模块之间只约定：

```text
MenuCandidateSnapshot
MenuSessionSnapshot
RequirementsSnapshot
PlanningInputSnapshot
PlanResult
ExplanationSnapshot
PlanDiff
```

这样三个人可以按大模块并行开发，最后通过 snapshot 和轻量 adapter 集成，既满足 PRD 对 Agent 边界的要求，也避免开发过程中互相阻塞。
