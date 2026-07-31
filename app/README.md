# 点餐系统 App

本目录是点餐系统的 Next.js + TypeScript 前端应用。当前 RFC-0001「用户系统」正在按子任务推进，T2 已提供本地 SQLite 持久化与迁移能力。

## 本地启动

```bash
pnpm install
pnpm migrate:user-system
pnpm dev
```

启动后访问：

- 本地开发：<http://localhost:3000>

## 用户系统 SQLite 持久化

用户系统使用 SQLite 保存 Demo 所需的数据结构，当前 T2 初始化以下表：

- `users`：用户主体、角色、昵称、忌口、预算提示、备注与时间戳；
- `demo_user_sessions`：Demo 身份切换会话；
- `schema_migrations`：迁移记录。

迁移脚本位于 `app/scripts/migrate-user-system.ts`，通过 TypeScript 运行，不生成 `.js` 或 `.py` 文件。

```bash
pnpm migrate:user-system
```

默认数据库文件：

```text
app/.data/user-system.sqlite
```

如需覆盖数据库路径，可设置环境变量：

```bash
USER_SYSTEM_DB_PATH=/tmp/demo-user-system.sqlite pnpm migrate:user-system
```

`.data/` 已加入 `.gitignore`，本地 Demo 数据不会被提交。

## 常用命令

```bash
pnpm dev
pnpm build
pnpm lint
pnpm exec tsc --noEmit
pnpm migrate:user-system
```

## Vercel 分支预览

项目可部署到 Vercel。连接 GitHub 仓库后，每个功能分支的 Pull Request 会生成 Preview URL。PR 页面应记录最新 Preview URL，并在 Demo 前确认可访问。

生产密钥只允许放在 Vercel 环境变量中，不提交到仓库。
