/**
 * @file src/app/lib/types.ts
 * 文件作用：前端基础库文件，封装 API 客户端、轮询、格式化和类型约束。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿/**
﻿ * 符号：ApiStatus（type）
﻿ * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
﻿ * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
﻿ * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
﻿ * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
﻿ */
﻿export type ApiStatus = "healthy" | "warning" | "critical" | "unknown";

/**
 * 符号：MetricSample（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface MetricSample {
  id: string;
  apiId: string;
  timestamp: string;
  qps: number;
  errorRate: number;
  latencyP95: number;
  latencyP99: number;
  availability: number;
  statusCode5xx: number;
}

/**
 * 符号：ApiMonitorInfo（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface ApiMonitorInfo {
  mode: "push" | "pull";
  enabled: boolean;
  source: string;
  checkConfig: null | {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
    timeoutMs: number;
    intervalSeconds: number;
    expectedStatusCodes: number[];
    followRedirect: boolean;
    safetyMode: "readonly" | "dry_run" | "sandbox";
    dryRunParamKey: string;
    dryRunParamValue: string;
    allowInProduction: boolean;
    credentialId?: string | null;
  };
  lastCheckedAt: string | null;
  lastStatusCode: number | null;
  lastLatencyMs: number | null;
  lastError: string | null;
  lastSuccess: boolean | null;
  lastResponseSnippet: string | null;
}

/**
 * 符号：ApiItem（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface ApiItem {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  name: string;
  path: string;
  owner: string;
  service: string;
  environment: "production" | "staging" | "test";
  tags: string[];
  status: ApiStatus;
  activeAlertCount: number;
  highestAlertLevel: "P1" | "P2" | "P3" | null;
  latestMetrics: MetricSample | null;
  monitor: ApiMonitorInfo;
  baseline: {
    qps: number;
    errorRate: number;
    latencyP95: number;
    latencyP99: number;
    availability: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * 符号：RuleScope（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface RuleScope {
  type: "global" | "service" | "api";
  value?: string;
}

/**
 * 符号：RuleCondition（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface RuleCondition {
  metric: "qps" | "errorRate" | "latencyP95" | "latencyP99" | "availability" | "statusCode5xx";
  operator: ">" | ">=" | "<" | "<=" | "==" | "!=";
  threshold: number;
  aggregation?: "avg" | "max" | "min" | "latest";
  windowMinutes?: number;
  minSamples?: number;
}

/**
 * 符号：RuleItem（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface RuleItem {
  id: string;
  ruleType?: "threshold" | "consecutive_failures" | "missing_data" | "burn_rate";
  name: string;
  description: string;
  enabled: boolean;
  priority: "P1" | "P2" | "P3";
  scope: RuleScope;
  metric: "qps" | "errorRate" | "latencyP95" | "latencyP99" | "availability" | "statusCode5xx";
  operator: ">" | ">=" | "<" | "<=" | "==" | "!=";
  threshold: number;
  aggregation: "avg" | "max" | "min" | "latest";
  windowMinutes: number;
  minSamples: number;
  failureCount?: number;
  shortWindowMinutes?: number;
  longWindowMinutes?: number;
  burnRateThreshold?: number;
  sloTarget?: number;
  cooldownMinutes: number;
  conditions?: RuleCondition[];
  conditionLogic?: "all" | "any";
  actions: string[];
  activeAlertCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 符号：AlertItem（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface AlertItem {
  id: string;
  ruleId: string;
  ruleName?: string;
  apiId: string;
  apiName?: string;
  apiPath?: string;
  level: "P1" | "P2" | "P3";
  title: string;
  message: string;
  status: "open" | "acknowledged" | "resolved" | "closed";
  metric: string;
  operator: string;
  threshold: number;
  observedValue: number;
  aggregation: string;
  windowMinutes: number;
  source: string;
  triggeredAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  acknowledgedBy: string | null;
  events: Array<{
    id: string;
    type: string;
    by: string;
    note: string;
    at: string;
  }>;
  feedback?: {
    label: "false_positive" | "true_positive" | "noise" | "unknown";
    note: string;
    by: string;
    at: string;
  } | null;
}

/**
 * 符号：NotificationRecord（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface NotificationRecord {
  id: string;
  alertId: string | null;
  ruleId: string | null;
  apiId: string | null;
  channelType: string;
  channelId: string | null;
  status: string;
  response: string;
  eventType?: "trigger" | "recovery" | "test" | string;
  attempts?: number;
  maxAttempts?: number;
  nextRetryAt?: string | null;
  lastAttemptAt?: string | null;
  sentAt?: string | null;
  lastError?: string | null;
  lastLatencyMs?: number | null;
  deliveryMode?: "mock" | "http" | string;
  createdAt: string;
  payload: Record<string, unknown>;
}

/**
 * 符号：AlertPolicy（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface AlertPolicy {
  enabled: boolean;
  dedupWindowSeconds: number;
  suppressWindowSeconds: number;
  flapWindowMinutes: number;
  flapThreshold: number;
  autoSilenceMinutes: number;
  sendRecovery: boolean;
  escalationEnabled?: boolean;
  escalateRequiresPrimary?: boolean;
  escalations?: Array<{
    level: string;
    afterMinutes: number;
    repeatMinutes: number;
    actions: string[];
  }>;
}

/**
 * 符号：ChannelItem（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface ChannelItem {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * 符号：CredentialItem（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface CredentialItem {
  id: string;
  name: string;
  type: "bearer" | "api_key" | "basic" | "custom";
  enabled: boolean;
  config: Record<string, unknown>;
  secretStatus?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * 符号：AuditLogItem（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface AuditLogItem {
  id: string;
  user: string;
  action: string;
  target: string;
  detail: string;
  timestamp: string;
}

/**
 * 符号：UserItem（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string;
}

/**
 * 符号：DashboardSummary（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface DashboardSummary {
  meta: {
    generatedAt: string;
  };
  kpis: {
    apiTotal: number;
    apiCritical: number;
    apiWarning: number;
    ruleTotal: number;
    ruleEnabled: number;
    alertActive: number;
    alertP1Active: number;
    notificationsToday: number;
  };
  runtime: {
    qpsAvg: number;
    errorRateAvg: number;
    latencyP95Avg: number;
    availabilityAvg: number;
  };
  topRiskApis: ApiItem[];
  recentAlerts: AlertItem[];
}

/**
 * 符号：AlertQualityReport（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface AlertQualityReport {
  generatedAt: string;
  windowDays: number;
  filters: {
    service: string | null;
    apiId: string | null;
    ruleId: string | null;
  };
  totals: {
    alerts: number;
    resolvedAlerts: number;
    activeAlerts: number;
    notifications: number;
    sentNotifications: number;
    failedNotifications: number;
    recoveryNotifications: number;
    feedbackFalsePositive: number;
    feedbackTruePositive: number;
    feedbackNoise: number;
  };
  quality: {
    duplicateBurstCount: number;
    flappingFingerprintCount: number;
    mttrMinutes: number | null;
    notificationFailureRate: number;
    duplicateRate: number;
    falsePositiveRate: number;
  };
  topNoisyRules: Array<{
    ruleId: string;
    ruleName?: string;
    count: number;
  }>;
}

/**
 * 符号：AlertQualityTrendReport（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface AlertQualityTrendReport {
  generatedAt: string;
  days: number;
  bucketDays: number;
  filters: {
    service: string | null;
    apiId: string | null;
    ruleId: string | null;
  };
  series: Array<{
    bucketEnd: string;
    alerts: number;
    duplicateRate: number;
    falsePositiveRate: number;
    notificationFailureRate: number;
  }>;
}

/**
 * 符号：AlertQualityCompareReport（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface AlertQualityCompareReport {
  generatedAt: string;
  days: number;
  filters: {
    service: string | null;
    apiId: string | null;
    ruleId: string | null;
  };
  current: AlertQualityReport;
  previous: AlertQualityReport;
  delta: {
    alerts: number;
    duplicateRate: number;
    falsePositiveRate: number;
    notificationFailureRate: number;
    mttrMinutes: number;
  };
}

/**
 * 符号：RuleTuningSuggestionsReport（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface RuleTuningSuggestionsReport {
  generatedAt: string;
  filters: {
    service: string | null;
    apiId: string | null;
    ruleId: string | null;
  };
  suggestions: Array<{
    ruleId: string;
    ruleName: string;
    severity: "high" | "medium";
    observed: {
      totalAlerts: number;
      falsePositiveCount: number;
      noiseCount: number;
    };
    recommendation: {
      increaseMinSamplesTo: number;
      increaseWindowMinutesTo: number;
      increaseCooldownMinutesTo: number;
    };
  }>;
}

/**
 * 符号：AutoCreateRulesResult（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface AutoCreateRulesResult {
  generatedAt: string;
  scope: {
    type: "global" | "service" | "api";
    value?: string;
  };
  sensitivity: string;
  created: RuleItem[];
  skipped: Array<{
    metric: string;
    reason: string;
  }>;
  total: number;
  basis: {
    scopedApis: number;
    scopedMetrics: number;
  };
}

/**
 * 符号：QualityMarkerItem（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface QualityMarkerItem {
  id: string;
  name: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

/**
 * 符号：MarkerCompareReport（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface MarkerCompareReport {
  generatedAt: string;
  marker: QualityMarkerItem;
  before: AlertQualityReport;
  after: AlertQualityReport;
  delta: {
    alerts: number;
    duplicateRate: number;
    falsePositiveRate: number;
    notificationFailureRate: number;
    mttrMinutes: number;
  };
}

/**
 * 符号：RuleDraftItem（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface RuleDraftItem {
  id: string;
  ruleId: string;
  ruleName: string;
  patch: {
    minSamples: number;
    windowMinutes: number;
    cooldownMinutes: number;
  };
  createdBy: string;
  createdAt: string;
  status: "draft" | "applied";
  appliedAt?: string;
  appliedBy?: string;
}

/**
 * 符号：RuleDraftImpactEstimate（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface RuleDraftImpactEstimate {
  generatedAt: string;
  days: number;
  filters: {
    service: string | null;
    apiId: string | null;
    ruleId: string;
  };
  draftId: string;
  ruleId: string;
  ruleName: string;
  sampleCount: number;
  confidence: "high" | "medium" | "low";
  assumptions: {
    model: string;
    effectWeights: {
      duplicateRate: {
        minSamples: number;
        windowMinutes: number;
        cooldownMinutes: number;
      };
      falsePositiveRate: {
        minSamples: number;
        windowMinutes: number;
        cooldownMinutes: number;
      };
    };
  };
  explanation: {
    normalizedDelta: {
      minSamples: number;
      windowMinutes: number;
      cooldownMinutes: number;
    };
    contributions: {
      duplicateRate: {
        minSamples: number;
        windowMinutes: number;
        cooldownMinutes: number;
      };
      falsePositiveRate: {
        minSamples: number;
        windowMinutes: number;
        cooldownMinutes: number;
      };
    };
  };
  current: {
    duplicateRate: number;
    falsePositiveRate: number;
    minSamples: number;
    windowMinutes: number;
    cooldownMinutes: number;
  };
  draft: {
    minSamples: number;
    windowMinutes: number;
    cooldownMinutes: number;
  };
  estimated: {
    duplicateRate: number;
    falsePositiveRate: number;
  };
  delta: {
    duplicateRate: number;
    falsePositiveRate: number;
  };
}

/**
 * 符号：TrendPoint（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export interface TrendPoint {
  timestamp: string;
  qps: number;
  errorRate: number;
  latencyP95: number;
  availability: number;
  alerts: number;
}


