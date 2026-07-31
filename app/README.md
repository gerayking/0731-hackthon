This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the page.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## M1 Route Handlers API

T3 已实现 RFC-0006 要求的 M1 菜单与组局 Route Handlers。启动开发服务器后，可用以下命令验证基础 CRUD：

```bash
# 创建菜单项
curl -sS http://localhost:3000/api/menu/items \
  -H 'content-type: application/json' \
  -d '{"name":"测试菜","price":10}'

# 查看菜单项列表
curl -sS http://localhost:3000/api/menu/items

# 查看菜单与组局快照
curl -sS http://localhost:3000/api/menu-session/snapshot
```

所有写入接口都会通过 zod schema 校验；无效输入返回 `400` 和统一结构化错误 JSON：`{ ok: false, error: { code, message, issues } }`。

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
