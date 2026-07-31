# 开发宪法：North Food

> 本文档是本项目研发阶段的最高开发规则。所有 RFC、PR、代码和 Demo 都必须遵守本文档；如需修改，必须通过团队共识并更新本文档。

## 1. 项目目标

本项目参加 North Hackathon Topic B：**North Food（Agent 驱动点餐系统）**。

最终交付必须满足：

1. 本地可运行；
2. 支持 Vercel 分支预览部署；
3. Agent 真正参与点餐、推荐、订单修改/取消等核心业务流程；
4. 用户输入自然语言后，系统能解析意图、校验规则并改变订单/库存状态；
5. 代码质量、提交历史、RFC、README 和 Demo 都可用于现场评分。

## 2. 技术栈宪法

### 2.1 默认主语言：TypeScript

本项目默认使用 **TypeScript** 作为主要研发语言。

要求：

- 业务代码必须使用 `.ts` / `.tsx`；
- 前端页面使用 React + TypeScript；
- 后端 API 优先使用 Next.js API Routes / Server Actions + TypeScript；
- 所有 npm script 必须可被 TypeScript 项目完整支持；
- 禁止使用手写 JavaScript 文件。

禁止：

- `.js`
- `.jsx`
- `.mjs`
- `.cjs`
- `scripts/*.js`
- `*.py`

例外：

- 第三方依赖生成的文件可以存在，但不得手写；
- 如果确实需要脚本，必须使用 TypeScript，通过 `tsx`、`ts-node` 或 Vite/Next.js 的 TS 工具链执行；
- 例外必须经过团队确认，并在 PR 描述中说明原因。

### 2.2 Rust 使用原则

Rust 可以作为高性能、高可靠性模块的补充语言，但不得增加不必要的部署复杂度。

允许使用 Rust 的场景：

1. 核心规则库，例如订单校验、库存算法、推荐评分；
2. 需要强类型、高可靠性的计算模块；
3. 可被 TypeScript 稳定调用，例如 WASM 或独立 CLI。

Rust 代码必须满足：

- `cargo fmt` 通过；
- `cargo clippy -- -D warnings` 通过；
- `cargo test` 通过；
- 不得破坏 Vercel 分支预览部署；
- 不得引入需要现场临时安装复杂系统依赖的流程。

如果 Rust 会影响 Vercel 部署稳定性，默认选择 TypeScript 实现。

### 2.3 明确禁止 Python

本项目不允许使用 Python 作为研发语言。

禁止：

- Python 后端；
- Python 脚本；
- Python 数据处理脚本；
- Python 测试脚本；
- Python 生成 Demo 数据。

如需生成 Demo 数据，使用 TypeScript 脚本或静态 JSON/TS 数据文件。

## 3. 推荐项目结构

建议采用 Next.js + TypeScript 一体项目：

```text
.
├── app/                         # Next.js App Router 页面
├── components/                  # React 组件
├── lib/                         # 纯业务逻辑、状态模型、规则函数
├── server/                      # 服务端 API、订单服务、菜单服务
├── agent/                       # Agent prompt、意图识别、推荐策略
├── data/                        # Demo 初始化数据
├── docs/                        # RFC、开发宪法、说明文档
├── tests/                       # 测试
├── public/                      # 静态资源
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
└── vercel.json
```

## 4. TypeScript 严格模式

`tsconfig.json` 必须开启严格模式，至少包含：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "useUnknownInCatchVariables": true
  }
}
```

要求：

- 不允许 `any` 绕过类型检查；
- 不允许用 `as any` 掩盖真实类型问题；
- 接口、状态、Agent 输出必须显式建模；
- 外部输入必须校验后再进入业务逻辑；
- 推荐使用 `zod` 做运行时校验。

## 5. Agent 边界

Agent 负责理解自然语言和生成回复，但不得直接绕过业务规则修改系统状态。

标准流程：

1. 用户输入自然语言；
2. Agent 返回结构化意图 JSON；
3. 后端使用 TypeScript 类型和 `zod` 校验 JSON；
4. 业务服务执行库存、预算、过敏原、订单状态等规则；
5. 系统更新状态；
6. Agent 或前端根据结果生成用户可读回复。

禁止：

- Agent 直接写数据库；
- Agent 直接扣库存；
- Agent 直接跳过确认步骤生成订单；
- Agent 输出未校验 JSON 后直接信任；
- 用自然语言字符串作为唯一业务事实来源。

## 6. 分支模型

### 6.1 分支命名

统一使用英文小写和短横线：

```text
main
dev
feature/topic-b-ordering-agent
feature/menu-management
feature/order-flow
feature/agent-intent
feature/vercel-preview
hotfix/fix-order-stock
release/submission
```

禁止：

- `test`
- `aaa`
- `my-branch`
- 中文分支名
- 带日期但无语义的分支名

### 6.2 主分支规则

- `main`：正式提交版本；
- `dev`：集成开发分支；
- 功能分支从 `dev` 切出；
- 功能分支合并回 `dev`；
- 提交截止前由 `dev` 合并到 `main`；
- 禁止直接 push 到 `main`。

## 7. Commit 规范

所有 commit 必须使用 Conventional Commits。

格式：

```text
<type>(<scope>): <description>
```

示例：

```text
feat(order): add order cancellation flow
feat(agent): parse recommendation intent
fix(stock): restore inventory after cancel
docs(readme): add local startup guide
chore(vercel): add preview deployment config
```

`type` 只能使用：

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `ci`

要求：

- commit message 必须说明做了什么；
- 不要提交无意义消息，例如 `update`、`fix bug`、`work in progress`；
- 三名成员都必须有可识别的真实贡献；
- 不建议大量 squash 到一个人名下。

## 8. PR 规范

每个 PR 必须满足：

1. 标题清晰；
2. 描述中说明解决的问题；
3. 说明测试方式；
4. 附上 Vercel Preview URL；
5. 关联 RFC 或任务；
6. 不包含无关改动；
7. 通过 CI 检查；
8. 至少一名队友 Review 后合并。

PR 模板：

```md
## 本次改动

## 涉及模块

## 验证方式

## Vercel Preview

## 风险与注意事项
```

## 9. Code Review 规则

Review 时重点检查：

- 是否违反 TypeScript 严格模式；
- 是否有 `any`、`as any`、未处理 `undefined`；
- 是否绕过库存/订单状态校验；
- Agent 输出是否经过结构化校验；
- 是否引入 `.js` 或 `.py`；
- 是否破坏 Vercel 预览部署；
- 是否有 README 或 Demo 数据更新；
- 是否能被现场稳定演示。

Review 结论必须明确：

- `LGTM`
- `Request Changes`
- `Comment`

不能只发表情或“可以”。

## 10. CI 与质量门禁

每次 PR 必须运行：

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

如果使用 Rust，还必须运行：

```bash
cargo fmt --check
cargo clippy -- -D warnings
cargo test
```

CI 必须检查禁止文件：

```bash
find . \
  -path './node_modules' -prune -o \
  -path './.next' -prune -o \
  -path './target' -prune -o \
  -type f \( -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.py' \) \
  -print -quit | grep .
```

如果命令输出任何文件，CI 应失败。

## 11. Vercel 分支预览部署

本项目必须支持 Vercel branch preview deployment。

要求：

1. GitHub 仓库连接 Vercel；
2. 每个 PR 自动创建 Vercel Preview URL；
3. `dev` 分支可部署为 staging 环境；
4. `main` 分支部署为 production 环境；
5. README 中必须记录如何查看当前 PR 的 Preview URL；
6. Demo 前必须确认最新 Preview URL 可打开；
7. 环境变量只允许放在 Vercel，不允许提交真实密钥。

推荐 Vercel 配置：

```json
{
  "installCommand": "pnpm install",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "framework": "nextjs"
}
```

## 12. 环境变量与密钥

允许提交：

- `.env.example`
- 环境变量名称说明
- 本地开发默认值

禁止提交：

- API Key；
- Token；
- Cookie；
- 真实数据库密码；
- 任何生产环境密钥。

本地开发必须从 `.env.local` 读取配置，且 `.env.local` 必须加入 `.gitignore`。

## 13. 数据与 Demo

Demo 数据必须随仓库提交。

要求：

1. 菜单数据可本地生成或直接提交；
2. 菜单图片如果存在，必须提交到 `public/` 或 README 中说明生成方式；
3. 至少包含以下场景数据：
   - 普通点餐；
   - 预算 + 人数 + 忌口推荐；
   - 库存不足；
   - 过敏原冲突；
   - 修改订单；
   - 取消订单并恢复库存。

禁止现场手写 Demo 数据。

## 14. Definition of Done

一个功能只有满足以下条件才算完成：

- 类型检查通过；
- lint 通过；
- 单元测试或集成测试通过；
- Vercel Preview 可访问；
- 前端可真实操作；
- 后端状态真实变化；
- Agent 输出经过校验；
- README 或 Demo 脚本已更新；
- 没有 `.js` / `.py` 文件；
- 至少一名队友 Review 通过。

## 15. 现场提交冻结规则

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

## 16. 最低验收清单

提交前必须确认：

- [ ] 已选择 Topic B：North Food（Agent 驱动点餐系统）；
- [ ] 仓库为 Public；
- [ ] `docs/development-constitution.md` 已提交；
- [ ] `docs/rfcs/` 下至少有一份 RFC；
- [ ] 三名成员都有可识别 Git 贡献；
- [ ] README 包含完整启动步骤；
- [ ] `pnpm install` 可执行；
- [ ] `pnpm dev` 可启动；
- [ ] `pnpm typecheck` 通过；
- [ ] `pnpm lint` 通过；
- [ ] `pnpm test` 通过；
- [ ] `pnpm build` 通过；
- [ ] Vercel Preview 可打开；
- [ ] 基础点餐流程可通过真实前端完成；
- [ ] Agent 推荐/解析流程可演示；
- [ ] 订单修改/取消可演示；
- [ ] 本地仓库 clean；
- [ ] 已推送 `submission` tag。
