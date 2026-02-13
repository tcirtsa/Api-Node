# API 预警系统（规则引擎管理平台）

这是一个 **Node 全栈** 的 API 预警系统毕业设计示例：
- 前端：React + Vite + Tailwind（`src/`）
- 后端：Node.js + Express（`server/`）
- 存储：本地 JSON 持久化（`server/data/store.json`，可切换为外部数据库）
- 核心能力：规则引擎、告警生命周期、通知渠道、审计日志、数据模拟器、任意外部 API 主动探测（pull）

## 1. 快速开始

```bash
npm install
npm run dev
```

启动后：
- 前端：`http://localhost:5173`
- 后端：`http://localhost:8787`

`npm run dev` 会同时启动前后端（通过 `concurrently`）。

### 生产/单独启动后端

```bash
npm run build
npm run start
```

### 运行测试

```bash
npm test
```

## 2. 功能说明

### 2.1 监控模式
- `push`：业务系统上报指标到 `POST /api/metrics`
- `pull`：平台主动按间隔探测任意 URL（HTTP 方法、超时、预期状态码可配）
- 手动探测：`POST /api/apis/:apiId/check-now`
- OpenAPI 批量导入：`POST /api/apis/import-openapi`（可从 URL 或文本导入）
- 支持凭据注入：可为 pull API 绑定 `credentialId`，探测时自动注入认证信息

#### 写接口探测安全策略（POST/PUT/PATCH/DELETE）
- `readonly`：禁止写接口主动探测（默认）
- `dry_run`：允许写接口探测，但自动附加 dry-run 参数与请求头（需业务方支持）
- `sandbox`：仅建议在沙箱/测试环境执行写接口探测；生产默认阻断（除非显式放开）

### 2.2 规则引擎
支持以下规则维度：
- 指标：`qps` / `errorRate` / `latencyP95` / `latencyP99` / `availability` / `statusCode5xx`
- 运算符：`>` `>=` `<` `<=` `==` `!=`
- 聚合：`avg` / `max` / `min` / `latest`
- 时间窗口：`windowMinutes`
- 最少样本数：`minSamples`
- 冷却时间：`cooldownMinutes`
- 作用域：`global` / `service` / `api`
- 智能规则类型：
- `threshold`：阈值规则
- `consecutive_failures`：连续失败规则（N 连续样本）
- `missing_data`：缺失数据规则（N 分钟无数据）
- `burn_rate`：SLO Burn Rate 双窗口规则（短窗口+长窗口）

### 2.3 告警生命周期
- `open`（待处理）
- `acknowledged`（处理中）
- `resolved`（已恢复）
- `closed`（已关闭）

规则命中后自动创建告警，恢复后自动变更为 `resolved`（若仍处活动状态）。

### 2.4 通知渠道
内置渠道（可启停和测试）：
- Email
- Webhook
- Slack
- SMS
- WeCom

说明：当前为模拟发送，适合毕业设计演示；后续可接真实第三方服务。

### 2.5 凭据中心（鉴权）
- 凭据类型：`bearer` / `api_key` / `basic` / `custom`
- 绑定方式：在 API 的 `monitor.checkConfig.credentialId` 指定
- 平台只存 `secretRef`，不存明文密钥；实际密钥从环境变量读取

#### secretRef 约定
- 默认读取 `API_ALERT_SECRET_<ref>`（也支持直接读取同名 `<ref>` 环境变量）
- 例如 `tokenRef: "github_token"` 对应环境变量：
  - `API_ALERT_SECRET_github_token=ghp_xxx`
- 可用 `CREDENTIAL_SECRET_PREFIX` 修改默认前缀

#### 配置示例（凭据 config）
- `bearer`: `{"tokenRef":"github_token"}`
- `api_key`: `{"key":"X-API-Key","in":"header","valueRef":"partner_key"}`
- `basic`: `{"username":"demo","passwordRef":"demo_pass"}`
- `custom`: `{"headerRefs":{"X-Signature":"partner_sign","X-Timestamp":"partner_ts"}}`

### 2.6 告警降噪
- 去重窗口：短时间内同一规则+API 指纹不重复通知
- 抑制窗口：抑制高频重复触发
- 抖动检测：频繁开闭环后自动静默
- 恢复通知：告警恢复时可选发送 recovery 通知
- 升级策略：告警持续未恢复时，按级别与延迟触发 escalation 通知
- 策略接口：`GET /api/alert-policy`、`PATCH /api/alert-policy`

### 2.7 告警升级（Escalation）
策略字段示例（`alertPolicy.escalations`）：

```json
[
  { "level": "E1", "afterMinutes": 15, "repeatMinutes": 30, "actions": ["slack"] },
  { "level": "E2", "afterMinutes": 60, "repeatMinutes": 60, "actions": ["sms", "wechat"] }
]
```

可通过 `PATCH /api/alert-policy` 配置：
- `escalationEnabled`: 是否启用升级策略
- `escalateRequiresPrimary`: 只有首轮告警通知已发送时才升级

### 2.8 异步指标流（Kafka / RabbitMQ）
支持把指标写入消息队列后异步入库（避免高峰期同步请求阻塞）：

环境变量：
- `ASYNC_METRICS_ENABLED=true`：`POST /api/metrics` 改为入队
- `METRIC_QUEUE_WORKER_ENABLED=true`：启用本地队列消费
- `METRIC_STREAM_PROVIDER=kafka|rabbitmq`：启用外部队列消费
- `KAFKA_BROKERS=host:9092`、`KAFKA_TOPIC=api-metrics`、`KAFKA_GROUP_ID=api-alert-engine`
- `RABBIT_URL=amqp://localhost`、`RABBIT_QUEUE=api-metrics`

### 2.9 规则表达式 DSL 与可视化编排
可视化编排：规则创建页面表单即为可视化配置。
DSL 示例（后端解析接口）：

```
errorRate > 5 aggregation=avg window=5m min=2 cooldown=10 scope=service:payment priority=P1 actions=email,slack name="Error spike"
```

接口：
- `POST /api/rules/parse-dsl`
- `POST /api/rules/create-dsl`

### 2.10 核心/高级导航分层
- Core：总览、API 监控、规则引擎、告警中心、通知渠道
- Advanced：质量报表、系统设置
- 说明：默认可折叠高级导航，保持主流程清晰；进入高级页面会自动展开高级区

### 2.5 模拟器（演示模式）
默认关闭。仅在 `DEMO_MODE=true` 时启用演示接口：
- `POST /api/demo/reset`
- `POST /api/demo/tick`
- `POST /api/demo/simulate`

说明：线上/真实监控场景建议保持关闭，避免污染监控数据。

## 3. 目录结构

```text
api-main/
  src/                   # 前端
    app/
      layouts/
      pages/
      lib/               # api client + types + formatter
  server/                # 后端
    app.js               # REST API
    index.js             # 服务入口 + 模拟器循环
    rule-engine.js       # 规则评估与告警流转
    simulator.js         # 指标模拟
    notifications.js     # 通知分发
    metric-ingest.js     # 指标批量入库逻辑
    metric-queue.js      # 本地异步队列
    metric-stream.js     # Kafka / RabbitMQ 消费入口
    rule-dsl.js          # 规则 DSL 解析
    store.js             # JSON 存储层
    default-data.js      # 初始演示数据
    data/store.json      # 运行时数据
```

## 4. 关键接口（节选）

- `GET /api/health`：健康检查
- `GET /api/dashboard/summary`：仪表盘摘要
- `GET /api/dashboard/trends`：趋势数据
- `GET /api/apis`：API 列表
- `POST /api/apis/import-openapi`：OpenAPI/Swagger 批量导入监控项
- `GET /api/apis/:apiId`：API 详情
- `DELETE /api/apis/:apiId`：删除 API（支持 `cascade=true`）
- `POST /api/apis/:apiId/check-now`：手动探测 pull API
- `POST /api/metrics`：写入指标（触发规则引擎）
- `GET /api/rules` / `POST /api/rules` / `PATCH /api/rules/:id`
- `POST /api/rules/auto-create`：按作用域与敏感度自动生成规则阈值（高级参数自动推导）
- `POST /api/rules/:id/simulate`：规则模拟
- `GET /api/alerts` / `PATCH /api/alerts/:id/status`
- `DELETE /api/alerts/:id`
- `GET /api/channels` / `POST /api/channels` / `PATCH /api/channels/:id` / `POST /api/channels/:id/test`
- `DELETE /api/channels/:id`（支持 `force=true` 解除规则引用）
- `GET /api/credentials` / `POST /api/credentials` / `PATCH /api/credentials/:id`
- `DELETE /api/credentials/:id`（支持 `force=true` 解除 API 绑定）
- `POST /api/credentials/:id/verify`：验证 secretRef 是否可解析
- `GET /api/settings/users`（责任人目录只读）
- `GET /api/settings/overview`（设置页聚合接口）
- `GET /api/settings/audit-logs`
- `POST /api/notifications/dispatch-now`：手动触发通知队列处理
- `DELETE /api/notifications/:id`
- `GET /api/alert-policy` / `PATCH /api/alert-policy`
- `POST /api/rules/parse-dsl`
- `POST /api/rules/create-dsl`
- `GET /api/reports/alert-quality?days=7&service=&apiId=&ruleId=`：告警质量报表（支持按服务/API/规则下钻）
- `GET /api/reports/alert-quality-trend?days=14&bucketDays=1&service=&apiId=&ruleId=`：质量趋势
- `GET /api/reports/alert-quality-compare?days=7&service=&apiId=&ruleId=`：当前窗口与上一窗口对比
- `GET /api/reports/rule-tuning-suggestions?days=7&service=&apiId=&ruleId=`：规则调优建议
- `GET /api/reports/alert-quality-conclusion?days=7&service=&apiId=&ruleId=`：实验结论文本
- `GET/POST/DELETE /api/reports/markers`：策略变更标记
- `GET /api/reports/alert-quality-marker-compare?markerId=`：按标记前后对比
- `GET /api/rule-drafts` / `POST /api/reports/rule-drafts/from-suggestions`
- `GET /api/rule-drafts/:id/impact-estimate?days=7&service=&apiId=`：草稿应用前影响预估（重复率/误报率变化）
- `POST /api/rule-drafts/:id/apply` / `DELETE /api/rule-drafts/:id`
- `PATCH /api/alerts/:id/feedback`：人工反馈（true_positive/false_positive/noise）
- `POST /api/demo/reset`：重置演示数据（仅 `DEMO_MODE=true`）
- `POST /api/demo/tick`：触发一轮模拟指标（仅 `DEMO_MODE=true`）
- `POST /api/demo/simulate`：批量回放模拟（仅 `DEMO_MODE=true`）

## 6. 数据迁移与版本

- `meta.schemaVersion`：数据结构版本号
- 启动时自动执行迁移（`server/migrations.js`）
- 当前 schema version：`4`

## 7. CI

- 已提供 GitHub Actions：`.github/workflows/ci.yml`
- 触发时自动执行：`npm test` + `npm run build`

## 5. 答辩演示建议

可一键生成可复现实验数据：

```bash
npm run demo:e2e
```

脚本会自动重置数据、执行两阶段模拟、打反馈、生成标记与规则草稿、应用部分草稿，并输出 `demo-output/e2e-demo-report.json`。

## 8. 数据存储说明
目前存储为本地 JSON 文件（`server/data/store.json`），优点是部署简单，适合毕业设计演示。
当数据量增大或多实例部署时，建议接入外部数据库：
- 关系型数据库（PostgreSQL / MySQL / SQLite）：持久化与查询
- Redis：高频指标缓冲、去重窗口、通知队列

在此基础上，消息队列（Kafka/RabbitMQ）负责指标流入与削峰。

通知系统说明（本地默认）：
- 通知采用“入队 -> worker 投递 -> 失败重试”流程，重试间隔默认 `15s/60s/300s`。
- 渠道配置可选 `config.deliveryMode`：
  - `mock`：本地模拟发送（默认，适合开发/答辩）
  - `http`：真实 HTTP 投递（webhook/slack/wechat）

1. 打开系统进入总览页，说明架构和核心 KPI。
2. 打开规则引擎页，新建一条规则并执行“模拟评估”。
3. 在 API 监控页执行“立即探测”或推送一条测试指标，触发新告警。
4. 打开告警中心，将告警从 `open` 流转到 `acknowledged/resolved`。
5. 在通知渠道页执行测试发送，在设置页查看审计日志与通知记录。

## 6. 可扩展方向（毕业设计加分）

- 接入真实数据库（PostgreSQL / MySQL）
- 接入 Kafka / RabbitMQ 做异步指标流
- 增加规则表达式 DSL 与可视化编排
- 增加多租户与 RBAC 权限模型
- 增加告警去重、抑制、升级（escalation）策略

