# NAC / NexAU 使用 Skill

> 适用对象：North Agent Cloud（NAC） / NexAU 平台使用者。  
> 目标：让团队在不破坏本项目 TypeScript、Vercel Preview 和 Agent 边界的前提下，安全、可复现地使用 NAC 能力。

## 1. 使用场景

当任务涉及以下内容时，优先使用本 skill：

- NAC 项目创建、部署、查看版本；
- NAC 环境管理，包括临时 lane；
- 项目级环境变量管理；
- LLM 配置切换；
- 查看日志、trace、Agent 状态；
- 本地开发调试；
- 冒烟测试、集成测试、压测；
- 飞书 bot / IM 通道绑定；
- 接入 North Agent Cloud 或 NexAU 能力。

## 2. 最高原则

### 2.1 不破坏 Vercel 预览部署

本项目必须支持 GitHub PR 的 Vercel Preview。

使用 NAC 时：

- 不得引入破坏 Vercel 构建或部署的依赖；
- 不得把 NAC CLI 作为 Next.js 生产构建必需依赖；
- 不得要求现场临时安装系统级依赖；
- 不得把生产密钥提交到仓库；
- 不得绕过 Agent 边界直接修改订单或库存。

### 2.2 不绕过 Agent 边界

NAC / NexAU 只能用于增强 Agent 能力，例如：

- 部署 Agent；
- 调试 Agent；
- 查看 Agent 日志和 trace；
- 运行 Agent 冒烟测试；
- 管理环境变量和 LLM 配置。

禁止：

- 让 NAC Agent 直接写订单数据库；
- 让 NAC Agent 直接扣减库存；
- 让 NAC Agent 直接恢复库存；
- 让 NAC Agent 跳过业务校验创建/修改/取消订单；
- 把 NAC Agent 的自然语言输出当作唯一业务事实来源。

标准流程仍是：

1. 用户输入自然语言；
2. Agent 输出结构化意图 JSON；
3. 后端用 TypeScript + `zod` 校验 JSON；
4. 后端服务执行库存、预算、过敏原、订单状态等规则；
5. 后端更新订单和库存；
6. Agent 或前端基于结果生成用户可读回复。

### 2.3 不提交真实密钥

允许提交：

- `.env.example`
- 环境变量名称说明
- 本地开发默认值

禁止提交：

- `NAC_TOKEN`
- `NAC_BASE_URL` 中的真实密钥信息
- `NAC_PROJECT_ID` 以外的真实密钥
- `LLM_API_KEY`
- `AK:SK`
- `nacp_xxx`
- `ak_xxx:sk_xxx`

真实密钥只能放在 NAC 平台、Vercel 或本地 `.env.local` 中。

## 3. CLI 前置检查

执行任何 `nac` 命令前，必须先检查 CLI 是否存在且版本满足要求。

最低版本：`0.4.1`。

推荐检查命令：

```bash
command -v nac && nac --version
```

如果缺失或版本过低，使用官方安装命令：

```bash
curl -fsSL https://nac.xiaobei.top/install.sh | sh
```

如果用户在 North Studio 中，也可以从：

```text
设置 -> CLI 管理
```

安装 NAC CLI。

不要假设 CLI 已经存在。

## 4. 认证规则

NAC 有两类 token，必须按用途选择，不能混用。

### 4.1 管理操作：PAT

用于：

- `nac projects`
- `nac versions`
- `nac environments`
- `nac vars`
- `nac llm`
- `nac logs`
- `nac traces`
- `nac deploy`
- `nac status`

登录方式：

```bash
nac auth login --pat nacp_xxx
```

登录后，后续管理命令通常不需要每次传 token。

### 4.2 Agent Gateway 操作：AK:SK

用于：

- `nac chat`
- `nac smoke`
- `nac test`
- `nac bench`

获取方式：

```bash
AKSK=$(nac keys create <project-id> --json | jq -r '.access_key + ":" + .secret_key')
```

调用方式：

```bash
NAC_TOKEN="$AKSK" nac chat staging -m "hello" --json
```

或：

```bash
nac chat staging --token "$AKSK" -m "hello" --json
```

### 4.3 常见错误

如果 Gateway 命令报 401：

- 可能用了 PAT；
- 需要改用 `nac keys create <project-id>` 生成的 `AK:SK`。

如果管理命令报 401：

- 可能用了 `AK:SK`；
- 需要改用 PAT，并执行 `nac auth login --pat ...`。

## 5. 命令分层

### 5.1 快捷命令

适合日常开发和调试：

```bash
nac status
nac deploy <env>
nac dev
nac smoke
nac chat <env> -m "..."
nac test <env>
nac bench <env>
nac logs
nac traces
nac clean
```

### 5.2 资源 CRUD

适合精细控制：

```bash
nac projects list --json
nac projects get <project-id> --json
nac projects create --name "My Agent" --json

nac versions list <project-id> --json
nac versions create <project-id> --tag v1.0 --json

nac environments list <project-id> --json
nac environments create <project-id> --name staging --json
nac environments create <project-id> --name lab --ttl 1h --json
nac environments extend <env-name> --ttl 2h --json

nac vars list <project-id> --json
nac vars set <project-id> KEY VALUE --json
nac vars set <project-id> SECRET_KEY "sk-..." --secret --json
nac vars delete <project-id> KEY --json
nac vars sync <project-id> .env.production --json

nac llm show <project-id> --json
nac llm list-available <project-id> --json
nac llm set <project-id> --config-id <uuid> --model <m> --json
```

### 5.3 Raw API

只有当快捷命令和资源 CRUD 都无法覆盖时使用：

```bash
nac api GET /api/projects --json
nac api POST /api/projects --body '{"name":"test"}' --json
nac api PUT /api/projects/<pid>/versions/<vid>/deploy --body '{"environment":"prod"}' --json
```

## 6. 输出规范

优先使用 `--json`：

```bash
nac projects list --json
nac environments list <project-id> --json
nac logs --json
```

原因：

- 结构化输出更容易检查；
- 适合自动化判断；
- 避免人工解析不稳定文本。

写操作建议先 dry run：

```bash
nac vars sync <project-id> .env --dry-run --json
```

## 7. 临时 Lane

临时 lane 适合 Demo、调试和 PR 验证。

创建临时环境：

```bash
nac environments create <project-id> --name pr-preview --ttl 7d --json
```

TTL 范围：

- 最小：`60s`
- 最大：`7d`

延长环境：

```bash
nac environments extend pr-preview --ttl 2h --json
```

清理环境：

```bash
nac clean
```

注意：

- 不要把临时 lane 当作长期生产环境；
- 不要把真实密钥写进仓库；
- 临时环境到期后应重新创建或清理。

## 8. 环境变量

项目级环境变量：

```bash
nac vars set <project-id> KEY VALUE --json
nac vars set <project-id> SECRET_KEY "sk-..." --secret --json
nac vars sync <project-id> .env.production --json
nac vars sync <project-id> .env --merge --json
nac vars sync <project-id> .env --dry-run --json
```

如果某些 key 是 secret，必须标记：

```bash
nac vars sync <project-id> .env --secret API_KEY --secret DB_PASS --json
```

本项目允许提交 `.env.example`，但禁止提交真实密钥。

## 9. LLM 配置

查看当前 LLM 配置：

```bash
nac llm show <project-id> --json
```

查看可用系统模型：

```bash
nac llm list-available <project-id> --json
```

切换到系统模型：

```bash
nac llm set <project-id> --config-id <uuid> --model <m> --json
```

自定义 LLM 模式必须通过环境变量和 raw API 设置，禁止把 API Key 写进配置文件。

## 10. 会话与变量注入

查看会话：

```bash
nac sessions list <project-id> --json
```

单次 chat 注入变量：

```bash
nac --token "ak:sk" chat staging --var TENANT_ID=acme -m "list my projects"
```

从 dotenv 文件注入：

```bash
nac --token "ak:sk" chat staging --vars-file .env.demo -m "..."
```

注入 sandbox 环境变量：

```bash
nac --token "ak:sk" chat staging --sbx-env DATABASE_URL="sqlite://..." -m "..."
```

注意：

- 单次变量不等于项目级持久配置；
- 需要持久生效的变量应使用 `nac vars set`；
- 不要把真实 secret 写入 `.env.demo` 并提交。

## 11. 配置文件

### 11.1 `nac.json`

由 `nac init` 创建：

```json
{"project_id": "xxx", "base_url": "https://nac.xiaobei.top"}
```

作用：

- 自动解析 `project-id`；
- 自动解析 `base-url`。

### 11.2 `agent.yaml`

最小模板：

```yaml
type: agent
name: my_agent
max_context_tokens: 200000
system_prompt: ./system-prompt.md
system_prompt_type: jinja
tool_call_mode: structured
max_iterations: 50
llm_config:
  max_tokens: 8000
  temperature: 0.7
tools: []
skills: []
stop_tools:
  - complete_task
```

不要写这些字段，平台会在部署时注入：

- `sandbox_config`
- `llm_config.model`
- `llm_config.base_url`
- `llm_config.api_key`
- `llm_config.api_type`
- `llm_config.stream`

### 11.3 `nexau.json`

Agent manifest：

```json
{
  "agents": { "my_agent": "agent.yaml" },
  "excluded": [".nexau/", ".env", "__pycache__/"]
}
```

### 11.4 `VERSION`

单行 semver：

```text
0.1.0
```

每次部署前按需递增版本。

## 12. 测试文件

`nac-tests.yaml` 示例：

```yaml
tests:
  - name: "basic"
    message: "hello"
    assert:
      status: completed
      latency_ms: "< 5000"
      content_contains: "keyword"
```

## 13. 本项目推荐接入流程

### 13.1 只做前端/后端 Demo

如果当前目标是完成 Next.js 点餐系统，可以暂时不接入 NAC 部署，只保留参考资料。

### 13.2 需要把 Agent 部署到 NAC

推荐顺序：

1. 确认 `nac` CLI 可用；
2. 使用 PAT 登录：

   ```bash
   nac auth login --pat nacp_xxx
   ```

3. 创建或确认项目：

   ```bash
   nac projects create --name "topic-b-ordering-agent" --json
   ```

4. 初始化配置：

   ```bash
   nac init
   ```

5. 编写 `agent.yaml`、`system-prompt.md`、`nexau.json`、`VERSION`；
6. 设置环境变量：

   ```bash
   nac vars set <project-id> KEY VALUE --json
   ```

7. 部署：

   ```bash
   nac deploy staging
   ```

8. 冒烟测试：

   ```bash
   nac smoke staging
   ```

### 13.3 需要调试 Agent 对话

使用 AK:SK：

```bash
AKSK=$(nac keys create <project-id> --json | jq -r '.access_key + ":" + .secret_key')
NAC_TOKEN="$AKSK" nac chat staging -m "帮我给 3 个人推荐午餐，预算 90 元以内，有人不吃辣，有人对花生过敏。" --json
```

## 14. 禁止事项

禁止：

- 把 `nacp_xxx`、`ak_xxx:sk_xxx` 写入仓库；
- 把真实 `.env` 提交；
- 用 NAC Agent 直接修改订单或库存；
- 用 NAC Agent 直接扣减库存；
- 用 NAC Agent 直接恢复库存；
- 绕过 Next.js 后端业务校验；
- 引入破坏 Vercel Preview 的依赖；
- 在 PR 中提交 Python/JavaScript 示例脚本；
- 把参考资料中的 Python/JS 示例直接复制进仓库。

## 15. 与其他平台的关系

本项目的主应用部署仍使用：

- GitHub；
- Next.js；
- Vercel Preview；
- `main` PR-only merge。

NAC 可以作为 Agent 能力补充平台使用，但不得替代 Vercel 的前端/后端预览部署。

## 16. 最小验收

如果接入 NAC，至少完成：

- [ ] `nac --version` 满足 `0.4.1+`；
- [ ] 已使用 PAT 登录管理命令；
- [ ] Gateway 命令使用 AK:SK；
- [ ] 没有提交任何真实密钥；
- [ ] `agent.yaml` 不包含平台注入字段；
- [ ] `nexau.json` 能解析；
- [ ] `VERSION` 存在；
- [ ] `nac deploy` 成功；
- [ ] `nac smoke` 成功；
- [ ] Vercel Preview 仍可打开；
- [ ] Agent 仍遵守结构化意图 + 后端校验边界。
