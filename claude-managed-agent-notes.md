# Claude Managed Agents 探索笔记

> 文档来源: https://platform.claude.com/docs/en/managed-agents/overview

## 是什么

预配置的 agent harness，运行在 Anthropic 托管基础设施上。适合**长时间运行**和**异步**任务。

与 Messages API 的对比：
| Messages API | Managed Agents |
|---|---|
| 直接调用模型 | 预配置 agent harness + 托管基础设施 |
| 自定义 agent loop，细粒度控制 | 长时间运行、异步工作 |
| 自己建沙箱/工具执行 | 开箱即用，内置 prompt caching、compaction |

## 四个核心概念

| 概念 | 说明 |
|------|------|
| **Agent** | 模型 + 系统提示 + 工具 + MCP 服务器 + 技能 |
| **Environment** | 配置好的云容器（预装包、网络访问规则、挂载文件） |
| **Session** | 运行中的 agent 实例，在环境内执行特定任务 |
| **Events** | 应用与 agent 之间的消息交换（用户输入、工具结果、状态更新） |

## 工程博客解读

来源: https://www.anthropic.com/engineering/managed-agents

### 核心设计哲学：Harness 会过时，接口要持久

> "Harnesses encode assumptions about what Claude can't do on their own. Those assumptions can go stale as models improve."

类比操作系统的设计：OS 把硬件虚拟化到 `process`, `file` 这样的抽象上，让 `read()` 不关心底层是 1970s 磁盘还是现代 SSD。**Managed Agents 也遵循这个模式** — 把 agent 组件虚拟化为三个接口：

| 组件 | 角色 | 说明 |
|------|------|------|
| Session | 日志 | 所有事件的追加日志，持久化 |
| Harness | 循环 | 调用 Claude，路由工具调用 |
| Sandbox | 沙箱 | 执行代码、编辑文件的环境 |

三者解耦后，任何一个的实现都可以独立替换，不影响其他两个。

### "不要养宠物"：从单体到分离

**早期方案**：把所有组件（session、harness、sandbox）放到一个容器里。

问题：
1. 容器变成了"宠物" — 如果容器挂了，session 丢失；如果无响应，无法区分是 harness bug、网络丢包、还是容器离线
2. 工程师想调试只能 ssh 进容器，但容器里有用户数据，无法安全调试
3. 客户想把 Claude 接入自己的 VPC 时，只能对等连接网络

### "大脑与手分离"：核心架构决策

将"大脑"（Claude + harness）与"手"（sandbox、工具）和"日志"（session）解耦：

```
┌──────────────┐
│   Session    │  ← 事件日志，持久化，独立存储
│  (append-only│
│     log)     │
└──────┬───────┘
       │
┌──────▼───────┐
│   Harness    │  ← 无状态，可替换，"大脑"
│  (brain)     │
│              │
│  execute(name, input) → string  ← 工具调用接口
└──┬───────┬───┘
   │       │
┌──▼──┐  ┌─▼────┐
│Sandbox│  │ MCP │  ← 各种"手"， cattle 而非 pet
└──────┘  └──────┘
```

好处：
- **Container 变成 cattle**：挂了？harness 捕获为 tool-call 错误，Claude 决定重试，新容器按标准配方重建
- **Harness 也变成 cattle**：挂了？从 session log 恢复，`wake(sessionId)` 就能继续
- **安全边界**：token 永远不会出现在 sandbox 里。Git token 在初始化时注入 remote；OAuth token 存在 vault 里，通过 proxy 调用

### 性能收益

解耦后 TTFT（Time To First Token）大幅下降：

| 指标 | 改善 |
|------|------|
| p50 TTFT | 下降 ~60% |
| p95 TTFT | 下降 >90% |

原因：容器现在按需 provision（通过 tool call），不需要等容器启动就能开始推理。不立即需要沙箱的 session 不用等容器初始化。

### Session ≠ 上下文窗口

关键观点：Session 是 Claude 上下文窗口之外的 **上下文对象**。

- 标准方法（compaction、context trimming）做不可逆的选择，不知道未来需要哪些 token
- Session 提供 `getEvents()` 接口，让 brain 灵活地：
  - 从上次停止的位置继续读取
  - 倒带几个事件看前因后果
  - 在特定 action 之前重新阅读上下文
- Harness 可以对 fetched events 做任何变换（context engineering、prompt cache 优化）
- **分离存储（Session）和管理（Harness）的关切**，因为无法预测未来模型需要什么 context engineering

### 多大脑多手

- **Many brains**：解耦后可以启动多个无状态 harnesses，按需连接 hands
- **Many hands**：Claude 可以推理多个执行环境并决定把工作送到哪里
- 接口统一为 `execute(name, input) → string`，harness 不知道 sandbox 是容器、手机还是模拟器
- **Brain 之间可以传递 hands**

### Meta-Harness 定位

> "Managed Agents is a meta-harness... unopinionated about the specific harness that Claude will need in the future."

- 不假设 Claude 需要多少 brain/hand 或它们在哪里
- 只保证接口的形状：manipulate state (session) + perform computation (sandbox)
- 可以容纳 Claude Code、task-specific harnesses 等各种实现

---

## 工作流程

1. **创建 Agent** → 定义模型、prompt、工具、MCP、技能
2. **创建 Environment** → 配置容器（Python/Node.js/Go 等）、网络规则、挂载文件
3. **启动 Session** → 引用 agent 和环境配置
4. **发送事件 & 流式响应** → 通过 SSE 通信，事件历史持久化存储
5. **引导或中断** → 执行中可发送额外事件引导方向

---

## Quickstart 关键步骤

### 1. 创建 Agent

```json
{
  "name": "Coding Assistant",
  "model": "claude-opus-4-7",
  "system": "You are a helpful coding assistant.",
  "tools": [{"type": "agent_toolset_20260401"}]
}
```

- 返回 `agent.id` 和 `agent.version`
- `agent_toolset_20260401` 启用全部内置工具集

### 2. 创建 Environment

```json
{
  "name": "quickstart-env",
  "config": {
    "type": "cloud",
    "networking": {"type": "unrestricted"}
  }
}
```

### 3. 创建 Session

```json
{
  "agent": "$AGENT_ID",
  "environment_id": "$ENVIRONMENT_ID",
  "title": "Quickstart session"
}
```

### 4. 发送消息 & 流式响应

- 先打开 SSE stream (`GET /v1/sessions/{id}/stream`)
- 然后发送 user event (`POST /v1/sessions/{id}/events`)
- 事件类型：`agent.message`（文本）、`agent.tool_use`（工具调用）、`session.status_idle`（完成）

### 运行原理

发送 user event 后：
1. 按 environment 配置 provision 容器
2. 运行 agent loop，Claude 决定使用哪些工具
3. 在容器内执行文件写入、bash 命令等
4. 实时流式推送事件
5. 无事可做时进入 idle（发出 `session.status_idle`）

---

## Agent 配置 (Agent Setup)

### 配置字段

| 字段 | 说明 |
|------|------|
| `name` | 必填，人类可读名称 |
| `model` | 必填，Claude 模型（Claude 4.5+） |
| `system` | 系统提示，定义 agent 行为和角色 |
| `tools` | 可用工具集（内置工具 + MCP + 自定义工具） |
| `mcp_servers` | MCP 服务器，提供标准化第三方能力 |
| `skills` | 技能，提供领域特定知识+渐进式上下文加载 |
| `callable_agents` | 可调用的其他 agent（多 agent 编排，研究预览） |
| `description` | agent 描述 |
| `metadata` | 自定义 KV 对 |

### 模型配置

- 使用 Opus 4.6 + fast mode：`{"id": "claude-opus-4-6", "speed": "fast"}`

### 版本控制

- 更新 agent 生成新版本，version 从 1 开始递增
- `version` 字段用于乐观锁，确保从已知状态更新
- 更新语义：
  - **省略字段** 会被保留
  - **标量字段**（model, system, name）被替换
  - **数组字段**（tools, mcp_servers, skills, callable_agents）被完全替换
  - **metadata** 按键级合并
  - 支持 **no-op 检测**，无变化不生成新版本

### Agent 生命周期

| 操作 | 行为 |
|------|------|
| Update | 生成新版本 |
| List versions | 获取完整版本历史 |
| Archive | 只读，新 session 无法引用，已有 session 继续运行 |

---

## 内置工具

| 工具 | Name | 描述 |
|---|---|---|
| Bash | `bash` | 在容器中执行 shell 命令 |
| Read | `read` | 读取文件 |
| Write | `write` | 写入文件 |
| Edit | `edit` | 文件字符串替换 |
| Glob | `glob` | glob 模式文件匹配 |
| Grep | `grep` | 正则搜索文本 |
| Web fetch | `web_fetch` | 抓取 URL 内容 |
| Web search | `web_search` | 网页搜索 |

### 工具集配置方式

通过 `configs` 数组禁用/启用特定工具：

```json
{
  "type": "agent_toolset_20260401",
  "default_config": {"enabled": false},  // 全部关闭
  "configs": [
    {"name": "bash", "enabled": true},
    {"name": "read", "enabled": true},
    {"name": "write", "enabled": true}
  ]
}
```

### 自定义工具 (Custom Tools)

与 Messages API 的 user-defined client tools 类似：
- 定义 tool name、description、input_schema
- Claude 发出调用请求，**你的代码在外部执行**，结果传回 session
- 模型不会自行执行，它发出结构化请求

```json
{
  "type": "custom",
  "name": "get_weather",
  "description": "Get current weather for a location",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": {"type": "string", "description": "City name"}
    },
    "required": ["location"]
  }
}
```

**自定义工具最佳实践：**
1. 描述要极其详细（3-4 句以上）
2. 相关操作合并到 fewer tools（用 action 参数区分）
3. 有意义的命名空间前缀（`db_query`, `storage_read`）
4. 返回高信号信息（slug/UUID），不要返回内部冗余字段

---

## Environment 配置

### Packages 预安装

```json
{
  "packages": {
    "pip": ["pandas", "numpy==2.0.0"],
    "npm": ["express@4.18.0"]
  }
}
```

支持的包管理器：apt、cargo、gem、go、npm、pip
安装顺序：按字母顺序（apt → cargo → gem → go → npm → pip）
包会被缓存，跨 session 复用

### Networking 网络控制

| 模式 | 描述 |
|---|---|
| `unrestricted` | 完全出站网络访问（有安全黑名单），默认 |
| `limited` | 仅允许 `allowed_hosts` 列表 |

Limited 模式配置：
```json
{
  "networking": {
    "type": "limited",
    "allowed_hosts": ["api.example.com"],
    "allow_mcp_servers": true,
    "allow_package_managers": true
  }
}
```

- `allowed_hosts`：必须 HTTPS 前缀
- `allow_mcp_servers`：允许访问 agent 配置的 MCP 端点
- `allow_package_managers`：允许访问公共包注册表（PyPI, npm 等）

> 生产环境建议用 `limited` + 明确 `allowed_hosts`，遵循最小权限原则

### 生命周期

- Environment 持久化，直到被 archive 或 delete
- 多个 session 可引用同一 environment
- **每个 session 获得独立的容器实例**，不共享文件系统
- Environment 不做版本控制，需要自己记录变更

### 关键概念区分：Environment vs Container

这是容易混淆的点，**Environment 不是容器本身，而是容器的配置模板**。

官方原文：
> "Environments define the **container configuration** where your agent runs."
> "Multiple sessions can reference the same environment, but each session gets its own **isolated container instance**."

关系：
```
Environment（配置模板）
    ↓ provision
Container Instance（运行中的沙箱）
    ↓ runs
Agent Loop + Tools（在这个实例里工作）
```

类比：
| 概念 | 类比 | 说明 |
|------|------|------|
| Environment | Dockerfile / image + 网络配置 | 定义"沙箱长什么样"：装什么包、网络怎么配 |
| Container instance | `docker run` 出来的运行中容器 | 真正执行 agent loop 和工具调用的运行时 |
| Session | 管理容器生命周期的编排层 | 发送事件驱动执行，跟踪状态 |

所以：
- Environment 只是模板/蓝图，定义容器的规格（packages、networking）
- 真正跑 agent 的是 container instance，跟随 session 生命周期
- Session 创建时 provision 容器，删除 session 时才销毁容器

资源生命周期总结：

┌─────────────┬─────────────────────────────┬──────────────────┐
│    资源     │          生命周期           │       类比       │
├─────────────┼─────────────────────────────┼──────────────────┤
│ Environment │ 持久（直到 archive/delete） │ 镜像/模板        │
├─────────────┼─────────────────────────────┼──────────────────┤
│ Session     │ 中等（idle 可保持很久）     │ 进程             │
├─────────────┼─────────────────────────────┼──────────────────┤
│ Container   │ 与 Session 绑定             │ 进程的运行时沙箱 │
├─────────────┼─────────────────────────────┼──────────────────┤
│ Agent       │ 持久（版本化）              │ 配置             │
└─────────────┴─────────────────────────────┴──────────────────┘

### 管理操作

- `GET /v1/environments` — 列表
- `GET /v1/environments/{id}` — 获取单个
- `POST /v1/environments/{id}/archive` — 归档（已有 session 继续运行）
- `DELETE /v1/environments/{id}` — 删除（无 session 引用时）

---

## Events & Streaming

### 事件类型

**User events（发送）**：
| 类型 | 描述 |
|------|------|
| `user.message` | 用户消息 |
| `user.interrupt` | 中断 agent 执行 |
| `user.custom_tool_result` | 自定义工具结果 |
| `user.tool_confirmation` | 审批/拒绝工具调用 |
| `user.define_outcome` | 定义 outcome（目标驱动） |

**Agent events（接收）**：
| 类型 | 描述 |
|------|------|
| `agent.message` | agent 文本回复 |
| `agent.thinking` | agent 思考内容 |
| `agent.tool_use` | 内置工具调用 |
| `agent.tool_result` | 内置工具结果 |
| `agent.mcp_tool_use` | MCP 工具调用 |
| `agent.mcp_tool_result` | MCP 工具结果 |
| `agent.custom_tool_use` | 自定义工具调用 |
| `agent.thread_context_compacted` | 上下文压缩 |
| `agent.thread_message_sent/received` | 多 agent 线程消息 |

**Session events**：
| 类型 | 描述 |
|------|------|
| `session.status_running` | 运行中 |
| `session.status_idle` | 空闲，含 stop_reason |
| `session.status_rescheduled` | 瞬时错误，自动重试 |
| `session.status_terminated` | 不可恢复错误 |
| `session.error` | 错误详情 |
| `session.thread_created/idle` | 多 agent 线程生命周期 |

**Span events**（可观测性标记）：
| 类型 | 描述 |
|------|------|
| `span.model_request_start/end` | 模型推理调用开始/结束 |
| `span.outcome_evaluation_start/ongoing/end` | outcome 评估 |

### 流式通信

**基本模式**：先打开 stream，再发送事件（避免竞态）

```python
with client.beta.sessions.events.stream(session.id) as stream:
    client.beta.sessions.events.send(session.id, events=[...])
    for event in stream:
        match event.type:
            case "agent.message": ...
            case "session.status_idle": break
            case "session.error": ...
```

**断线重连**：打开新 stream → 列出历史事件 ID → 从 live stream 跳过已见事件

### 自定义工具调用处理

1. Agent 调用自定义工具 → 发出 `agent.custom_tool_use`
2. Session 暂停 → `session.status_idle` with `stop_reason: requires_action`
3. 在你的系统执行工具，发送 `user.custom_tool_result`（含 `custom_tool_use_id`）
4. 所有阻塞事件解决后，session 恢复 running

### Tool Confirmation（权限审批）

当 permission policy 要求确认时：
1. 发出 `agent.tool_use` / `agent.mcp_tool_use`
2. Session 暂停 → `session.status_idle` with `stop_reason: requires_action`
3. 发送 `user.tool_confirmation`（`result: "allow"` / `"deny"`）
4. 解决后恢复

### 使用量追踪

Session 对象包含 `usage` 字段：
```json
{
  "input_tokens": 5000,
  "output_tokens": 3200,
  "cache_creation_input_tokens": 2000,
  "cache_read_input_tokens": 20000
}
```
- Cache TTL = 5 分钟，窗口内的连续 turn 受益于 cache reads

---

## Multi-agent

> 研究预览功能，需申请

### 架构

- **Coordinator agent** 可调用其他 agent（`callable_agents`）
- 所有 agent 共享同一容器和文件系统
- 每个 agent 运行在独立的 **thread**（上下文隔离的 event stream）
- **仅支持一级委派**：coordinator → subagent，subagent 不能再调用其他 agent
- Thread 是持久的：coordinator 可以向之前调用的 agent 发送后续消息

### 声明 callable agents

```json
{
  "name": "Engineering Lead",
  "callable_agents": [
    {"type": "agent", "id": "$REVIEWER_ID", "version": 1},
    {"type": "agent", "id": "$TEST_WRITER_ID", "version": 1}
  ]
}
```

### Session Threads

- **Primary thread** = session-level event stream（所有活动的摘要视图）
- 可列出 session 中所有 threads：`GET /v1/sessions/{id}/threads`
- 可流式获取特定 thread 的事件：`GET /v1/sessions/{id}/threads/{thread_id}/stream`
- Session 状态是所有 thread 状态的聚合

### Multi-agent 事件

| 类型 | 描述 |
|------|------|
| `session.thread_created` | Coordinator 创建了新 thread |
| `session.thread_idle` | Agent thread 完成工作 |
| `agent.thread_message_sent` | Agent 向另一个 thread 发送消息 |
| `agent.thread_message_received` | Agent 从另一个 thread 接收消息 |

### Subagent 路由

当 subagent 需要 permission 确认或自定义工具结果时：
- 事件携带 `session_thread_id` 字段
- 回复时带上相同的 `session_thread_id`，平台路由回对应 thread
- 无 `session_thread_id` = 来自 primary thread

---

## Outcomes（目标驱动）

> 研究预览功能，需申请。Beta header: `managed-agents-2026-04-01-research-preview`

### 概念

将 session 从**对话**升级为**工作**：定义最终结果和质量标准，agent 自动迭代直到达成目标。

### Grader 机制

- 系统自动分配独立的 **grader**（使用独立上下文窗口，不受 agent 实现影响）
- 按 rubric 标准逐项评分
- 返回具体缺失项给 agent 进行下一轮迭代

### Rubric 编写

```markdown
# DCF Model Rubric

## Revenue Projections
- Uses historical revenue data from the last 5 fiscal years
- Growth rate assumptions are explicitly stated and reasonable
```

- 结构化、可评分的标准，避免模糊描述
- 可通过 Files API 上传复用

### 使用方式

```json
{
  "type": "user.define_outcome",
  "description": "Build a DCF model for Costco in .xlsx",
  "rubric": {"type": "text", "content": "..."},
  "max_iterations": 5
}
```

- `max_iterations` 默认 3，最大 20
- 发送后 agent 立即开始工作，无需额外 `user.message`

### Outcome 结果

| 结果 | 后续 |
|------|------|
| `satisfied` | Session 进入 idle |
| `needs_revision` | Agent 开始新一轮迭代 |
| `max_iterations_reached` | 不再评估 |
| `failed` | Rubric 与任务不匹配 |
| `interrupted` | 被 user.interrupt 中断 |

### 获取产出

Agent 将输出文件写入容器内 `/mnt/session/outputs/`，通过 Files API 获取：
```
GET /v1/files?scope_id=$session_id
GET /v1/files/$file_id/content
```

---

## Memory（记忆）

> 研究预览功能，需申请

### 概念

Session 默认是临时的。Memory store 让 agent 跨 session 携带知识：用户偏好、项目约定、历史教训、领域上下文。

### Memory Store

- 工作区级别的文本集合
- 每个 memory 以路径形式组织（类似文件系统）
- 每个 mutation 创建不可变的 **memory version**（审计 + 回滚）
- 单个 memory 上限 100KB（约 25K tokens）

### 创建与种子

```python
store = client.beta.memory_stores.create(
    name="User Preferences",
    description="Per-user preferences and project context.",
)

# 预填充
client.beta.memory_stores.memories.write(
    memory_store_id=store.id,
    path="/formatting_standards.md",
    content="All reports use GAAP formatting...",
)
```

### 附加到 Session

```json
{
  "resources": [{
    "type": "memory_store",
    "memory_store_id": "$store_id",
    "access": "read_write",
    "prompt": "Check before starting any task."
  }]
}
```

- 最多 8 个 memory store / session
- 支持 `read_write`（默认）和 `read_only`
- Agent 自动在任务开始前检查，完成后写入持久教训

### Memory 工具

Agent 自动获得：`memory_list`, `memory_search`, `memory_read`, `memory_write`, `memory_edit`, `memory_delete`

### 安全写入（乐观并发）

- `precondition: {type: "not_exists"}` — 仅在路径不存在时创建
- `precondition: {type: "content_sha256", content_sha256: "..."}` — 仅在 hash 匹配时更新

---

## Skills（技能）

### 概念

文件系统化的可复用资源，给 agent 领域特定能力：工作流、上下文、最佳实践。

- **预构建技能**（Anthropic 提供）：PowerPoint、Excel、Word、PDF 处理等
- **自定义技能**：你自己编写并上传到组织

### 使用方式

```json
{
  "skills": [
    {"type": "anthropic", "skill_id": "xlsx"},
    {"type": "custom", "skill_id": "skill_abc123", "version": "latest"}
  ]
}
```

- 最多 20 个技能 / session（含 multi-agent 场景下的所有 agent）
- 按需加载，仅在相关时影响上下文窗口
- Agent 自动调用相关技能

---

## Cloud Containers 参考

### 预装编程语言

| 语言 | 版本 | 包管理器 |
|------|------|----------|
| Python | 3.12+ | pip, uv |
| Node.js | 20+ | npm, yarn, pnpm |
| Go | 1.22+ | go modules |
| Rust | 1.77+ | cargo |
| Java | 21+ | maven, gradle |
| Ruby | 3.3+ | bundler, gem |
| PHP | 8.3+ | composer |
| C/C++ | GCC 13+ | make, cmake |

### 数据库

| 数据库 | 说明 |
|--------|------|
| SQLite | 预装，立即可用（本地） |
| PostgreSQL 客户端 | `psql`，连接外部数据库 |
| Redis 客户端 | `redis-cli`，连接外部实例 |

> PostgreSQL、Redis 等服务**不在容器内运行**，仅包含客户端工具。SQLite 可完全本地使用。

### 系统工具

- `git` — 版本控制
- `curl`, `wget` — HTTP 客户端
- `jq` — JSON 处理
- `tar`, `zip`, `unzip` — 归档工具
- `ssh`, `scp` — 远程访问（需启用网络）
- `tmux`, `screen` — 终端复用器

### 开发工具

- `make`, `cmake` — 构建系统
- `docker` — 容器管理（有限支持）
- `ripgrep` (`rg`) — 快速文件搜索
- `tree` — 目录可视化
- `htop` — 进程监控

### 文本处理

- `sed`, `awk`, `grep` — 流编辑器
- `vim`, `nano` — 文本编辑器
- `diff`, `patch` — 文件比较

### 容器规格

| 属性 | 值 |
|------|----|
| 操作系统 | Ubuntu 22.04 LTS |
| 架构 | x86_64 (amd64) |
| 内存 | 最多 8 GB |
| 磁盘 | 最多 10 GB |
| 网络 | 默认关闭（需在 environment config 中启用） |

---

## Sessions API Reference

### 创建 Session

必需字段：`agent` ID + `environment` ID

```json
// 使用 agent 最新版本
{ "agent": "$AGENT_ID", "environment_id": "$ENV_ID" }

// 固定到特定版本
{ "agent": {"type": "agent", "id": "$AGENT_ID", "version": 1}, "environment_id": "$ENV_ID" }
```

### Vault（MCP 认证）

如果 agent 使用需要认证的 MCP 工具，创建 session 时传入 `vault_ids`：
```json
{ "agent": "$AGENT_ID", "environment_id": "$ENV_ID", "vault_ids": ["$VAULT_ID"] }
```
- Vault 包含预注册的 OAuth 凭证
- Anthropic 自动处理 token 刷新

### Session 状态机

| 状态 | 说明 |
|------|------|
| `idle` | 等待输入（包括用户消息或工具确认），session 初始状态 |
| `running` | 正在执行 |
| `rescheduling` | 瞬时错误，自动重试 |
| `terminated` | 不可恢复错误，session 结束 |

### CRUD 操作

- `POST /v1/sessions` — 创建
- `GET /v1/sessions` — 列表（分页）
- `GET /v1/sessions/{id}` — 获取单个
- `POST /v1/sessions/{id}/archive` — 归档（阻止新事件，保留历史）
- `DELETE /v1/sessions/{id}` — 删除（永久移除记录和容器；running 状态不可删除）

### 注意事项

- 创建 session 会 provision 环境和 agent，但**不会开始任何工作**
- 需要发送 user event（如 `user.message`）才能驱动执行
- 删除 session 不影响 files、memory stores、environments、agents
- Session 维护跨交互的对话历史

---

## MCP Connector

### 两步配置

1. **Agent 创建时** — 声明 MCP 服务器（name + URL）
2. **Session 创建时** — 通过 vault 提供认证凭证

这种分离让 agent 定义可复用，同时每个 session 使用自己的凭证。

### 声明 MCP 服务器

```json
{
  "name": "GitHub Assistant",
  "mcp_servers": [
    {
      "type": "url",
      "name": "github",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  ],
  "tools": [
    {"type": "agent_toolset_20260401"},
    {"type": "mcp_toolset", "mcp_server_name": "github"}
  ]
}
```

关键点：
- `mcp_servers[].name` 是唯一的，用于在 `tools` 数组中引用
- `mcp_toolset` 类型将 MCP 服务器工具暴露给 agent
- MCP toolset 默认权限策略为 `always_ask`（每次调用需用户审批）

### Session 提供认证

```json
{
  "agent": "$agent_id",
  "environment_id": "$environment_id",
  "vault_ids": ["$vault_id"]
}
```

### MCP 认证失败处理

- 凭证无效时，session 创建仍成功
- 发出 `session.error` 事件描述 MCP 认证失败
- 可以决定阻止后续交互、更新凭证、或继续不带 MCP 的 session
- 下次 `idle → running` 转换时会自动重试认证

### 支持的 MCP 服务器类型

- 仅支持 **远程 MCP 服务器**（HTTP 端点）
- 服务器必须支持 MCP 协议的 **streamable HTTP transport**

---

## 关键细节

- **Beta header**: `managed-agents-2026-04-01`（SDK 自动设置）
- **速率限制**: 创建端点 60 req/min，读取端点 600 req/min
- **研究预览功能** (需单独申请): outcomes、multi-agent、memory
- **品牌规范**: 可以用 "Claude Agent" / "Claude" / "{Name} Powered by Claude"，不能用 "Claude Code"
- 支持 SDK: Python, TypeScript, Java, Go, C#, Ruby, PHP
- 也有 CLI 工具 `ant`（通过 Homebrew / curl / go install 安装）

---

---

## API 文档 vs 工程博客：架构与实现的落差

来源对比：
- API 文档：https://platform.claude.com/docs/en/managed-agents/overview
- 工程博客：https://www.anthropic.com/engineering/managed-agents

### 核心判断

**API 文档反映的是"当前第一个具体实现"，不是博客描述的"完整抽象系统"。** 两者之间的 gap 就是产品化过程中还没开放的能力。

### 逐项验证

#### 1. Sandbox 多样性 — 是妥协

**博客说：**
> "execute(name, input) → string — the harness doesn't know whether the sandbox is a container, a phone, or a Pokémon emulator"

**API 只暴露了：**
```json
{ "type": "cloud", ... }
```
config 的 `type` 字段是一个 union 类型（目前只有 `"cloud"`），暗示未来可能扩展，但当前用户只能选择 Anthropic 托管的云容器。没有 custom sandbox、BYO-container 的入口。

→ 底层架构支持多种 sandbox 类型，API 只暴露了一种。

#### 2. Session 上下文灵活性 — 是妥协

**博客说 Session 是灵活的上下文对象：**
> "getEvents() allows the brain to interrogate context — select positional slices, rewind, reread before specific actions"

**API 暴露的是固定的：**
- SSE 流式读取（只能从打开点往后）
- 全量列出事件（GET /v1/sessions/{id}/events）
- 不能 positional slice、不能 rewind

→ Session 内部的上下文能力被锁在 harness 内部，API 只暴露了基础读写。

#### 3. Harness 多样性 — 是妥协

**博客的核心论点：**
> "Managed Agents is a meta-harness... unopinionated about the specific harness"
> "Claude Code is an excellent harness... task-specific agent harnesses excel in narrow domains"

**API 只有一套 harness 行为** — agent loop + tool execution。没有让用户选择或自定义 harness 行为的入口。

→ 内部可能有多种 harness 实现，API 用户只拿到一种。

#### 4. Multi-agent 限制 — 是妥协

**博客说：**
> "Brains can pass hands to one another"

**API：**
- 只支持 **一级委派**（coordinator → subagent，不能递归）
- callable_agents 需申请研究预览

→ 架构支持任意传递，API 加了硬性限制。

#### 5. 安全模型 — 不是妥协，是安全隐藏

**博客详细描述了安全分离架构**（token 不在 sandbox、vault + proxy），**API 只暴露了 `vault_ids`**。

→ 这是安全考虑故意不暴露。用户只需要传 vault ID，不需要理解内部机制。**合理的设计。**

#### 6. TTFT / Lazy Provisioning — 文档措辞不够精确

**博客说：** 容器按需 provision，p95 TTFT 下降 >90%。

**API 文档原文：** "Creating a session provisions the environment and agent but does not start any work."

→ 这里说的是 provision environment（配置）和 agent（定义），**不是 container**。容器确实是按需创建的，与博客一致。API 文档措辞容易让人误解为"创建即启动容器"，但技术上不算错误。

### 总结表

| 维度 | 博客说的（架构抽象） | API 给的（当前实现） | 判断 |
|------|---------------------|---------------------|------|
| Sandbox 多样性 | 任意类型 | 仅 cloud container | **妥协** |
| Session 灵活性 | 可切片/倒带/重读 | 固定流式+全量列表 | **妥协** |
| Harness 多样性 | 多种 harness | 只有一种 | **妥协** |
| 安全边界 | 详细架构描述 | 只暴露 vault_ids | **安全隐藏，合理** |
| Multi-agent | Brain 可传递 hands | 一级委派 | **妥协** |
| TTFT | 按需 provision | 文档措辞模糊但不错 | **文档不精确** |
| Environment config type | — | `"type": "cloud"`（union 字段） | **暗示未来可扩展** |

### 为什么会有 gap

博客里给了线索：
> "We expect harnesses to continue evolving. So we built Managed Agents: a hosted service... through a small set of interfaces meant to outlast any particular implementation — including the ones we run today."

Anthropic 的策略是：**先把抽象系统搭好，逐步开放能力**。当前 Beta 只开了最基础的 cloud container + 单 harness 路径。config 里的 `type: "cloud"` 这种 union 设计，以及 `resources[]` 数组的扩展性，都表明 API 是为未来多类型预留了空间的。

---

## 探索进度

- [x] Overview
- [x] Quickstart
- [x] Tools
- [x] Environments
- [x] Agent Setup
- [x] Events and Streaming
- [x] Multi-agent
- [x] Outcomes
- [x] Memory
- [x] Skills
- [x] Cloud Containers 参考
- [x] Sessions API Reference
- [x] MCP Connector
- [ ] Permission Policies (permission-policies)
- [ ] Vaults (vaults)
