# app

本目录是 Next.js + TypeScript 点餐系统前端/服务端应用。

## 本地启动

```bash
pnpm install
pnpm dev
```

启动后打开 <http://localhost:3000>。

## M3 方案生成与解释模块

M3 负责把 `PlanningInputSnapshot` 转换成可解释、可调整的点餐方案。第一版采用 TypeScript 规则优先，NAC 只预留 adapter 接口，不直接生成最终业务状态。

### 功能入口

- M3 Demo 页面：<http://localhost:3000/plans>
- 生成方案：`POST /api/plans/generate`
- 解释方案：`POST /api/plans/explain`
- 调整方案：`POST /api/plans/revise`

### API 示例

#### 生成方案

```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
  "menu": [
    {
      "id": "dish_001",
      "name": "清炒时蔬饭",
      "price": 32,
      "category": "主食",
      "spiciness": "none",
      "ingredients": ["青菜", "米饭"],
      "containsPork": false,
      "containsBeef": false,
      "containsChicken": false,
      "containsSeafood": false,
      "containsPeanut": false,
      "containsEgg": false,
      "containsDairy": false,
      "isVegetarian": true,
      "suggestedServings": 1,
      "confidence": 0.95
    }
  ],
  "session": {
    "id": "session_demo",
    "budget": 100,
    "memberCount": 1,
    "members": [
      { "id": "member_a", "name": "A" }
    ],
    "promotions": []
  },
  "requirementsByMember": {
    "member_a": []
  },
  "strategy": "cheap"
}
JSON
```

#### 解释方案

```bash
curl -X POST http://localhost:3000/api/plans/explain \
  -H "Content-Type: application/json" \
  -d '{"snapshot": <上面 generate 的输入>, "plan": <返回的 plan>}'
```

#### 调整方案

```bash
curl -X POST http://localhost:3000/api/plans/revise \
  -H "Content-Type: application/json" \
  -d '{"previousPlan": <上一个 plan>, "currentContext": <PlanningInputSnapshot>, "requestedChanges": [{"type": "remove_item", "dishId": "dish_001"}]}'
```

## 验证

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

完整 PR 质量门禁：

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Vercel Preview

PR 合并到 GitHub 后，Vercel 会为功能分支生成 Preview URL。打开 PR 页面即可看到 `Vercel Preview URL`，Demo 时优先验证 `/plans` 页面和 `/api/plans/*` 接口。
