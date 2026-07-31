# Potluck 概要设计：ABC 零依赖并行开发方案

> 来源：飞书 PRD「Potluck 产品需求文档（PRD）—— 一桌人的点餐 Agent」第 5 章 6 个 Epic。  
> 目标：把 6 个 Epic 拆成 A/B/C 三个可以当天同时开工、互不阻塞、最终可集成的工作包，支撑 North Hackathon Topic B 的本地演示与 Vercel Preview。

## 0. 核心结论

为了满足「ABC 并行干活，不能出现依赖」的要求，本方案不再按传统前后端或模块上下游拆任务，而是采用 **三个垂直工作包**：

| 工作包 | 负责人 | 覆盖 Epic | 独立启动方式 | 最终集成方式 |
|---|---|---|---|---|
| A：菜单与组局工作台 | A | Epic 1 获取菜单、Epic 2 组局 | 使用本地 seed 菜单和 session fixture | 输出 JSON snapshot，供页面 wiring 展示 |
| B：Agent 需求理解工作台 | B | Epic 3 表达需求 | 使用本地需求 fixture，不读取菜单/方案 | 输出 JSON snapshot，供页面 wiring 展示 |
| C：方案计算与解释工作台 | C | Epic 4 生成方案、Epic 5 解释方案、Epic 6 调整方案 | 使用本地 planning fixture | 输出 Plan JSON，供页面 wiring 展示 |

关键原则：

1. **A/B/C 不互相 import 业务模块。**
2. **A/B/C 不等待别人先实现类型或服务。**
3. **每个人都有自己的本地 fixture 和测试数据。**
4. **最终集成只通过 JSON snapshot 和页面 wiring 拼接，不要求业务模块互相耦合。**
5. **Agent 仍然只输出结构化意图，不直接修改订单、库存、菜单或方案。**

---

## 1. 总体原则

### 1.1 架构方向

建议采用 **Next.js + TypeScript** 单体应用，但内部按工作包拆成三个互不阻塞的垂直区域：

```text
app/
  页面与 Route Handlers

src/
  workbench-menu-session/     A：菜单与组局工作台
  workbench-agent-requirements/ B：Agent 需求理解工作台
  workbench-plan/             C：方案计算与解释工作台

shared/
  snapshots/                  仅保存 JSON fixture 与契约样例，不作为业务依赖
```

> 注意：`shared/snapshots` 只放 JSON fixture、契约样例、测试数据，不暴露业务服务接口。A/B/C 的业务代码不从对方模块导入实现。

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

### 1.3 零依赖并行原则

A/B/C 三人并行时，必须遵守以下规则：

| 规则 | 含义 |
|---|---|
| 不等待公共类型 | 每个人先在自己工作包内定义局部类型，后续通过 snapshot 对齐 |
| 不跨工作包 import | A 不 import B/C，B 不 import A/C，C 不 import A/B |
| 不共享运行时状态 | 每个人使用自己的本地 store / fixture / repository |
| 不阻塞页面开发 | 每个工作包先渲染自己的区域，最终由页面 wiring 拼接 |
| 不提前做全局集成 | 集成只在最后通过 JSON snapshot 和轻量 adapter 完成 |

---

## 2. 6 个 Epic 的职责拆分

| Epic | 产品目标 | 归属工作包 | 并行方式 |
|---|---|---|---|
| Epic 1：获取菜单 | 让系统知道菜单、价格、口味 | A | A 使用 seed 菜单和本地菜单编辑器，不等待推荐算法 |
| Epic 2：组局 | 设定预算、人数、成员 | A | A 使用本地 session 状态，不等待 Agent 解析 |
| Epic 3：表达需求 | 成员用自然语言说忌口和偏好 | B | B 使用本地 requirement fixture，不等待菜单/方案 |
| Epic 4：生成方案 | 基于菜单、预算、硬需求生成方案 | C | C 使用本地 planning fixture，不等待 A/B 页面 |
| Epic 5：解释方案 | 说明为什么选、为什么排除、是否满足 | C | C 基于 Plan JSON 生成解释，不依赖 UI 状态 |
| Epic 6：调整方案 | 改口后重算，并展示差异 | C | C 基于 Plan JSON diff，不依赖 A/B 模块 |

---

## 3. ABC 三人并行分工

### 3.1 A：菜单与组局工作台

#### 负责范围

- Epic 1：获取菜单；
- Epic 2：组局；
- 左侧菜单区；
- 中间组局区；
- 菜单 seed 数据；
- 本地菜单与 session repository；
- 菜单、成员、预算、人数的输入与编辑；
- 菜单置信度与人工确认字段。

#### 建议产出

```text
src/workbench-menu-session/domain/menu.ts
src/workbench-menu-session/domain/session.ts
src/workbench-menu-session/repository/memory-menu-repository.ts
src/workbench-menu-session/repository/memory-session-repository.ts
src/workbench-menu-session/api/menu-routes.ts
src/workbench-menu-session/api/session-routes.ts
src/workbench-menu-session/ui/menu-panel.tsx
src/workbench-menu-session/ui/session-panel.tsx
src/workbench-menu-session/fixtures/menu-seed.ts
src/workbench-menu-session/fixtures/session-seed.ts
```

#### 可独立验收

A 不需要 B/C 完成，只要满足：

- 可以粘贴文本菜单并解析出结构化菜品；
- 可以编辑菜名、价格、品类、辣度、食材；
- 可以显示低置信度字段；
- 可以设置预算、用餐人数、成员；
- 可以导出当前菜单和组局状态的 JSON snapshot；
- 页面左侧和中间区域可以独立展示。

#### 不依赖

- 不依赖 Agent 解析；
- 不依赖推荐算法；
- 不依赖方案解释；
- 不读取 B/C 的业务模块。

---

### 3.2 B：Agent 需求理解工作台

#### 负责范围

- Epic 3：表达需求；
- AgentIntent schema；
- zod 校验 Agent 输出；
- 需求实体、硬软约束、撤销与覆盖关系；
- 未理解需求显式展示；
- 中间需求区；
- 本地 requirement repository。

#### 建议产出

```text
src/workbench-agent-requirements/domain/agent-intent.ts
src/workbench-agent-requirements/domain/requirements.ts
src/workbench-agent-requirements/parser/requirement-parser.ts
src/workbench-agent-requirements/repository/memory-requirement-repository.ts
src/workbench-agent-requirements/api/requirement-routes.ts
src/workbench-agent-requirements/ui/requirement-panel.tsx
src/workbench-agent-requirements/fixtures/requirement-seed.ts
```

#### 可独立验收

B 不需要 A/C 完成，只要满足：

- 可以输入自然语言需求；
- 可以输出结构化 AgentIntent JSON；
- 可以解析排除食材、辣度上限、甜度上限、素食、偏好食材、不喜欢某道菜、饭量大小；
- 可以展示原话到结构化需求的映射；
- 可以展示未理解文本；
- 可以撤销需求并保留历史；
- 可以区分硬需求和软需求；
- 页面中间需求区域可以独立展示。

#### 不依赖

- 不依赖菜单 UI；
- 不依赖菜单解析；
- 不依赖推荐算法；
- 不依赖方案解释；
- 不读取 A/C 的业务模块。

> B 只需要把成员当作 `memberId: string`，不需要知道 A 的 `Member` 完整结构。

---

### 3.3 C：方案计算与解释工作台

#### 负责范围

- Epic 4：生成方案；
- Epic 5：解释方案；
- Epic 6：调整方案；
- 推荐算法；
- 冲突检测；
- 解释生成；
- 方案差异；
- 右侧方案区；
- 本地 planning fixture。

#### 建议产出

```text
src/workbench-plan/domain/plan.ts
src/workbench-plan/domain/planning-context.ts
src/workbench-plan/service/generate-plan.ts
src/workbench-plan/service/explain-plan.ts
src/workbench-plan/service/revise-plan.ts
src/workbench-plan/service/diff-plan.ts
src/workbench-plan/api/plan-routes.ts
src/workbench-plan/ui/plan-panel.tsx
src/workbench-plan/fixtures/planning-seed.ts
```

#### 可独立验收

C 不需要 A/B 完成，只要满足：

- 可以使用本地 planning fixture 生成方案；
- 所有菜品必须来自 fixture 中的菜单；
- 不得违反 fixture 中的硬需求；
- 不超预算；
- 每人至少有一份能吃；
- 可以生成每道菜的选择理由；
- 可以生成需求满足状态；
- 可以生成预算说明；
- 可以生成冲突说明；
- 可以生成方案调整 diff；
- 页面右侧方案区域可以独立展示。

#### 不依赖

- 不依赖 A 的菜单模块实现；
- 不依赖 A 的 session 模块实现；
- 不依赖 B 的 parser 实现；
- 不读取 A/B 的业务模块。

> C 只依赖自己工作包内的 `PlanningContext` fixture。后续接入真实 A/B 状态时，只通过 JSON snapshot adapter 映射，不改变推荐核心逻辑。

---

## 4. 并行契约：只约定 JSON snapshot，不共享运行时模块

为了避免 A/B/C 互相等待，本方案只约定 **JSON snapshot 格式**，不要求三人共享运行时类型或模块。

### 4.1 A 输出的菜单 snapshot

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
  ]
}
```

### 4.2 A 输出的组局 snapshot

```json
{
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

### 4.3 B 输出的需求 snapshot

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

### 4.4 C 使用的 planning context snapshot

```json
{
  "context": {
    "menu": [],
    "session": {},
    "requirementsByMember": {},
    "strategy": "balanced"
  }
}
```

> C 在本地 fixture 中自己维护 `menu`、`session`、`requirementsByMember`。最终集成时，由页面 wiring 将 A/B 的 snapshot 填入 C 的 adapter。

### 4.5 C 输出的 Plan snapshot

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

## 5. A 工作包详细设计：菜单与组局

### 5.1 功能范围

- 粘贴文本菜单；
- 解析菜名、价格；
- 自动推断品类、辣度、食材、是否素食、建议份数；
- 人工编辑菜单字段；
- 显示低置信度字段；
- 手动添加/删除菜品；
- 设置总预算；
- 设置用餐人数；
- 添加成员；
- 支持打包人员；
- 支持满减或套餐价。

### 5.2 A 的局部类型

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

```ts
type MealSession = {
  id: string
  budget: number
  memberCount: number
  members: Member[]
  promotions: Promotion[]
}
```

### 5.3 A 的接口

```ts
parseTextMenu(text: string): ParsedMenuResult
upsertMenuItem(input: MenuItemInput): MenuItem
deleteMenuItem(id: string): void
confirmMenuItemField(id: string, field: keyof MenuItem): void

createMealSession(input: MealSessionInput): MealSession
updateBudget(sessionId: string, budget: number): MealSession
updateMemberCount(sessionId: string, memberCount: number): MealSession
addMember(sessionId: string, input: MemberInput): Member
setPromotion(sessionId: string, promotion: Promotion): MealSession
exportMenuSessionSnapshot(): MenuSessionSnapshot
```

### 5.4 A 的低耦合要点

A 只维护“菜单是什么、这桌有多少人、预算是多少”。A 不判断方案是否合理，不调用推荐服务，不解析自然语言需求。

---

## 6. B 工作包详细设计：Agent 需求理解

### 6.1 功能范围

- 成员用自然语言说需求；
- Agent 解析成结构化需求；
- 展示原话到约束的映射；
- 展示未理解部分；
- 支持追加、撤销、覆盖；
- 区分硬需求和软需求。

### 6.2 Agent 输出示例

```json
{
  "action": "add_requirement",
  "memberId": "member_a",
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

### 6.3 B 的需求类型

```ts
type Requirement =
  | { type: "exclude_ingredient"; value: string; hardness: "hard" | "soft" }
  | { type: "spiciness_upper_bound"; value: "无辣" | "微辣" | "中辣" | "重辣"; hardness: "hard" | "soft" }
  | { type: "sweetness_upper_bound"; value: string; hardness: "hard" | "soft" }
  | { type: "vegetarian"; value: true; hardness: "hard" | "soft" }
  | { type: "prefer_ingredient"; value: string; hardness: "soft" }
  | { type: "dislike_dish"; value: string; hardness: "soft" }
  | { type: "appetite"; value: "small" | "normal" | "large" }
```

### 6.4 B 的接口

```ts
parseRequirementText(input: RequirementInput): RequirementParseResult
addRequirement(input: RequirementInput): Requirement[]
revokeRequirement(requirementId: string): Requirement[]
overrideRequirement(input: OverrideRequirementInput): Requirement[]
exportRequirementsSnapshot(): RequirementsSnapshot
```

### 6.5 B 的低耦合要点

B 只维护“用户说了什么、系统理解成什么、哪些没理解、哪些被撤销”。B 不负责菜单识别，不负责推荐，不负责方案解释。

---

## 7. C 工作包详细设计：方案计算与解释

### 7.1 功能范围

- 基于菜单、成员、需求、预算生成方案；
- 所有菜品必须来自当前菜单；
- 不得违反硬需求；
- 每人至少有一份能吃；
- 不超预算；
- 菜品搭配尽量均衡；
- 支持多人份共享菜；
- 每道菜为什么被选中；
- 哪些菜为什么被排除；
- 每个成员需求是否满足；
- 预算使用情况；
- 无法两全时明确说明冲突；
- 需求变化后重算；
- 菜单变化后重算；
- 预算或人数变化后重算；
- 展示新增、移除、份数变化；
- 支持手动移除某道菜并补菜；
- 支持锁定某道菜。

### 7.2 C 的输入输出

```ts
generatePlan(input: GeneratePlanInput): PlanResult
explainPlan(input: ExplainPlanInput): PlanExplanation
revisePlan(input: RevisePlanInput): RevisionResult
```

```ts
type GeneratePlanInput = {
  context: PlanningContext
  strategy?: "balanced" | "cheap" | "coverage"
}
```

```ts
type PlanResult =
  | { ok: true; plan: Plan }
  | { ok: false; conflicts: Conflict[]; suggestions: string[] }
```

### 7.3 推荐优先级

建议按以下顺序判断：

```text
1. 硬需求过滤
2. 预算过滤
3. 分类均衡
4. 软需求加分
5. 预算利用
6. 多样性
```

### 7.4 解释结构

```ts
type PlanExplanation = {
  selectedReasons: SelectedReason[]
  memberRequirementStatus: MemberRequirementStatus[]
  excludedItems: ExcludedItemReason[]
  budget: BudgetExplanation
  conflicts: Conflict[]
}
```

### 7.5 差异结构

```ts
type PlanDiff = {
  addedItems: PlanItem[]
  removedItems: PlanItem[]
  changedItems: PlanItemChange[]
  summary: string
}
```

### 7.6 C 的低耦合要点

C 只接收 `PlanningContext` 或本地 fixture，不读取 A/B 的实现。C 的核心推荐、解释、diff 逻辑都保持纯函数，便于独立测试。

---

## 8. API 设计

建议 Route Handlers 按工作包拆分：

### 8.1 A：菜单与组局 API

```text
POST /api/menu/parse
POST /api/menu/items
PATCH /api/menu/items/:id
DELETE /api/menu/items/:id
GET /api/menu-session/snapshot
```

### 8.2 B：需求 API

```text
POST /api/agent/parse
POST /api/requirements
PATCH /api/requirements/:id
DELETE /api/requirements/:id
GET /api/requirements/snapshot
```

### 8.3 C：方案 API

```text
POST /api/plans/generate
GET /api/plans/:id
POST /api/plans/:id/explain
POST /api/plans/:id/revise
POST /api/plans/:id/diff
```

所有外部输入必须用 `zod` 校验。

---

## 9. 前端页面结构

建议一个主页面即可，但三个区域由 A/B/C 分别实现：

```text
/
  左侧：A 菜单区
  中间：A 组局区 + B 需求区
  右侧：C 方案与解释区
```

### 9.1 左侧：菜单区（A）

- 粘贴菜单；
- 编辑菜品；
- 显示置信度；
- 删除/新增菜品。

### 9.2 中间：组局区（A）

- 设置预算、人数；
- 添加成员；
- 标记打包人员；
- 设置满减或套餐价。

### 9.3 中间：需求区（B）

- 输入自然语言需求；
- 展示结构化需求；
- 展示未理解文本；
- 撤销需求；
- 显示硬/软需求区分。

### 9.4 右侧：方案区（C）

- 生成方案；
- 展示菜品、份数、总价；
- 展示预算进度；
- 展示解释；
- 展示调整差异。

---

## 10. 并行开发边界

### 10.1 A 可以独立做

- 菜单录入；
- 菜单编辑；
- 菜单置信度；
- 组局配置；
- 成员管理；
- 预算、人数、优惠；
- 左侧和中间组局 UI；
- 菜单/session snapshot 导出。

A 不需要等 B/C。

### 10.2 B 可以独立做

- AgentIntent schema；
- 需求解析；
- 需求存储；
- 原话映射；
- 未理解项展示；
- 撤销/覆盖逻辑；
- 需求区 UI；
- requirement snapshot 导出。

B 不需要等 A/C。

### 10.3 C 可以独立做

- 推荐算法；
- 冲突检测；
- 解释生成；
- 方案差异；
- 调整方案；
- 右侧方案 UI；
- planning fixture；
- plan snapshot 输出。

C 不需要等 A/B。

---

## 11. 并行开发顺序

### 11.1 第一天：三条线同时开工

A 做：

1. menu seed；
2. session seed；
3. 菜单编辑 UI；
4. 组局 UI；
5. snapshot 导出。

B 做：

1. AgentIntent schema；
2. requirement seed；
3. 需求输入 UI；
4. 原话映射 UI；
5. snapshot 导出。

C 做：

1. planning seed；
2. generatePlan 纯函数；
3. plan UI；
4. explainPlan 纯函数；
5. plan snapshot 输出。

### 11.2 第二天：各自补齐核心验收

A 补齐：

- 文本菜单解析；
- 低置信度提示；
- 人工确认字段；
- 预算和人数校验。

B 补齐：

- 多句需求解析；
- 未理解文本；
- 撤销需求；
- 硬软需求视觉区分。

C 补齐：

- 硬需求过滤；
- 预算过滤；
- 分类均衡；
- 冲突说明；
- 方案 diff。

### 11.3 最后集成：只做 wiring，不改核心逻辑

最后只需要把三个 snapshot 接到主页面：

```text
A snapshot: menu + session
B snapshot: requirementsByMember
C adapter: menu + session + requirementsByMember -> PlanningContext
C output: plan + explanation + diff
```

> 集成工作不要求 A/B/C 互相改业务模块，只负责把 JSON 数据串起来。

---

## 12. 最小可演示路径

Demo 可以固定为：

1. A 粘贴菜单；
2. A 设置预算 250、4 人；
3. A 添加成员 A/B/C/D；
4. B 输入 A 的需求：“不吃猪肉”；
5. B 输入 B 的需求：“花生过敏”；
6. B 输入 C 的需求：“想吃辣一点”；
7. B 展示结构化需求；
8. C 生成方案；
9. C 展示解释；
10. B 让 B 改口：“花生可以吃一点”；
11. C 重算并展示差异；
12. C 手动移除一道菜，系统补菜；
13. C 展示预算使用率。

---

## 13. 每个工作包的 Definition of Done

### 13.1 A 的 DoD

- 菜单 seed 可展示；
- 文本菜单可解析；
- 菜品字段可编辑；
- 低置信度字段可提示；
- 预算、人数、成员可配置；
- 菜单/session snapshot 可导出；
- A 相关测试通过；
- A 不 import B/C 业务模块。

### 13.2 B 的 DoD

- AgentIntent schema 已定义；
- 自然语言需求可解析；
- 原话到需求映射可展示；
- 未理解文本可展示；
- 撤销需求可保留历史；
- 硬软需求可区分；
- requirement snapshot 可导出；
- B 相关测试通过；
- B 不 import A/C 业务模块。

### 13.3 C 的 DoD

- planning seed 可生成方案；
- 不违反硬需求；
- 不超预算；
- 每人至少有一份能吃；
- 可生成选择理由；
- 可生成需求满足状态；
- 可生成冲突说明；
- 可生成方案 diff；
- C 相关测试通过；
- C 不 import A/B 业务模块。

---

## 14. 风险与取舍

### 14.1 风险：snapshot 字段漂移

建议：

- 每个工作包都维护 fixture；
- 每个工作包都导出 snapshot；
- 最后集成时只做字段映射；
- 不要求 A/B/C 在开发过程中共享运行时类型。

### 14.2 风险：Agent 解析不稳定

建议：

- 使用固定 schema；
- 对无法解析的部分显式返回 unresolvedTexts；
- 不做过度自由发挥；
- B 可以独立用 fixture 演示解析结果。

### 14.3 风险：推荐算法复杂

建议：

- V1 用贪心 + 规则过滤；
- 不追求全局最优；
- 重点是可解释、不违反硬约束、不超预算；
- C 可以独立用 planning fixture 演示推荐结果。

### 14.4 风险：多人并行冲突

建议：

- 明确禁止跨工作包 import；
- 每人只改自己的工作包；
- 最后只做页面 wiring；
- 不提前重构公共模块。

---

## 15. 最终建议

如果 3 个人要零依赖并行，建议采用：

```text
A：菜单 + 组局工作台
B：Agent + 需求工作台
C：方案 + 解释 + 调整工作台
```

并且每个人各自维护：

```text
domain
repository
api
ui
fixtures
tests
snapshot
```

最终通过 JSON snapshot 集成：

```text
A snapshot: menu + session
B snapshot: requirementsByMember
C adapter: PlanningContext
C output: plan + explanation + diff
```

这样 A/B/C 可以当天同时开工，不需要等待公共类型、公共服务或公共页面完成，也最符合 PRD 对 Agent 边界的要求。
