/**
 * @file server/default-data.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import { minutesAgoIso, nowIso, round, uid } from "./utils.js";
import { createPushMonitor } from "./pull-monitor.js";
import { createDefaultAlertNoiseState, createDefaultAlertPolicy } from "./alert-policy.js";

/**
 * 符号：DEFAULT_USERS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const DEFAULT_USERS = [
  {
    id: "user_admin",
    name: "Admin",
    email: "admin@example.com",
    role: "admin",
    status: "active",
    lastLoginAt: minutesAgoIso(15),
  },
  {
    id: "user_ops_1",
    name: "Ops One",
    email: "ops@example.com",
    role: "ops",
    status: "active",
    lastLoginAt: minutesAgoIso(48),
  },
  {
    id: "user_dev_1",
    name: "Dev One",
    email: "dev@example.com",
    role: "developer",
    status: "active",
    lastLoginAt: minutesAgoIso(180),
  },
];

/**
 * 符号：DEFAULT_APIS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const DEFAULT_APIS = [
  {
    id: "api_payment_process",
    method: "POST",
    name: "Payment Process",
    path: "/api/payment/process",
    owner: "Payment Team",
    service: "payment",
    tags: ["core", "money"],
    baseline: { qps: 1200, errorRate: 0.7, latencyP95: 220, latencyP99: 360, availability: 99.95 },
  },
  {
    id: "api_user_login",
    method: "POST",
    name: "User Login",
    path: "/api/user/login",
    owner: "Identity Team",
    service: "user",
    tags: ["auth", "critical"],
    baseline: { qps: 3400, errorRate: 1.3, latencyP95: 410, latencyP99: 620, availability: 99.8 },
  },
  {
    id: "api_order_create",
    method: "POST",
    name: "Order Create",
    path: "/api/order/create",
    owner: "Order Team",
    service: "order",
    tags: ["core"],
    baseline: { qps: 980, errorRate: 0.9, latencyP95: 280, latencyP99: 430, availability: 99.9 },
  },
  {
    id: "api_search_query",
    method: "GET",
    name: "Search Query",
    path: "/api/search/query",
    owner: "Search Team",
    service: "search",
    tags: ["read-heavy"],
    baseline: { qps: 5600, errorRate: 0.6, latencyP95: 180, latencyP99: 260, availability: 99.97 },
  },
  {
    id: "api_inventory_check",
    method: "GET",
    name: "Inventory Check",
    path: "/api/inventory/check",
    owner: "Inventory Team",
    service: "inventory",
    tags: ["stock"],
    baseline: { qps: 2100, errorRate: 0.8, latencyP95: 260, latencyP99: 390, availability: 99.88 },
  },
  {
    id: "api_product_detail",
    method: "GET",
    name: "Product Detail",
    path: "/api/product/detail",
    owner: "Product Team",
    service: "catalog",
    tags: ["read-heavy"],
    baseline: { qps: 1700, errorRate: 0.7, latencyP95: 230, latencyP99: 350, availability: 99.92 },
  },
];

/**
 * 符号：DEFAULT_RULES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const DEFAULT_RULES = [
  {
    id: "rule_error_rate_high",
    ruleType: "threshold",
    name: "High Error Rate",
    description: "Trigger when average error rate is too high.",
    enabled: true,
    priority: "P1",
    scope: { type: "global" },
    metric: "errorRate",
    operator: ">",
    threshold: 5,
    aggregation: "avg",
    windowMinutes: 5,
    minSamples: 2,
    cooldownMinutes: 10,
    actions: ["email", "webhook", "slack"],
    createdAt: minutesAgoIso(4_320),
    updatedAt: minutesAgoIso(120),
    lastTriggeredByApi: {},
  },
  {
    id: "rule_latency_p95_high",
    ruleType: "threshold",
    name: "P95 Latency Too High",
    description: "Trigger when P95 latency is high in a 5 minute window.",
    enabled: true,
    priority: "P2",
    scope: { type: "global" },
    metric: "latencyP95",
    operator: ">",
    threshold: 800,
    aggregation: "max",
    windowMinutes: 5,
    minSamples: 2,
    cooldownMinutes: 15,
    actions: ["email", "slack"],
    createdAt: minutesAgoIso(4_100),
    updatedAt: minutesAgoIso(200),
    lastTriggeredByApi: {},
  },
  {
    id: "rule_availability_low",
    ruleType: "threshold",
    name: "Availability Drop",
    description: "Trigger when latest availability drops below threshold.",
    enabled: true,
    priority: "P1",
    scope: { type: "global" },
    metric: "availability",
    operator: "<",
    threshold: 99,
    aggregation: "latest",
    windowMinutes: 3,
    minSamples: 1,
    cooldownMinutes: 8,
    actions: ["email", "webhook"],
    createdAt: minutesAgoIso(3_500),
    updatedAt: minutesAgoIso(140),
    lastTriggeredByApi: {},
  },
  {
    id: "rule_search_qps_spike",
    ruleType: "threshold",
    name: "Search QPS Spike",
    description: "Trigger when search traffic spikes unexpectedly.",
    enabled: true,
    priority: "P3",
    scope: { type: "service", value: "search" },
    metric: "qps",
    operator: ">",
    threshold: 7_500,
    aggregation: "max",
    windowMinutes: 5,
    minSamples: 2,
    cooldownMinutes: 20,
    actions: ["slack"],
    createdAt: minutesAgoIso(2_900),
    updatedAt: minutesAgoIso(220),
    lastTriggeredByApi: {},
  },
  {
    id: "rule_payment_failure_burst",
    ruleType: "threshold",
    name: "Payment Failure Burst",
    description: "Trigger when payment failures surge.",
    enabled: true,
    priority: "P1",
    scope: { type: "service", value: "payment" },
    metric: "statusCode5xx",
    operator: ">",
    threshold: 120,
    aggregation: "max",
    windowMinutes: 3,
    minSamples: 1,
    cooldownMinutes: 8,
    actions: ["email", "webhook", "sms"],
    createdAt: minutesAgoIso(2_200),
    updatedAt: minutesAgoIso(60),
    lastTriggeredByApi: {},
  },
  {
    id: "rule_consecutive_failures",
    ruleType: "consecutive_failures",
    name: "Consecutive Failure Detection",
    description: "Trigger when errorRate stays above threshold for N consecutive samples.",
    enabled: true,
    priority: "P1",
    scope: { type: "global" },
    metric: "errorRate",
    operator: ">",
    threshold: 20,
    failureCount: 3,
    windowMinutes: 10,
    minSamples: 3,
    cooldownMinutes: 10,
    actions: ["email", "webhook", "slack"],
    createdAt: minutesAgoIso(1_800),
    updatedAt: minutesAgoIso(50),
    lastTriggeredByApi: {},
  },
  {
    id: "rule_missing_data",
    ruleType: "missing_data",
    name: "Missing Data Detection",
    description: "Trigger when no metrics are ingested within window.",
    enabled: true,
    priority: "P2",
    scope: { type: "global" },
    metric: "qps",
    operator: ">",
    threshold: 0,
    aggregation: "latest",
    windowMinutes: 5,
    minSamples: 1,
    cooldownMinutes: 5,
    actions: ["email", "slack"],
    createdAt: minutesAgoIso(1_700),
    updatedAt: minutesAgoIso(45),
    lastTriggeredByApi: {},
  },
  {
    id: "rule_slo_burn_rate",
    ruleType: "burn_rate",
    name: "SLO Burn Rate",
    description: "Trigger when short + long window burn rates exceed threshold.",
    enabled: true,
    priority: "P1",
    scope: { type: "global" },
    metric: "errorRate",
    operator: ">",
    threshold: 2,
    aggregation: "avg",
    shortWindowMinutes: 5,
    longWindowMinutes: 60,
    burnRateThreshold: 2,
    sloTarget: 99.9,
    windowMinutes: 60,
    minSamples: 2,
    cooldownMinutes: 15,
    actions: ["email", "webhook"],
    createdAt: minutesAgoIso(1_600),
    updatedAt: minutesAgoIso(40),
    lastTriggeredByApi: {},
  },
];

/**
 * 符号：DEFAULT_CHANNELS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const DEFAULT_CHANNELS = [
  {
    id: "channel_email",
    type: "email",
    name: "Email",
    enabled: true,
    config: {
      from: "alerts@example.com",
      recipients: ["admin@example.com", "ops@example.com"],
      smtpHost: "smtp.example.com",
      smtpPort: 587,
    },
  },
  {
    id: "channel_webhook",
    type: "webhook",
    name: "Webhook",
    enabled: true,
    config: {
      url: "https://hooks.example.com/alert",
      method: "POST",
      timeout: 10,
    },
  },
  {
    id: "channel_slack",
    type: "slack",
    name: "Slack",
    enabled: true,
    config: {
      webhookUrl: "https://hooks.slack.com/services/EXAMPLE",
      channel: "#api-alert",
    },
  },
  {
    id: "channel_sms",
    type: "sms",
    name: "SMS",
    enabled: false,
    config: {
      provider: "mock-provider",
      recipients: ["+10000000000"],
    },
  },
  {
    id: "channel_wechat",
    type: "wechat",
    name: "WeCom",
    enabled: false,
    config: {
      webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=EXAMPLE",
    },
  },
];

/**
 * 符号：INITIAL_ALERTS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const INITIAL_ALERTS = [
  {
    id: "alert_seed_open_payment",
    ruleId: "rule_error_rate_high",
    apiId: "api_payment_process",
    level: "P1",
    title: "High Error Rate",
    message: "Average errorRate is 8.24 > 5",
    status: "open",
    metric: "errorRate",
    operator: ">",
    threshold: 5,
    observedValue: 8.24,
    aggregation: "avg",
    windowMinutes: 5,
    source: "seed",
    triggeredAt: minutesAgoIso(8),
    updatedAt: minutesAgoIso(5),
    resolvedAt: null,
    acknowledgedBy: null,
    events: [
      {
        id: uid("event"),
        type: "created",
        by: "system",
        note: "Seed alert for demo data.",
        at: minutesAgoIso(8),
      },
    ],
    notifications: [],
  },
  {
    id: "alert_seed_ack_login",
    ruleId: "rule_latency_p95_high",
    apiId: "api_user_login",
    level: "P2",
    title: "P95 Latency Too High",
    message: "Max latencyP95 is 910 > 800",
    status: "acknowledged",
    metric: "latencyP95",
    operator: ">",
    threshold: 800,
    observedValue: 910,
    aggregation: "max",
    windowMinutes: 5,
    source: "seed",
    triggeredAt: minutesAgoIso(22),
    updatedAt: minutesAgoIso(15),
    resolvedAt: null,
    acknowledgedBy: "Ops One",
    events: [
      {
        id: uid("event"),
        type: "created",
        by: "system",
        note: "Seed alert for demo data.",
        at: minutesAgoIso(22),
      },
      {
        id: uid("event"),
        type: "status_change",
        by: "Ops One",
        note: "Investigating application latency.",
        at: minutesAgoIso(15),
      },
    ],
    notifications: [],
  },
  {
    id: "alert_seed_resolved_search",
    ruleId: "rule_search_qps_spike",
    apiId: "api_search_query",
    level: "P3",
    title: "Search QPS Spike",
    message: "Max qps is 8020 > 7500",
    status: "resolved",
    metric: "qps",
    operator: ">",
    threshold: 7500,
    observedValue: 8020,
    aggregation: "max",
    windowMinutes: 5,
    source: "seed",
    triggeredAt: minutesAgoIso(140),
    updatedAt: minutesAgoIso(118),
    resolvedAt: minutesAgoIso(118),
    acknowledgedBy: "system",
    events: [
      {
        id: uid("event"),
        type: "created",
        by: "system",
        note: "Traffic burst detected.",
        at: minutesAgoIso(140),
      },
      {
        id: uid("event"),
        type: "auto_resolved",
        by: "system",
        note: "Traffic returned to baseline.",
        at: minutesAgoIso(118),
      },
    ],
    notifications: [],
  },
];

/**
 * 符号：INITIAL_RULE_HITS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const INITIAL_RULE_HITS = [
  {
    id: uid("hit"),
    ruleId: "rule_error_rate_high",
    apiId: "api_payment_process",
    metric: "errorRate",
    aggregation: "avg",
    operator: ">",
    threshold: 5,
    value: 8.24,
    matched: true,
    evaluatedAt: minutesAgoIso(8),
  },
  {
    id: uid("hit"),
    ruleId: "rule_latency_p95_high",
    apiId: "api_user_login",
    metric: "latencyP95",
    aggregation: "max",
    operator: ">",
    threshold: 800,
    value: 910,
    matched: true,
    evaluatedAt: minutesAgoIso(22),
  },
  {
    id: uid("hit"),
    ruleId: "rule_search_qps_spike",
    apiId: "api_search_query",
    metric: "qps",
    aggregation: "max",
    operator: ">",
    threshold: 7500,
    value: 8020,
    matched: true,
    evaluatedAt: minutesAgoIso(140),
  },
];

/**
 * 符号：INITIAL_AUDIT_LOGS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const INITIAL_AUDIT_LOGS = [
  {
    id: uid("audit"),
    user: "system",
    action: "bootstrap",
    target: "default-data",
    detail: "Initialized default demo dataset.",
    timestamp: minutesAgoIso(2),
  },
  {
    id: uid("audit"),
    user: "Ops One",
    action: "alert_acknowledged",
    target: "alert_seed_ack_login",
    detail: "Latency issue acknowledged.",
    timestamp: minutesAgoIso(15),
  },
];

/**
 * 符号：METRIC_HISTORY_HOURS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const METRIC_HISTORY_HOURS = 12;
/**
 * 符号：METRIC_INTERVAL_MINUTES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const METRIC_INTERVAL_MINUTES = 5;

/**
 * 符号：hashSeed（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const hashSeed = (text) =>
  text.split("").reduce((total, current, index) => total + current.charCodeAt(0) * (index + 1), 0);

/**
 * 符号：buildMetricPoint（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildMetricPoint = (api, minuteAgo, index) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const seed = hashSeed(api.id);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const phase = (minuteAgo + seed) / 21;
  const loadWave = Math.sin(phase) * 0.18 + Math.cos(phase / 2) * 0.07;
  const jitter = Math.sin((index + seed) / 5) * 0.05;

  let qps = api.baseline.qps * (1 + loadWave + jitter);
  let errorRate = api.baseline.errorRate * (1 + Math.abs(jitter) * 2.2);
  let latencyP95 = api.baseline.latencyP95 * (1 + Math.abs(loadWave) * 0.75);
  let latencyP99 = api.baseline.latencyP99 * (1 + Math.abs(loadWave) * 0.85);
  let availability = api.baseline.availability - Math.abs(jitter) * 0.2;

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (api.service === "payment" && minuteAgo <= 30) {
    errorRate += 6.4;
    latencyP95 += 240;
    latencyP99 += 320;
    availability -= 1.8;
    qps *= 0.9;
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (api.service === "user" && minuteAgo >= 25 && minuteAgo <= 70) {
    latencyP95 += 380;
    latencyP99 += 460;
    errorRate += 1.3;
    availability -= 0.5;
  }

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (api.service === "search" && minuteAgo >= 10 && minuteAgo <= 45) {
    qps *= 1.45;
    latencyP95 += 80;
    latencyP99 += 120;
  }

  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (api.service === "inventory" && minuteAgo <= 20) {
    errorRate += 2.3;
    availability -= 1.4;
  }

  qps = round(Math.max(qps, 1), 0);
  errorRate = round(Math.max(errorRate, 0), 3);
  latencyP95 = round(Math.max(latencyP95, 1), 0);
  latencyP99 = round(Math.max(latencyP99, latencyP95 + 30), 0);
  availability = round(Math.min(Math.max(availability, 90), 100), 3);

  // 步骤 6：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    id: uid("metric"),
    apiId: api.id,
    timestamp: minutesAgoIso(minuteAgo),
    qps,
    errorRate,
    latencyP95,
    latencyP99,
    availability,
    statusCode5xx: round((qps * errorRate) / 1000, 0),
  };
};

/**
 * 符号：generateInitialMetrics（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const generateInitialMetrics = (apis) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const points = [];
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const totalMinutes = METRIC_HISTORY_HOURS * 60;
  let index = 0;

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (let minuteAgo = totalMinutes; minuteAgo >= 0; minuteAgo -= METRIC_INTERVAL_MINUTES) {
    for (const api of apis) {
      points.push(buildMetricPoint(api, minuteAgo, index));
      index += 1;
    }
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

/**
 * 符号：createDefaultState（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const createDefaultState = () => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const createdAt = nowIso();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const apis = DEFAULT_APIS.map((api) => ({
    ...api,
    environment: "production",
    monitor: createPushMonitor({
      source: "simulator",
    }),
    status: "healthy",
    createdAt: minutesAgoIso(5_000),
    updatedAt: createdAt,
  }));

  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    meta: {
      version: 1,
      schemaVersion: 4,
      createdAt,
      updatedAt: createdAt,
    },
    users: DEFAULT_USERS,
    apis,
    rules: DEFAULT_RULES,
    metrics: generateInitialMetrics(apis),
    alerts: INITIAL_ALERTS,
    ruleHits: INITIAL_RULE_HITS,
    channels: DEFAULT_CHANNELS,
    credentials: [],
    ruleDrafts: [],
    qualityMarkers: [],
    notifications: [],
    alertPolicy: createDefaultAlertPolicy(),
    alertNoiseState: createDefaultAlertNoiseState(),
    auditLogs: INITIAL_AUDIT_LOGS,
    simulator: {
      enabled: true,
      intervalSeconds: 15,
      lastTickAt: null,
    },
  };
};







