# Potluck 概要设计：低耦合三人并行开发方案

> 来源：飞书 PRD「Potluck 产品需求文档（PRD）—— 一桌人的点餐 Agent」第 5 章 6 个 Epic。  
> 目标：在不破坏 Agent 边界的前提下，把 6 个 Epic 拆成可并行开发的低耦合模块，支撑 North Hackathon Topic B 的本地演示与 Vercel Preview。

## 1. 总体原则

### 1.1 架构方向

建议采用 **Next.js + TypeScript** 单体应用，但内部按领域拆成清晰模块：

```text
app/
  前端页面与 Route Handlers

src/
  agent/              Agent 意图解析与结构化输出
  domain/             纯业务规则、推荐、解释、调整
  persistence/        本地状态/SQLite/Prisma 抽象
  api/                API 边界与 zod 校验
  ui/                 React 组件
```

核心思想：

1. **Agent 只负责理解自然语言，输出结构化意图 JSON。**
2. **后端服务负责业务规则校验、推荐、库存、订单状态。**
3. **前端只负责展示和交互，不直接修改业务状态。**
4. **领域层尽量使用纯 TypeScript，可独立测试，方便三人并行。**
5. **所有外部输入必须经过 `zod` 校验，Agent 输出必须有显式类型定义。**

### 1.2 Agent 行为边界

本项目必须遵守 AGENTS.md 中的 Agent 边界：

```text
用户输入自然语言
  ↓
Agent 输出结构化意图 JSON
  ↓
后端用 TypeScript 类型和 zod 校验 Agent 输出
  ↓
后端服务执行库存、预算、过敏原、订单状态等规则
  ↓
后端更新订单和库存
  ↓
Agent 或前端基于结果生成用户可读回复
```

禁止 Agent：

- 直接写数据库；
- 直接扣库存；
- 直接恢复库存；
- 直接创建、修改、取消订单；
- 跳过业务校验；
- 把自然语言字符串当作唯一事实来源。

---

## 2. 6 个 Epic 的职责拆分

| Epic | 产品目标 | 建议模块 | 可独立程度 |
|---|---|---|---|
| Epic 1：获取菜单 | 让系统知道菜单、价格、口味 | `menu` 领域 + 菜单管理 UI | 高 |
| Epic 2：组局 | 设定预算、人数、成员 | `session` / `group` 领域 | 高 |
| Epic 3：表达需求 | 成员用自然语言说忌口和偏好 | `agent intent` + `requirement` 领域 | 中 |
| Epic 4：生成方案 | 基于菜单、预算、硬需求生成方案 | `recommendation` 领域 | 中 |
| Epic 5：解释方案 | 说明为什么选、为什么排除、是否满足 | `explanation` 领域 | 高 |
| Epic 6：调整方案 | 改口后重算，并展示差异 | `plan revision` 领域 | 中 |

---

## 3. 推荐三人分工

### 成员 A：菜单与组局基础数据

负责：

- Epic 1：获取菜单；
- Epic 2：组局；
- 基础类型与本地状态；
- 菜单、成员、预算、人数的输入与编辑；
- 菜单置信度与人工确认字段。

建议产出：

```text
src/domain/menu
src/domain/session
src/features/menu
src/features/session
```

### 成员 B：Agent 意图解析与需求建模

负责：

- Epic 3：表达需求；
- Agent 输出结构化 JSON；
- zod 校验 Agent 输出；
- 需求实体、硬软约束、撤销与覆盖关系；
- 未理解需求显式展示。

建议产出：

```text
src/agent
src/domain/requirements
src/features/requirements
```

### 成员 C：推荐、解释与调整

负责：

- Epic 4：生成方案；
- Epic 5：解释方案；
- Epic 6：调整方案；
- 推荐算法、冲突检测、方案差异；
- 可解释推荐理由。

建议产出：

```text
src/domain/recommendation
src/domain/explanation
src/domain/revision
src/features/plan
```

---

## 4. 低耦合核心设计

### 4.1 领域对象

建议先统一这些核心类型：

```ts
MenuItem
MenuSource
Member
Requirement
RequirementRevision
MealSession
Plan
PlanItem
PlanExplanation
AgentIntent
```

这些类型建议放在：

```text
src/domain/types.ts
```

或者按领域拆分：

```text
src/domain/menu/types.ts
src/domain/session/types.ts
src/domain/requirements/types.ts
src/domain/recommendation/types.ts
```

### 4.2 AgentIntent 建议结构

AgentIntent 建议至少包含：

```ts
type AgentIntent =
  | { action: "list_menu" }
  | { action: "create_menu"; items: MenuItemInput[] }
  | { action: "create_session"; budget?: number; memberCount: number; members?: MemberInput[] }
  | { action: "add_requirement"; memberId: string; text: string }
  | { action: "revoke_requirement"; requirementId: string }
  | { action: "recommend"; strategy?: "balanced" | "cheap" | "coverage" }
  | { action: "explain_plan"; planId: string }
  | { action: "revise_plan"; planId: string; changes: PlanChangeInput[] }
```

---

## 5. Epic 1：获取菜单

### 5.1 功能范围

- 粘贴文本菜单；
- 解析菜名、价格；
- 自动推断品类、辣度、食材、是否素食、建议份数；
- 人工编辑菜单字段；
- 显示低置信度字段；
- 手动添加/删除菜品。

### 5.2 建议接口

```ts
parseTextMenu(text: string): ParsedMenuResult
upsertMenuItem(input: MenuItemInput): MenuItem
deleteMenuItem(id: string): void
confirmMenuItemField(id: string, field: keyof MenuItem): void
```

### 5.3 数据结构

```ts
type MenuItem = {
  id: string
  name: string
  price: number
  category?: "主食" | "荤菜" | "素菜" | "汤" | "面食" | "其他"
  spiciness?: "无辣" | "微辣" | "中辣" | "重辣"
  ingredients: string[]
  containsPork: boolean
  containsBeef: boolean
  containsChicken: boolean
  containsSeafood: boolean
  containsPeanut: boolean
  containsEgg: boolean
  containsDairy: boolean
  isVegetarian: boolean
  suggestedServings: number
  confidence: number
  confirmedFields: string[]
}
```

### 5.4 低耦合要点

菜单领域只输出结构化菜单，不关心预算、成员、方案。

---

## 6. Epic 2：组局

### 6.1 功能范围

- 设置总预算；
- 设置用餐人数；
- 添加成员；
- 成员可独立表达需求；
- 支持打包人员；
- 支持满减或套餐价。

### 6.2 建议接口

```ts
createMealSession(input: MealSessionInput): MealSession
updateBudget(sessionId: string, budget: number): MealSession
updateMemberCount(sessionId: string, memberCount: number): MealSession
addMember(sessionId: string, input: MemberInput): Member
updateMember(sessionId: string, memberId: string, patch: Partial<Member>): Member
setPromotion(sessionId: string, promotion: Promotion): MealSession
```

### 6.3 数据结构

```ts
type MealSession = {
  id: string
  budget: number
  memberCount: number
  members: Member[]
  promotions: Promotion[]
}
```

### 6.4 低耦合要点

组局模块只维护“谁、多少人、多少钱”，不生成方案。

---

## 7. Epic 3：表达需求

### 7.1 功能范围

- 成员用自然语言说需求；
- Agent 解析成结构化需求；
- 展示原话到约束的映射；
- 展示未理解部分；
- 支持追加、撤销、覆盖；
- 区分硬需求和软需求。

### 7.2 Agent 输出示例

```json
{
  "action": "add_requirement",
  "memberId": "member_1",
  "text": "我可以吃微辣，但不吃猪肉",
  "requirements": [
    {
      "type": "spiciness_upper_bound",
      "value": "微辣",
      "hardness": "soft",
      "sourceText": "我可以吃微辣"
    },
    {
      "type": "exclude_ingredient",
      "value": "猪肉",
      "hardness": "hard",
      "sourceText": "不吃猪肉"
    }
  ],
  "unresolvedTexts": []
}
```

### 7.3 需求类型

```ts
type Requirement =
  | { type: "exclude_ingredient"; value: string; hardness: "hard" | "soft" }
  | { type: "spiciness_upper_bound"; value: SpicinessLevel; hardness: "hard" | "soft" }
  | { type: "sweetness_upper_bound"; value: string; hardness: "hard" | "soft" }
  | { type: "vegetarian"; value: true; hardness: "hard" | "soft" }
  | { type: "prefer_ingredient"; value: string; hardness: "soft" }
  | { type: "dislike_dish"; value: string; hardness: "soft" }
  | { type: "appetite"; value: "small" | "normal" | "large" }
```

### 7.4 低耦合要点

需求模块只负责把自然语言转成结构化约束，不负责推荐。

---

## 8. Epic 4：生成方案

### 8.1 功能范围

- 基于菜单、成员、需求、预算生成方案；
- 所有菜品必须来自当前菜单；
- 不得违反硬需求；
- 每人至少有一份能吃；
- 不超预算；
- 菜品搭配尽量均衡；
- 支持多人份共享菜。

### 8.2 输入输出

```ts
generatePlan(input: GeneratePlanInput): PlanResult
```

```ts
type GeneratePlanInput = {
  sessionId: string
  menu: MenuItem[]
  requirementsByMember: Record<string, Requirement[]>
  strategy?: "balanced" | "cheap" | "coverage"
}
```

```ts
type PlanResult =
  | { ok: true; plan: Plan }
  | { ok: false; conflicts: Conflict[]; suggestions: string[] }
```

### 8.3 推荐优先级

建议按以下顺序判断：

```text
1. 硬需求过滤
2. 预算过滤
3. 分类均衡
4. 软需求加分
5. 预算利用
6. 多样性
```

### 8.4 低耦合要点

推荐模块只接收纯数据，不依赖 UI、不依赖 Agent。

---

## 9. Epic 5：解释方案

### 9.1 功能范围

- 每道菜为什么被选中；
- 哪些菜为什么被排除；
- 每个成员需求是否满足；
- 预算使用情况；
- 无法两全时明确说明冲突。

### 9.2 建议接口

```ts
explainPlan(input: ExplainPlanInput): PlanExplanation
```

### 9.3 解释结构

```ts
type PlanExplanation = {
  selectedReasons: SelectedReason[]
  memberRequirementStatus: MemberRequirementStatus[]
  excludedItems: ExcludedItemReason[]
  budget: BudgetExplanation
  conflicts: Conflict[]
}
```

### 9.4 低耦合要点

解释模块依赖 `Plan` 和 `Requirement`，但不修改它们。

---

## 10. Epic 6：调整方案

### 10.1 功能范围

- 需求变化后重算；
- 菜单变化后重算；
- 预算或人数变化后重算；
- 保留旧方案；
- 展示新增、移除、份数变化；
- 支持手动移除某道菜并补菜；
- 支持锁定某道菜。

### 10.2 建议接口

```ts
revisePlan(input: RevisePlanInput): RevisionResult
```

### 10.3 差异结构

```ts
type PlanDiff = {
  addedItems: PlanItem[]
  removedItems: PlanItem[]
  changedItems: PlanItemChange[]
  summary: string
}
```

### 10.4 低耦合要点

调整模块调用推荐和解释模块，不自己重新实现规则。

---

## 11. 数据流设计

```text
菜单录入
  → MenuRepository

组局配置
  → SessionRepository

自然语言需求
  → AgentIntentParser
  → zod validate
  → RequirementRepository

菜单 + 组局 + 需求
  → RecommendationService
  → PlanRepository

Plan
  → ExplanationService
  → ExplanationView

Plan + 新输入
  → RevisionService
  → PlanDiff
```

---

## 12. 存储建议

为了 Demo 和 Vercel 预览稳定，建议优先使用：

### 方案 A：SQLite + Prisma

优点：

- 真实后端状态；
- 本地可运行；
- Vercel 预览可用；
- 适合订单、菜单、需求持久化。

缺点：

- 需要配置 Prisma schema。

### 方案 B：内存状态 + 本地 JSON seed

优点：

- 最快实现；
- 适合 Hackathon Demo；
- 耦合低。

缺点：

- 刷新丢失；
- 不够“真实后端”。

### 推荐

如果时间紧：  
**先用内存状态 + seed 数据，接口保持 Repository 抽象，后续可替换为 SQLite。**

---

## 13. API 设计

建议 Route Handlers：

```text
POST /api/menu/parse
POST /api/menu/items
PATCH /api/menu/items/:id
DELETE /api/menu/items/:id

POST /api/session
PATCH /api/session/:id
POST /api/session/:id/members

POST /api/requirements
DELETE /api/requirements/:id

POST /api/plans
GET /api/plans/:id
POST /api/plans/:id/revise

GET /api/plans/:id/explanation
```

所有外部输入必须用 `zod` 校验。

---

## 14. 前端页面结构

建议一个主页面即可：

```text
/
  左侧：菜单区
  中间：成员与需求区
  右侧：方案与解释区
```

### 14.1 左侧：菜单

- 粘贴菜单；
- 编辑菜品；
- 显示置信度；
- 删除/新增菜品。

### 14.2 中间：成员与需求

- 设置预算、人数；
- 添加成员；
- 输入自然语言需求；
- 展示结构化需求；
- 展示未理解文本；
- 撤销需求。

### 14.3 右侧：方案

- 生成方案；
- 展示菜品、份数、总价；
- 展示预算进度；
- 展示解释；
- 展示调整差异。

---

## 15. 并行开发边界

### 15.1 成员 A 可以独立做

- 菜单录入；
- 菜单编辑；
- 菜单置信度；
- 组局配置；
- 成员管理；
- 预算、人数、优惠。

不依赖：

- Agent；
- 推荐算法；
- 方案解释。

### 15.2 成员 B 可以独立做

- AgentIntent schema；
- 需求解析；
- 需求存储；
- 原话映射；
- 未理解项展示；
- 撤销/覆盖逻辑。

不依赖：

- 菜单 UI；
- 推荐算法；
- 方案解释。

### 15.3 成员 C 可以独立做

- 推荐算法；
- 冲突检测；
- 解释生成；
- 方案差异；
- 调整方案。

依赖：

- 菜单数据结构；
- 成员数据结构；
- 需求数据结构。

因此建议成员 A 和 B 先定类型，成员 C 等类型稳定后接入。

---

## 16. 建议开发顺序

### 16.1 第一阶段：基础闭环

1. 菜单数据结构；
2. 组局数据结构；
3. 需求数据结构；
4. AgentIntent schema；
5. 简单内存 Repository；
6. 前端三栏布局。

### 16.2 第二阶段：核心能力

1. 文本菜单解析；
2. 自然语言需求解析；
3. 推荐生成；
4. 方案解释；
5. 方案调整差异。

### 16.3 第三阶段：体验增强

1. 置信度提示；
2. 撤销需求；
3. 冲突说明；
4. 预算进度；
5. 方案对比。

---

## 17. 最小可演示路径

Demo 可以固定为：

1. 粘贴菜单；
2. 设置预算 250、4 人；
3. 添加成员 A/B/C/D；
4. A 说“不吃猪肉”；
5. B 说“花生过敏”；
6. C 说“想吃辣一点”；
7. Agent 解析需求；
8. 生成方案；
9. 展示解释；
10. B 改口说“花生可以吃一点”；
11. 重算并展示差异；
12. 手动移除一道菜，系统补菜；
13. 展示预算使用率。

---

## 18. 风险与取舍

### 18.1 风险：Agent 解析不稳定

建议：

- 使用固定 schema；
- 对无法解析的部分显式返回 unresolvedTexts；
- 不做过度自由发挥。

### 18.2 风险：推荐算法复杂

建议：

- V1 用贪心 + 规则过滤；
- 不追求全局最优；
- 重点是可解释、不违反硬约束、不超预算。

### 18.3 风险：多人并行冲突

建议：

- 先定类型；
- 再分模块实现；
- 所有业务逻辑通过服务函数调用，不直接跨模块改状态。

---

## 19. 最终建议

如果 3 个人要快速并行，建议采用：

```text
成员 A：菜单 + 组局
成员 B：Agent + 需求
成员 C：推荐 + 解释 + 调整
```

并且先统一：

```text
MenuItem
Member
Requirement
MealSession
Plan
AgentIntent
```

这样耦合最低，也最符合 PRD 对 Agent 边界的要求。
