# AGENTS.md

这是 North Hackathon Topic B「Agent 驱动点餐系统」的仓库级 Agent 指令。所有参与本项目的 AI Agent 都必须遵守。

## 1. 最高目标

本项目参加 North Hackathon Topic B：**点餐系统**。

最终交付必须是一个可本地运行、可 Vercel 分支预览部署、Agent 真正参与核心业务流程的 TypeScript/Rust 项目。

Agent 的核心职责是：

1. 理解用户自然语言；
2. 输出结构化意图；
3. 协助推荐、解析、解释；
4. 不得绕过后端业务规则直接修改订单或库存。

## 2. 语言宪法

### 2.1 默认研发语言

默认使用 **TypeScript**。

必须遵守：

- 业务代码使用 `.ts` / `.tsx`；
- 前端使用 React + TypeScript；
- 后端优先使用 Next.js App Router / API Routes / Server Actions + TypeScript；
- 所有脚本必须使用 TypeScript；
- 不允许手写 JavaScript 文件。

### 2.2 禁止语言

本项目禁止使用：

- Python；
- JavaScript；
- `.js`；
- `.jsx`；
- `.mjs`；
- `.cjs`；
- `.py`。

禁止内容包括：

- Python 后端；
- Python 脚本；
- JavaScript 脚本；
- JS 生成数据脚本；
- JS 测试脚本。

如需要脚本，必须使用 TypeScript，并通过 `tsx`、`ts-node`、Next.js 或 Vite 的 TypeScript 工具链执行。

### 2.3 Rust 使用规则

Rust 可以使用，但只在以下场景使用：

- 高可靠规则库；
- 推荐评分算法；
- 库存/订单校验核心逻辑；
- 需要强类型保证的计算模块。

Rust 代码必须满足：

- `cargo fmt --check` 通过；
- `cargo clippy -- -D warnings` 通过；
- `cargo test` 通过；
- 不得破坏 Vercel 预览部署；
- 不得引入现场难以复现的系统依赖。

如果 Rust 会影响部署稳定性，优先使用 TypeScript 实现。

## 3. Agent 行为边界

Agent 不得直接修改系统状态。

标准流程必须是：

1. 用户输入自然语言；
2. Agent 输出结构化意图 JSON；
3. 后端用 TypeScript 类型和 `zod` 校验 Agent 输出；
4. 后端服务执行库存、预算、过敏原、订单状态等规则；
5. 后端更新订单和库存；
6. Agent 或前端基于结果生成用户可读回复。

禁止 Agent：

- 直接写数据库；
- 直接扣库存；
- 直接恢复库存；
- 直接创建/修改/取消订单；
- 跳过业务校验；
- 把自然语言字符串当作唯一事实来源。

## 4. 推荐技术栈

优先使用：

- Next.js App Router；
- React + TypeScript；
- Server Actions 或 Route Handlers；
- SQLite / Prisma / Drizzle，或简单 TypeScript 状态层；
- `zod` 做运行时校验；
- Vitest 做测试；
- ESLint + TypeScript strict mode；
- Vercel 分支预览部署。

不要为了速度使用纯静态页面。基础功能必须通过真实前端操作完成。

## 5. 严格 TypeScript 规则

`tsconfig.json` 必须开启严格模式。

最低要求：

- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `exactOptionalPropertyTypes: true`
- `noUncheckedIndexedAccess: true`
- `noFallthroughCasesInSwitch: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `useUnknownInCatchVariables: true`

禁止：

- `any`；
- `as any`；
- 未处理 `undefined`；
- 外部输入不校验；
- 隐式业务状态；
- 没有类型定义的 Agent 输出。

推荐所有 Agent 输出、订单、菜单、库存、规则都显式建模。

## 6. 核心业务模型

Agent 必须理解并维护以下概念：

- `MenuItem`：菜品；
- `Order`：订单；
- `OrderItem`：订单项；
- `AgentIntent`：Agent 意图；
- `Inventory`：库存；
- `Allergen`：过敏原；
- `Recommendation`：推荐结果。

核心意图至少包括：

- `list_menu`：查看菜单；
- `recommend`：按人数、预算、忌口推荐；
- `add_items`：加入购物车或生成待确认订单；
- `confirm_order`：确认订单；
- `cancel_order`：取消订单；
- `modify_order`：修改订单；
- `update_menu`：管理员更新菜单；
- `check_availability`：检查库存/可用性。

## 7. 必须完成的业务闭环

本项目必须能演示以下流程：

1. 用户查看菜单；
2. 用户用自然语言点餐；
3. Agent 解析菜品、数量、备注、忌口、预算；
4. 后端校验库存、过敏原、预算；
5. 用户确认订单；
6. 系统生成订单并扣减库存；
7. 用户修改订单；
8. 用户取消订单；
9. 取消订单后库存恢复；
10. 用户用预算 + 人数 + 忌口获得推荐。

## 8. 分支规则

当前仓库只维护一个长期分支：`main`。

分支命名必须使用英文小写和短横线。

推荐分支：

```text
main
feature/topic-b-ordering-agent
feature/menu-management
feature/order-flow
feature/agent-intent
feature/vercel-preview
hotfix/fix-order-stock
release/submission
```

规则：

- `main`：唯一长期分支和最终交付分支；
- 所有功能开发必须从 `main` 切出功能分支；
- 功能分支通过 PR 合并回 `main`；
- 禁止直接 push 到 `main`；
- 禁止在本地 `git merge` 后直接 push 到 `main`；
- 截止前由 `release/submission` 或最终功能分支通过 PR 合并到 `main`；
- 最终提交必须打 `submission` tag。

## 9. Commit 规则

所有 commit 使用 Conventional Commits。

格式：

```text
<type>(<scope>): <description>
```

可用类型：

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `ci`

示例：

```text
feat(order): add order cancellation flow
feat(agent): parse recommendation intent
fix(stock): restore inventory after cancel
docs(readme): add local startup guide
chore(vercel): add preview deployment config
```

禁止提交：

- `update`
- `fix bug`
- `work in progress`
- 无意义提交

三名成员都必须有可识别的真实 Git 贡献。

## 10. PR 规则

本项目采用 **PR-only merge** 流程：**任何代码合入 `main` 都必须通过 Pull Request 完成，禁止绕过 PR 直接 push 到 `main`。**

每个 PR 必须包含：

- 清晰标题；
- 改动说明；
- 涉及模块；
- 验证方式；
- Vercel Preview URL；
- 关联 RFC 或任务；
- 至少一名队友 Review。

PR 不得包含无关改动。

合并规则：

- 功能分支必须通过 PR 合并回 `main`；
- 截止前由 `release/submission` 或最终功能分支通过 PR 合并到 `main`；
- 禁止直接 push 到 `main`；
- 禁止在本地 `git merge` 后直接 push 到 `main`；
- PR 必须至少一名队友 Review 后才能合并；
- CI 未通过的 PR 不得合并。

## 11. CI 与质量门禁

每个 PR 必须通过：

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

如果使用 Rust，还必须通过：

```bash
cargo fmt --check
cargo clippy -- -D warnings
cargo test
```

CI 必须检查禁止文件：

- `.js`
- `.jsx`
- `.mjs`
- `.cjs`
- `.py`

第三方依赖生成文件除外，但手写文件禁止。

## 12. Vercel 分支预览部署

项目必须支持 Vercel branch preview deployment。

要求：

1. GitHub 仓库连接 Vercel；
2. 每个 PR 自动生成 Vercel Preview URL；
3. `main` 分支部署为 production；
4. 功能分支 PR 自动部署为 Preview；
5. README 必须说明如何查看 Preview URL；
6. Demo 前必须确认最新 Preview URL 可打开；
7. 真实密钥只允许放在 Vercel 环境变量中。

推荐 `vercel.json`：

```json
{
  "installCommand": "pnpm install",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "framework": "nextjs"
}
```

## 13. 环境变量规则

允许提交：

- `.env.example`
- 环境变量名称说明
- 本地开发默认值

禁止提交：

- API Key；
- Token；
- Cookie；
- 数据库密码；
- 任何生产环境密钥。

`.env.local` 必须加入 `.gitignore`。

## 14. 文档规则

必须维护：

- `README.md`：本地启动、Vercel 部署、Demo 脚本；
- `docs/rfcs/`：至少一份 RFC；
- `docs/development-constitution.md`：团队开发宪法，可选保留；
- `AGENTS.md`：本文件，Agent 行为宪法；
- `CLAUDE.md`：可保留，用于兼容 Claude 读取。

文档必须用简体中文，除非是代码、路径、命令、API 名称。

## 15. Demo 规则

Demo 必须固定脚本，禁止临场发挥。

建议演示：

1. 查看菜单；
2. 自然语言点餐；
3. 预算 + 人数 + 忌口推荐；
4. 库存不足并推荐替代；
5. 确认下单；
6. 修改订单；
7. 取消订单并恢复库存；
8. 展示 Vercel Preview。

## 16. Definition of Done

一个功能只有满足以下条件才算完成：

- 类型检查通过；
- lint 通过；
- 测试通过；
- build 通过；
- Vercel Preview 可访问；
- 前端可真实操作；
- 后端状态真实变化；
- Agent 输出经过校验；
- README 或 Demo 脚本已更新；
- 没有 `.js` / `.py` 手写文件；
- 至少一名队友 Review 通过。

## 17. 提交冻结规则

截止前 30 分钟进入冻结期。

冻结期只做：

- 修复阻塞 Demo 的 bug；
- 更新 README；
- 补充测试；
- 打 `submission` tag；
- 清理未跟踪文件。

冻结期禁止：

- 重构核心架构；
- 新增大功能；
- 更换技术栈；
- 引入新依赖；
- 修改数据库方案；
- 临时写 Python/JS 脚本。

## 18. Agent 修改代码前必须检查

每次修改代码前，Agent 必须先确认：

1. 当前请求属于哪个功能；
2. 是否已有 RFC 或任务说明；
3. 是否会影响订单、库存、Agent 边界；
4. 是否需要新增/修改测试；
5. 是否需要更新 README；
6. 是否会生成 `.js` 或 `.py` 文件；
7. 是否破坏 Vercel Preview；
8. 是否需要提醒用户 Review。

如果信息不足，先提问，不要擅自假设。
