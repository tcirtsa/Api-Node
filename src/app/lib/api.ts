/**
 * @file src/app/lib/api.ts
 * 文件作用：前端基础库文件，封装 API 客户端、轮询、格式化和类型约束。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import type {
  AlertItem,
  AlertQualityCompareReport,
  AlertQualityReport,
  AlertQualityTrendReport,
  AlertPolicy,
  AutoCreateRulesResult,
  ApiItem,
  AuditLogItem,
  ChannelItem,
  CredentialItem,
  DashboardSummary,
  MarkerCompareReport,
  MetricSample,
  NotificationRecord,
  QualityMarkerItem,
  RuleDraftItem,
  RuleDraftImpactEstimate,
  RuleItem,
  RuleTuningSuggestionsReport,
  TrendPoint,
  UserItem,
} from "./types";
/**
 * 符号：ApiMutationPayload（type）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
type ApiMutationPayload = {
  method?: ApiItem["method"];
  name?: string;
  path?: string;
  owner?: string;
  service?: string;
  environment?: "production" | "staging" | "test";
  tags?: string[];
  baseline?: Partial<ApiItem["baseline"]>;
  monitor?: {
    mode?: "push" | "pull";
    enabled?: boolean;
    source?: string;
    checkConfig?: {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      timeoutMs?: number;
      intervalSeconds?: number;
      expectedStatusCodes?: number[] | string;
      followRedirect?: boolean;
      safetyMode?: "readonly" | "dry_run" | "sandbox";
      dryRunParamKey?: string;
      dryRunParamValue?: string;
      allowInProduction?: boolean;
      credentialId?: string | null;
    };
  };
  actor?: string;
};

/**
 * 符号：API_BASE（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

/**
 * 符号：toQueryString（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
const toQueryString = (query?: Record<string, string | number | boolean | undefined | null>) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!query) return "";

  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const search = new URLSearchParams();

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const text = search.toString();
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return text ? `?${text}` : "";
};

/**
 * 符号：request（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
const request = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const parseBody = async () => {
    const raw = await response.text();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  };

  if (!response.ok) {
    const payload = await parseBody();

    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error: string }).error)
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  const payload = await parseBody();
  return (payload ?? ({} as T)) as T;
};

/**
 * 符号：apiClient（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export const apiClient = {
  health: () => request<{ ok: boolean; timestamp: string }>("/health"),
  bootstrap: () =>
    request<{
      apis: number;
      pullApis: number;
      pushApis: number;
      rules: number;
      metrics: number;
      alerts: number;
      notifications: number;
      users: number;
      credentials: number;
      alertPolicy: AlertPolicy;
      demoMode?: boolean;
      simulator: { enabled: boolean; intervalSeconds: number; lastTickAt: string | null };
    }>("/bootstrap"),

  getDashboardSummary: () => request<DashboardSummary>("/dashboard/summary"),
  getDashboardTrends: (query?: { hours?: number; bucketMinutes?: number }) =>
    request<{ series: TrendPoint[] }>(`/dashboard/trends${toQueryString(query)}`),

  listApis: (query?: {
    search?: string;
    owner?: string;
    status?: string;
    monitorMode?: "push" | "pull";
    method?: string;
    limit?: number;
    offset?: number;
  }) =>
    request<{ items: ApiItem[]; total: number }>(`/apis${toQueryString(query)}`),
  importOpenApi: (payload: {
    sourceType: "url" | "text";
    url?: string;
    text?: string;
    defaults?: {
      owner?: string;
      service?: string;
      environment?: "production" | "staging" | "test";
      tags?: string[];
      includeMethods?: ApiItem["method"][];
      intervalSeconds?: number;
      timeoutMs?: number;
      expectedStatusCodes?: number[];
      writeSafetyMode?: "readonly" | "dry_run" | "sandbox";
      allowWriteInProduction?: boolean;
      credentialId?: string;
      dryRunParamKey?: string;
      dryRunParamValue?: string;
      headers?: Record<string, string>;
      body?: string;
    };
    actor?: string;
  }) =>
    request<{ total: number; created: number; skipped: number; errors: string[]; items: ApiItem[] }>(
      "/apis/import-openapi",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
  createApi: (payload: ApiMutationPayload) =>
    request<{ item: ApiItem }>("/apis", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateApi: (apiId: string, payload: ApiMutationPayload) =>
    request<{ item: ApiItem }>(`/apis/${apiId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteApi: (apiId: string, payload?: { cascade?: boolean; actor?: string }) =>
    request<{
      item: ApiItem;
      cascade: boolean;
      removed: {
        metrics: number;
        alerts: number;
        alertIds: string[];
        ruleHits: number;
        scopedRules: number;
        scopedRuleIds: string[];
        notifications: number;
      };
    }>(`/apis/${apiId}`, {
      method: "DELETE",
      body: JSON.stringify(payload || {}),
    }),
  bulkDeleteApis: (payload: { ids: string[]; cascade?: boolean; actor?: string }) =>
    request<{
      requested: number;
      cascade: boolean;
      deletedCount: number;
      deletedIds: string[];
      notFoundIds: string[];
      conflicts: Array<{
        id: string;
        path: string | null;
        related: { metrics: number; alerts: number; ruleHits: number; scopedRules: number };
      }>;
      removedTotals: {
        metrics: number;
        alerts: number;
        ruleHits: number;
        scopedRules: number;
        notifications: number;
      };
    }>("/apis/bulk-delete", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  runApiCheckNow: (apiId: string, actor?: string) =>
    request<{
      checkResult: {
        success: boolean;
        checkedAt: string;
        statusCode: number | null;
        latencyMs: number;
        error: string | null;
        responseSnippet: string | null;
      };
      metric: MetricSample;
      createdAlerts: number;
      resolvedAlerts: number;
    }>(`/apis/${apiId}/check-now`, {
      method: "POST",
      body: JSON.stringify({ actor }),
    }),
  getApiDetail: (apiId: string) =>
    request<{
      item: ApiItem;
      metrics: MetricSample[];
      alerts: AlertItem[];
      ruleHits: Array<{
        id: string;
        ruleId: string;
        apiId: string;
        metric: string;
        aggregation: string;
        operator: string;
        threshold: number;
        value: number;
        matched: boolean;
        evaluatedAt: string;
      }>;
      rules: RuleItem[];
    }>(`/apis/${apiId}`),
  getApiMetrics: (apiId: string, query?: { limit?: number }) =>
    request<{ items: MetricSample[]; total: number }>(`/apis/${apiId}/metrics${toQueryString(query)}`),
  getApiRuleHits: (apiId: string, query?: { limit?: number }) =>
    request<{
      items: Array<{
        id: string;
        ruleId: string;
        apiId: string;
        metric: string;
        aggregation: string;
        operator: string;
        threshold: number;
        value: number;
        matched: boolean;
        evaluatedAt: string;
      }>;
      total: number;
    }>(`/apis/${apiId}/rule-hits${toQueryString(query)}`),

  ingestMetrics: (payload: Record<string, unknown> | Array<Record<string, unknown>>) =>
    request<{
      ingested: number;
      createdAlerts: number;
      resolvedAlerts: number;
      errors: string[];
    }>("/metrics", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listRules: (query?: { enabled?: boolean }) =>
    request<{ items: RuleItem[]; total: number }>(`/rules${toQueryString(query)}`),
  createRule: (payload: Partial<RuleItem> & { actor?: string }) =>
    request<{ item: RuleItem }>("/rules", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  parseRuleDsl: (payload: { dsl: string }) =>
    request<{ rule: RuleItem; warnings: string[] }>("/rules/parse-dsl", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createRuleDsl: (payload: { dsl: string; actor?: string }) =>
    request<{ item: RuleItem; warnings: string[] }>("/rules/create-dsl", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  autoCreateRules: (payload: {
    scope?: { type: "global" | "service" | "api"; value?: string };
    sensitivity?: "low" | "medium" | "high";
    days?: number;
    priority?: "P1" | "P2" | "P3";
    actions?: string[];
    actor?: string;
  }) =>
    request<AutoCreateRulesResult>("/rules/auto-create", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateRule: (ruleId: string, payload: Partial<RuleItem> & { actor?: string }) =>
    request<{ item: RuleItem }>(`/rules/${ruleId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  toggleRule: (ruleId: string, enabled: boolean, actor?: string) =>
    request<{ item: RuleItem }>(`/rules/${ruleId}/toggle`, {
      method: "POST",
      body: JSON.stringify({ enabled, actor }),
    }),
  deleteRule: (ruleId: string, actor?: string) =>
    request<{ item: RuleItem }>(`/rules/${ruleId}`, {
      method: "DELETE",
      body: JSON.stringify({ actor }),
    }),
  bulkToggleRules: (payload: { ids: string[]; enabled: boolean; actor?: string }) =>
    request<{
      requested: number;
      enabled: boolean;
      updatedCount: number;
      updatedIds: string[];
      notFoundIds: string[];
    }>("/rules/bulk-toggle", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  bulkDeleteRules: (payload: { ids: string[]; actor?: string }) =>
    request<{
      requested: number;
      deletedCount: number;
      deletedIds: string[];
      notFoundIds: string[];
    }>("/rules/bulk-delete", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  simulateRule: (ruleId: string, apiId?: string) =>
    request<{
      ruleId: string;
      generatedAt: string;
      items: Array<{
        apiId: string;
        apiPath: string;
        matched: boolean;
        evaluable: boolean;
        value: number | null;
        sampleCount: number;
        reason: string | null;
      }>;
    }>(`/rules/${ruleId}/simulate`, {
      method: "POST",
      body: JSON.stringify({ apiId }),
    }),

  listAlerts: (query?: { status?: string; level?: string; apiId?: string; limit?: number }) =>
    request<{ items: AlertItem[]; total: number }>(`/alerts${toQueryString(query)}`),
  getAlertDetail: (alertId: string) =>
    request<{ item: AlertItem; notifications: NotificationRecord[] }>(`/alerts/${alertId}`),
  updateAlertStatus: (
    alertId: string,
    payload: { status: AlertItem["status"]; actor?: string; note?: string },
  ) =>
    request<{ item: AlertItem }>(`/alerts/${alertId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  updateAlertFeedback: (
    alertId: string,
    payload: {
      label: "false_positive" | "true_positive" | "noise" | "unknown";
      note?: string;
      actor?: string;
    },
  ) =>
    request<{ item: AlertItem }>(`/alerts/${alertId}/feedback`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAlert: (alertId: string, actor?: string) =>
    request<{ item: AlertItem; removedNotifications: number }>(`/alerts/${alertId}`, {
      method: "DELETE",
      body: JSON.stringify({ actor }),
    }),
  bulkUpdateAlertStatus: (payload: {
    ids: string[];
    status: AlertItem["status"];
    note?: string;
    actor?: string;
  }) =>
    request<{
      requested: number;
      status: AlertItem["status"];
      updatedCount: number;
      updatedIds: string[];
      notFoundIds: string[];
      recoveryNotifications: number;
    }>("/alerts/bulk-status", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  bulkDeleteAlerts: (payload: { ids: string[]; actor?: string }) =>
    request<{
      requested: number;
      deletedCount: number;
      deletedIds: string[];
      notFoundIds: string[];
      removedNotifications: number;
    }>("/alerts/bulk-delete", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listChannels: () => request<{ items: ChannelItem[]; total: number }>("/channels"),
  createChannel: (payload: {
    type: string;
    name: string;
    enabled?: boolean;
    config?: Record<string, unknown>;
    actor?: string;
  }) =>
    request<{ item: ChannelItem }>("/channels", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateChannel: (
    channelId: string,
    payload: { enabled?: boolean; name?: string; config?: Record<string, unknown>; actor?: string },
  ) =>
    request<{ item: ChannelItem }>(`/channels/${channelId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  testChannel: (channelId: string, actor?: string) =>
    request<{ item: NotificationRecord }>(`/channels/${channelId}/test`, {
      method: "POST",
      body: JSON.stringify({ actor }),
    }),
  deleteChannel: (channelId: string, payload?: { force?: boolean; actor?: string }) =>
    request<{ item: ChannelItem; affectedRules: number }>(`/channels/${channelId}`, {
      method: "DELETE",
      body: JSON.stringify(payload || {}),
    }),
  bulkToggleChannels: (payload: { ids: string[]; enabled: boolean; actor?: string }) =>
    request<{
      requested: number;
      enabled: boolean;
      updatedCount: number;
      updatedIds: string[];
      notFoundIds: string[];
    }>("/channels/bulk-toggle", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  bulkDeleteChannels: (payload: { ids: string[]; force?: boolean; actor?: string }) =>
    request<{
      requested: number;
      force: boolean;
      deletedCount: number;
      deletedIds: string[];
      notFoundIds: string[];
      affectedRules: number;
      conflicts: Array<{
        id: string;
        reason: string;
        referencedByRules?: Array<{ id: string; name: string }>;
      }>;
    }>("/channels/bulk-delete", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listCredentials: () => request<{ items: CredentialItem[]; total: number }>("/credentials"),
  createCredential: (payload: {
    name: string;
    type: CredentialItem["type"];
    enabled?: boolean;
    config?: Record<string, unknown>;
    actor?: string;
  }) =>
    request<{ item: CredentialItem }>("/credentials", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCredential: (
    credentialId: string,
    payload: Partial<CredentialItem> & { config?: Record<string, unknown>; actor?: string },
  ) =>
    request<{ item: CredentialItem }>(`/credentials/${credentialId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteCredential: (credentialId: string, payload?: { force?: boolean; actor?: string }) =>
    request<{ item: CredentialItem; detachedApis: number }>(`/credentials/${credentialId}`, {
      method: "DELETE",
      body: JSON.stringify(payload || {}),
    }),
  bulkToggleCredentials: (payload: { ids: string[]; enabled: boolean; actor?: string }) =>
    request<{
      requested: number;
      enabled: boolean;
      updatedCount: number;
      updatedIds: string[];
      notFoundIds: string[];
    }>("/credentials/bulk-toggle", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  bulkDeleteCredentials: (payload: { ids: string[]; force?: boolean; actor?: string }) =>
    request<{
      requested: number;
      force: boolean;
      deletedCount: number;
      deletedIds: string[];
      notFoundIds: string[];
      detachedApis: number;
      conflicts: Array<{
        id: string;
        reason: string;
        referencedByApis?: Array<{ id: string; name: string; path: string }>;
      }>;
    }>("/credentials/bulk-delete", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyCredential: (credentialId: string) =>
    request<{ ok: boolean; error?: string }>(`/credentials/${credentialId}/verify`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  getCredentialEnvTemplate: () =>
    request<{
      prefix: string;
      totalRefs: number;
      missingRefs: string[];
      lines: string[];
      example: string;
    }>("/credentials/env-template"),
  getAlertQualityReport: (query?: { days?: number; service?: string; apiId?: string; ruleId?: string }) =>
    request<AlertQualityReport>(`/reports/alert-quality${toQueryString(query)}`),
  getAlertQualityTrend: (query?: {
    days?: number;
    bucketDays?: number;
    service?: string;
    apiId?: string;
    ruleId?: string;
  }) => request<AlertQualityTrendReport>(`/reports/alert-quality-trend${toQueryString(query)}`),
  getAlertQualityCompare: (query?: { days?: number; service?: string; apiId?: string; ruleId?: string }) =>
    request<AlertQualityCompareReport>(`/reports/alert-quality-compare${toQueryString(query)}`),
  getRuleTuningSuggestions: (query?: { days?: number; service?: string; apiId?: string; ruleId?: string }) =>
    request<RuleTuningSuggestionsReport>(`/reports/rule-tuning-suggestions${toQueryString(query)}`),
  getAlertQualityConclusion: (query?: { days?: number; service?: string; apiId?: string; ruleId?: string }) =>
    request<{
      generatedAt: string;
      filters: { service: string | null; apiId: string | null; ruleId: string | null };
      days: number;
      text: string;
      compare: AlertQualityCompareReport;
    }>(`/reports/alert-quality-conclusion${toQueryString(query)}`),
  listQualityMarkers: () => request<{ items: QualityMarkerItem[]; total: number }>("/reports/markers"),
  createQualityMarker: (payload: { name: string; note?: string; actor?: string }) =>
    request<{ item: QualityMarkerItem }>("/reports/markers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteQualityMarker: (markerId: string, actor?: string) =>
    request<{ item: QualityMarkerItem }>(`/reports/markers/${markerId}`, {
      method: "DELETE",
      body: JSON.stringify({ actor }),
    }),
  getAlertQualityMarkerCompare: (query: {
    markerId: string;
    daysBefore?: number;
    daysAfter?: number;
    service?: string;
    apiId?: string;
    ruleId?: string;
  }) => request<MarkerCompareReport>(`/reports/alert-quality-marker-compare${toQueryString(query)}`),
  listRuleDrafts: () => request<{ items: RuleDraftItem[]; total: number }>("/rule-drafts"),
  getRuleDraftImpactEstimate: (
    draftId: string,
    query?: { days?: number; service?: string; apiId?: string },
  ) => request<RuleDraftImpactEstimate>(`/rule-drafts/${draftId}/impact-estimate${toQueryString(query)}`),
  createRuleDraftsFromSuggestions: (payload?: {
    days?: number;
    service?: string;
    apiId?: string;
    ruleId?: string;
    actor?: string;
  }) =>
    request<{ items: RuleDraftItem[]; total: number }>("/reports/rule-drafts/from-suggestions", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    }),
  applyRuleDraft: (draftId: string, actor?: string) =>
    request<{ rule: RuleItem; draft: RuleDraftItem }>(`/rule-drafts/${draftId}/apply`, {
      method: "POST",
      body: JSON.stringify({ actor }),
    }),
  deleteRuleDraft: (draftId: string, actor?: string) =>
    request<{ item: RuleDraftItem }>(`/rule-drafts/${draftId}`, {
      method: "DELETE",
      body: JSON.stringify({ actor }),
    }),

  getSettingsOverview: (query?: { auditLimit?: number; notificationLimit?: number }) =>
    request<{
      users: { items: UserItem[]; total: number };
      auditLogs: { items: AuditLogItem[] };
      notifications: { items: NotificationRecord[] };
      credentials: { items: CredentialItem[]; total: number };
      alertPolicy: { item: AlertPolicy };
    }>(`/settings/overview${toQueryString(query)}`),
  dispatchNotificationsNow: (limit?: number) =>
    request<{ processed: number; sent: number; failed: number; retried: number; queued: number }>(
      "/notifications/dispatch-now",
      {
        method: "POST",
        body: JSON.stringify({ limit }),
      },
    ),
  deleteNotification: (notificationId: string, actor?: string) =>
    request<{ item: NotificationRecord }>(`/notifications/${notificationId}`, {
      method: "DELETE",
      body: JSON.stringify({ actor }),
    }),
  bulkDeleteNotifications: (payload: { ids: string[]; actor?: string }) =>
    request<{
      requested: number;
      deletedCount: number;
      deletedIds: string[];
      notFoundIds: string[];
    }>("/notifications/bulk-delete", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAlertPolicy: () => request<{ item: AlertPolicy }>("/alert-policy"),
  updateAlertPolicy: (payload: Partial<AlertPolicy> & { actor?: string }) =>
    request<{ item: AlertPolicy }>("/alert-policy", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  demoReset: () => request<{ ok: boolean; updatedAt: string }>("/demo/reset", { method: "POST" }),
  demoTick: () =>
    request<{ timestamp: string; metricsIngested: number; createdAlerts: number; resolvedAlerts: number }>(
      "/demo/tick",
      { method: "POST" },
    ),
  demoSimulate: (payload?: {
    minutes?: number;
    stepSeconds?: number;
    actor?: string;
    seed?: string | number;
    startTime?: string;
  }) =>
    request<{
      minutes: number;
      stepSeconds: number;
      ticks: number;
      metricsIngested: number;
      createdAlerts: number;
      resolvedAlerts: number;
    }>("/demo/simulate", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    }),
};






