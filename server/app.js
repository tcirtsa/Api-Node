/**
 * @file server/app.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import {
  dispatchAlertNotifications,
  dispatchAlertRecoveryNotifications,
  dispatchChannelTest,
  processNotificationQueueTick,
} from "./notifications.js";
import { normalizeAlertPolicy } from "./alert-policy.js";
import { enqueueMetrics } from "./metric-queue.js";
import { ingestMetricsBatch } from "./metric-ingest.js";
import { parseRuleDsl } from "./rule-dsl.js";
import {
  computeApiStatus,
  getActiveAlertCountByApi,
  getHighestActiveAlertLevelByApi,
  getLatestMetricForApi,
  ingestMetric,
  previewRuleEvaluation,
  refreshAllApiStatuses,
  runRuleEvaluationSweep,
} from "./rule-engine.js";
import { mutateState, resetState, getState } from "./store.js";
import { createSeededRandom, runHistoricalSimulation, runSimulationTick } from "./simulator.js";
import { avg, nowIso, round, safeSortByTimeDesc, toNumber, uid } from "./utils.js";
import {
  applyCheckResultToApi,
  buildMetricFromPullCheck,
  createPushMonitor,
  normalizeMonitorConfig,
  runHttpCheck,
} from "./pull-monitor.js";
import {
  buildOpenApiImportPreview,
  createApiFromOpenApiRecord,
  parseOpenApiDocument,
} from "./openapi-import.js";
import {
  collectCredentialSecretRefs,
  getSecretEnvName,
  getSecretPrefix,
  resolveCredentialSecrets,
  resolveSecretRefStatus,
  sanitizeCredentialConfigForStorage,
  validateCredentialConfig,
} from "./credential-secrets.js";

/**
 * 符号：MAX_AUDIT_LOGS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const MAX_AUDIT_LOGS = 3_000;
/**
 * 符号：ROUTE_CACHE_TTL_MS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const ROUTE_CACHE_TTL_MS = 3_000;
/**
 * 符号：ROUTE_CACHE_MAX_KEYS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const ROUTE_CACHE_MAX_KEYS = 300;
/**
 * 符号：ALERT_STATUS_VALUES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const ALERT_STATUS_VALUES = ["open", "acknowledged", "resolved", "closed"];
/**
 * 符号：ALERT_FEEDBACK_VALUES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const ALERT_FEEDBACK_VALUES = ["false_positive", "true_positive", "noise", "unknown"];
/**
 * 符号：RULE_PRIORITY_VALUES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const RULE_PRIORITY_VALUES = ["P1", "P2", "P3"];
/**
 * 符号：RULE_OPERATOR_VALUES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const RULE_OPERATOR_VALUES = [">", ">=", "<", "<=", "==", "!="];
/**
 * 符号：RULE_TYPE_VALUES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const RULE_TYPE_VALUES = ["threshold", "consecutive_failures", "missing_data", "burn_rate"];
/**
 * 符号：RULE_CONDITION_LOGIC_VALUES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const RULE_CONDITION_LOGIC_VALUES = ["all", "any"];
/**
 * 符号：RULE_METRICS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const RULE_METRICS = [
  "qps",
  "errorRate",
  "latencyP95",
  "latencyP99",
  "availability",
  "statusCode5xx",
];
/**
 * 符号：RULE_AGGREGATION_VALUES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const RULE_AGGREGATION_VALUES = ["avg", "max", "min", "latest"];
/**
 * 符号：API_METHOD_VALUES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const API_METHOD_VALUES = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
/**
 * 符号：API_ENV_VALUES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const API_ENV_VALUES = ["production", "staging", "test"];
/**
 * 符号：CREDENTIAL_TYPE_VALUES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const CREDENTIAL_TYPE_VALUES = ["bearer", "api_key", "basic", "custom"];
/**
 * 符号：CHANNEL_TYPE_VALUES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const CHANNEL_TYPE_VALUES = ["email", "webhook", "slack", "sms", "wechat"];

/**
 * 符号：ACTIVE_ALERT_STATUSES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const ACTIVE_ALERT_STATUSES = new Set(["open", "acknowledged"]);
/**
 * 符号：getActor（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getActor = (payload) => payload?.actor || payload?.operator || "system";
/**
 * 符号：routeCache（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const routeCache = new Map();
/**
 * 符号：__filename（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const __filename = fileURLToPath(import.meta.url);
/**
 * 符号：__dirname（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const __dirname = path.dirname(__filename);
/**
 * 符号：CLIENT_DIST_DIR（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const CLIENT_DIST_DIR = path.resolve(__dirname, "..", "dist");
/**
 * 符号：CLIENT_INDEX_FILE（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const CLIENT_INDEX_FILE = path.join(CLIENT_DIST_DIR, "index.html");

/**
 * 符号：withRouteCache（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const withRouteCache = (state, key, producer, ttlMs = ROUTE_CACHE_TTL_MS) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const updatedAt = state.meta?.updatedAt || "";
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const nowMs = Date.now();
  const cached = routeCache.get(key);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (cached && cached.updatedAt === updatedAt && nowMs - cached.cachedAt <= ttlMs) {
    return cached.value;
  }

  const value = producer();
  routeCache.set(key, {
    updatedAt,
    cachedAt: nowMs,
    value,
  });
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (routeCache.size > ROUTE_CACHE_MAX_KEYS) {
    routeCache.clear();
  }
  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return value;
};

/**
 * 符号：addAuditLog（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const addAuditLog = (state, payload) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const entry = {
    id: uid("audit"),
    user: payload.user ?? "system",
    action: payload.action,
    target: payload.target,
    detail: payload.detail ?? "",
    timestamp: nowIso(),
  };

  state.auditLogs.unshift(entry);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (state.auditLogs.length > MAX_AUDIT_LOGS) {
    state.auditLogs.length = MAX_AUDIT_LOGS;
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return entry;
};

/**
 * 符号：serializeAlert（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const serializeAlert = (state, alert) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const api = state.apis.find((item) => item.id === alert.apiId);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const rule = state.rules.find((item) => item.id === alert.ruleId);

  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    ...alert,
    apiName: api?.name ?? alert.apiId,
    apiPath: api?.path ?? "",
    ruleName: rule?.name ?? alert.ruleId,
  };
};

/**
 * 符号：buildDerivedApiIndices（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildDerivedApiIndices = (state) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const latestMetricByApi = new Map();
  // 步骤 1：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (let index = state.metrics.length - 1; index >= 0; index -= 1) {
    const point = state.metrics[index];
    if (!latestMetricByApi.has(point.apiId)) {
      latestMetricByApi.set(point.apiId, point);
    }
  }

  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const activeAlertCountByApi = new Map();
  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const highestAlertByApi = new Map();
  const levelWeight = { P1: 3, P2: 2, P3: 1 };
  // 步骤 3：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const alert of state.alerts) {
    if (!ACTIVE_ALERT_STATUSES.has(alert.status)) continue;
    activeAlertCountByApi.set(alert.apiId, (activeAlertCountByApi.get(alert.apiId) || 0) + 1);
    const current = highestAlertByApi.get(alert.apiId);
    if (!current || (levelWeight[alert.level] || 0) > (levelWeight[current] || 0)) {
      highestAlertByApi.set(alert.apiId, alert.level);
    }
  }

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    latestMetricByApi,
    activeAlertCountByApi,
    highestAlertByApi,
  };
};

/**
 * 符号：buildApiListItem（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildApiListItem = (state, api, indices = null) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const latest = indices ? (indices.latestMetricByApi.get(api.id) || null) : getLatestMetricForApi(state, api.id);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const activeAlertCount = indices
    ? indices.activeAlertCountByApi.get(api.id) || 0
    : getActiveAlertCountByApi(state, api.id);
  const highestAlertLevel = indices
    ? indices.highestAlertByApi.get(api.id) || null
    : getHighestActiveAlertLevelByApi(state, api.id);

  const status = activeAlertCount > 0
    ? highestAlertLevel === "P1"
      ? "critical"
      : "warning"
    : latest
      ? latest.errorRate > 4 || latest.availability < 99 || latest.latencyP95 > 900
        ? "warning"
        : "healthy"
      : computeApiStatus(state, api.id);

  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    ...api,
    status,
    activeAlertCount,
    highestAlertLevel,
    latestMetrics: latest,
  };
};

/**
 * 符号：findApiOr404（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const findApiOr404 = (state, apiId, res) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const api = state.apis.find((item) => item.id === apiId);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!api) {
    res.status(404).json({ error: `API not found: ${apiId}` });
    return null;
  }
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return api;
};

/**
 * 符号：appendAlertEvent（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const appendAlertEvent = (alert, type, by, note) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Array.isArray(alert.events)) {
    alert.events = [];
  }

  alert.events.push({
    id: uid("event"),
    type,
    by,
    note,
    at: nowIso(),
  });
};

/**
 * 符号：buildTrendSeries（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildTrendSeries = (state, hours, bucketMinutes) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const safeHours = Math.max(1, Math.min(toNumber(hours, 24), 168));
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const safeBucketMinutes = Math.max(5, Math.min(toNumber(bucketMinutes, 30), 120));

  const endMs = Date.now();
  const startMs = endMs - safeHours * 3_600_000;
  const bucketMs = safeBucketMinutes * 60_000;
  const bucketCount = Math.max(1, Math.ceil((endMs - startMs) / bucketMs));

  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = startMs + index * bucketMs;
    return {
      timestamp: new Date(bucketStart).toISOString(),
      qpsValues: [],
      errorRateValues: [],
      latencyValues: [],
      availabilityValues: [],
      alertCount: 0,
    };
  });

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const metric of state.metrics) {
    const metricMs = new Date(metric.timestamp).getTime();

    if (metricMs < startMs || metricMs > endMs) {
      continue;
    }

    const bucketIndex = Math.min(
      buckets.length - 1,
      Math.floor((metricMs - startMs) / bucketMs),
    );

    const bucket = buckets[bucketIndex];
    bucket.qpsValues.push(metric.qps);
    bucket.errorRateValues.push(metric.errorRate);
    bucket.latencyValues.push(metric.latencyP95);
    bucket.availabilityValues.push(metric.availability);
  }

  // 步骤 3：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const alert of state.alerts) {
    const alertMs = new Date(alert.triggeredAt).getTime();
    if (alertMs < startMs || alertMs > endMs) {
      continue;
    }

    const bucketIndex = Math.min(
      buckets.length - 1,
      Math.floor((alertMs - startMs) / bucketMs),
    );

    buckets[bucketIndex].alertCount += 1;
  }

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return buckets.map((bucket) => ({
    timestamp: bucket.timestamp,
    qps: round(avg(bucket.qpsValues), 2),
    errorRate: round(avg(bucket.errorRateValues), 3),
    latencyP95: round(avg(bucket.latencyValues), 2),
    availability: round(avg(bucket.availabilityValues), 3),
    alerts: bucket.alertCount,
  }));
};

/**
 * 符号：buildApiBaseline（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildApiBaseline = (baselineInput, fallback = null) => ({
  qps: Math.max(1, toNumber(baselineInput?.qps, fallback?.qps ?? 300)),
  errorRate: Math.max(0, toNumber(baselineInput?.errorRate, fallback?.errorRate ?? 1)),
  latencyP95: Math.max(1, toNumber(baselineInput?.latencyP95, fallback?.latencyP95 ?? 250)),
  latencyP99: Math.max(1, toNumber(baselineInput?.latencyP99, fallback?.latencyP99 ?? 380)),
  availability: Math.min(
    Math.max(toNumber(baselineInput?.availability, fallback?.availability ?? 99.9), 0),
    100,
  ),
});

/**
 * 符号：normalizeApiMethod（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeApiMethod = (value, fallback = "GET") => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const method = String(value || fallback).toUpperCase();
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return API_METHOD_VALUES.includes(method) ? method : fallback;
};

/**
 * 符号：sanitizeCredential（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const sanitizeCredential = (credential) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const config = sanitizeCredentialConfigForStorage(credential?.type, credential?.config);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const type = String(credential?.type || "custom");
  const safeConfig = { ...config };
  const secretStatus = {};

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "bearer") {
    secretStatus.tokenRefResolved = resolveSecretRefStatus(config.tokenRef);
  } else if (type === "api_key") {
    secretStatus.valueRefResolved = resolveSecretRefStatus(config.valueRef);
  } else if (type === "basic") {
    secretStatus.passwordRefResolved = resolveSecretRefStatus(config.passwordRef);
  } else {
    const headerRefs =
      config.headerRefs && typeof config.headerRefs === "object" ? config.headerRefs : {};
    secretStatus.headerRefsResolved = Object.fromEntries(
      Object.entries(headerRefs).map(([headerName, ref]) => [headerName, resolveSecretRefStatus(ref)]),
    );
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    ...credential,
    config: safeConfig,
    secretStatus,
  };
};

/**
 * 符号：findCredentialForApi（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const findCredentialForApi = (state, api) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const credentialId = api?.monitor?.checkConfig?.credentialId;
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!credentialId) return null;
  return state.credentials.find((item) => item.id === credentialId) || null;
};

/**
 * 符号：updateApiStatusInState（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const updateApiStatusInState = (state, apiId) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const api = state.apis.find((item) => item.id === apiId);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!api) return;
  api.status = computeApiStatus(state, api.id);
};

/**
 * 符号：toUniqueIdList（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const toUniqueIdList = (input) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Array.isArray(input)) return [];
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const seen = new Set();
  const ids = [];

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const item of input) {
    const id = String(item ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return ids;
};

/**
 * 符号：removeApiFromState（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const removeApiFromState = (state, apiId, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const cascade = Boolean(options.cascade);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const index = state.apis.findIndex((item) => item.id === apiId);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (index === -1) {
    return { ok: false, reason: "not_found" };
  }

  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const targetApi = state.apis[index];
  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const relatedMetricsCount = state.metrics.filter((item) => item.apiId === apiId).length;
  const relatedAlerts = state.alerts.filter((item) => item.apiId === apiId);
  // 步骤 4：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const relatedRuleHitsCount = state.ruleHits.filter((item) => item.apiId === apiId).length;
  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const relatedApiScopedRules = state.rules.filter(
    (rule) => rule.scope?.type === "api" && rule.scope?.value === apiId,
  );

  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (
    !cascade &&
    (relatedMetricsCount > 0 ||
      relatedAlerts.length > 0 ||
      relatedRuleHitsCount > 0 ||
      relatedApiScopedRules.length > 0)
  ) {
    return {
      ok: false,
      reason: "has_related_data",
      item: targetApi,
      related: {
        metrics: relatedMetricsCount,
        alerts: relatedAlerts.length,
        ruleHits: relatedRuleHitsCount,
        scopedRules: relatedApiScopedRules.length,
      },
    };
  }

  // 步骤 6：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const removedRuleIds = new Set();
  // 步骤 4：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const removedAlertIds = new Set();
  let removedMetrics = 0;
  let removedRuleHits = 0;
  let removedNotifications = 0;

  // 步骤 7：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (cascade) {
    removedMetrics = state.metrics.filter((item) => item.apiId === apiId).length;
    state.metrics = state.metrics.filter((item) => item.apiId !== apiId);

    removedRuleHits = state.ruleHits.filter((item) => item.apiId === apiId).length;
    state.ruleHits = state.ruleHits.filter((item) => item.apiId !== apiId);

    for (const rule of relatedApiScopedRules) {
      removedRuleIds.add(rule.id);
    }

    if (removedRuleIds.size > 0) {
      state.rules = state.rules.filter((item) => !removedRuleIds.has(item.id));
    }

    for (const alert of relatedAlerts) {
      removedAlertIds.add(alert.id);
    }
    state.alerts = state.alerts.filter((item) => item.apiId !== apiId);

    removedNotifications = state.notifications.filter(
      (item) => item.apiId === apiId || (item.ruleId && removedRuleIds.has(item.ruleId)),
    ).length;
    state.notifications = state.notifications.filter(
      (item) => item.apiId !== apiId && (!item.ruleId || !removedRuleIds.has(item.ruleId)),
    );
  }

  // 步骤 8：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const removedApi = state.apis[index];
  state.apis.splice(index, 1);

  // 步骤 9：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    ok: true,
    item: removedApi,
    cascade,
    removed: {
      metrics: removedMetrics,
      alerts: removedAlertIds.size,
      alertIds: [...removedAlertIds],
      ruleHits: removedRuleHits,
      scopedRules: removedRuleIds.size,
      scopedRuleIds: [...removedRuleIds],
      notifications: removedNotifications,
    },
  };
};

/**
 * 符号：normalizeRuleScope（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeRuleScope = (scope) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!scope || typeof scope !== "object") {
    return { type: "global" };
  }

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (scope.type === "api") {
    return { type: "api", value: String(scope.value || "") };
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (scope.type === "service") {
    return { type: "service", value: String(scope.value || "") };
  }

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return { type: "global" };
};

/**
 * 符号：validateRulePayload（arrow-function）
 * 作用说明：该函数用于前置校验，尽早拦截非法输入并缩短错误路径。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const validateRulePayload = (payload) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!payload || typeof payload !== "object") {
    return "Invalid payload.";
  }

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!payload.name || typeof payload.name !== "string") {
    return "Rule name is required.";
  }

  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const ruleType = String(payload.ruleType || "threshold");
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!RULE_TYPE_VALUES.includes(ruleType)) {
    return `Rule type must be one of: ${RULE_TYPE_VALUES.join(", ")}`;
  }

  // 步骤 4：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const hasConditions = Array.isArray(payload.conditions) && payload.conditions.length > 0;

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (hasConditions && ruleType !== "threshold") {
    return "conditions only supported for threshold rules.";
  }

  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!hasConditions) {
    if (!RULE_METRICS.includes(payload.metric)) {
      return `Rule metric must be one of: ${RULE_METRICS.join(", ")}`;
    }

    if (!RULE_OPERATOR_VALUES.includes(payload.operator)) {
      return `Rule operator must be one of: ${RULE_OPERATOR_VALUES.join(", ")}`;
    }
  }

  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!RULE_PRIORITY_VALUES.includes(payload.priority)) {
    return `Rule priority must be one of: ${RULE_PRIORITY_VALUES.join(", ")}`;
  }

  // 步骤 7：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!RULE_AGGREGATION_VALUES.includes(payload.aggregation)) {
    return `Rule aggregation must be one of: ${RULE_AGGREGATION_VALUES.join(", ")}`;
  }

  // 步骤 8：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!hasConditions) {
    if (!Number.isFinite(Number(payload.threshold))) {
      return "Rule threshold must be numeric.";
    }
  }

  // 步骤 9：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (hasConditions) {
    for (const condition of payload.conditions) {
      if (!condition || typeof condition !== "object") {
        return "Each condition must be an object.";
      }
      if (!RULE_METRICS.includes(condition.metric)) {
        return `Condition metric must be one of: ${RULE_METRICS.join(", ")}`;
      }
      if (!RULE_OPERATOR_VALUES.includes(condition.operator)) {
        return `Condition operator must be one of: ${RULE_OPERATOR_VALUES.join(", ")}`;
      }
      if (!Number.isFinite(Number(condition.threshold))) {
        return "Condition threshold must be numeric.";
      }
      if ("aggregation" in condition && !RULE_AGGREGATION_VALUES.includes(condition.aggregation)) {
        return `Condition aggregation must be one of: ${RULE_AGGREGATION_VALUES.join(", ")}`;
      }
      if ("windowMinutes" in condition && !Number.isFinite(Number(condition.windowMinutes))) {
        return "Condition windowMinutes must be numeric.";
      }
      if ("minSamples" in condition && !Number.isFinite(Number(condition.minSamples))) {
        return "Condition minSamples must be numeric.";
      }
    }

    if (
      "conditionLogic" in payload &&
      payload.conditionLogic &&
      !RULE_CONDITION_LOGIC_VALUES.includes(String(payload.conditionLogic))
    ) {
      return `Condition logic must be one of: ${RULE_CONDITION_LOGIC_VALUES.join(", ")}`;
    }
  }

  // 步骤 10：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (ruleType === "consecutive_failures") {
    if (!Number.isFinite(Number(payload.failureCount)) || Number(payload.failureCount) < 2) {
      return "consecutive_failures rule requires failureCount >= 2.";
    }
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (ruleType === "burn_rate") {
    if (!Number.isFinite(Number(payload.shortWindowMinutes)) || Number(payload.shortWindowMinutes) < 1) {
      return "burn_rate rule requires shortWindowMinutes >= 1.";
    }
    if (!Number.isFinite(Number(payload.longWindowMinutes)) || Number(payload.longWindowMinutes) < 2) {
      return "burn_rate rule requires longWindowMinutes >= 2.";
    }
    if (!Number.isFinite(Number(payload.burnRateThreshold)) || Number(payload.burnRateThreshold) < 1) {
      return "burn_rate rule requires burnRateThreshold >= 1.";
    }
    if (!Number.isFinite(Number(payload.sloTarget)) || Number(payload.sloTarget) < 90 || Number(payload.sloTarget) > 100) {
      return "burn_rate rule requires sloTarget in [90, 100].";
    }
  }

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return null;
};

/**
 * 符号：normalizeRuleActionsInput（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeRuleActionsInput = (actionsInput) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Array.isArray(actionsInput)) return [];
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return actionsInput
    .map((item) => String(item || "").trim())
    .filter(Boolean);
};

/**
 * 符号：normalizeRuleConditions（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeRuleConditions = (conditions) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Array.isArray(conditions)) return [];
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return conditions
    .map((condition) => {
      if (!condition || typeof condition !== "object") return null;
      return {
        metric: condition.metric,
        operator: condition.operator,
        threshold: toNumber(condition.threshold, 0),
        aggregation: condition.aggregation,
        windowMinutes:
          condition.windowMinutes === undefined ? undefined : toNumber(condition.windowMinutes, 0),
        minSamples: condition.minSamples === undefined ? undefined : toNumber(condition.minSamples, 0),
      };
    })
    .filter(Boolean);
};

/**
 * 符号：validateRuleConditionsInput（arrow-function）
 * 作用说明：该函数用于前置校验，尽早拦截非法输入并缩短错误路径。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const validateRuleConditionsInput = (conditions) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Array.isArray(conditions)) return null;
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!conditions.length) return null;

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const condition of conditions) {
    if (!condition || typeof condition !== "object") {
      return "Each condition must be an object.";
    }
    if (!RULE_METRICS.includes(condition.metric)) {
      return `Condition metric must be one of: ${RULE_METRICS.join(", ")}`;
    }
    if (!RULE_OPERATOR_VALUES.includes(condition.operator)) {
      return `Condition operator must be one of: ${RULE_OPERATOR_VALUES.join(", ")}`;
    }
    if (!Number.isFinite(Number(condition.threshold))) {
      return "Condition threshold must be numeric.";
    }
    if ("aggregation" in condition && !RULE_AGGREGATION_VALUES.includes(condition.aggregation)) {
      return `Condition aggregation must be one of: ${RULE_AGGREGATION_VALUES.join(", ")}`;
    }
    if ("windowMinutes" in condition && !Number.isFinite(Number(condition.windowMinutes))) {
      return "Condition windowMinutes must be numeric.";
    }
    if ("minSamples" in condition && !Number.isFinite(Number(condition.minSamples))) {
      return "Condition minSamples must be numeric.";
    }
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return null;
};

/**
 * 符号：validateRuleActionsAgainstChannels（arrow-function）
 * 作用说明：该函数用于前置校验，尽早拦截非法输入并缩短错误路径。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const validateRuleActionsAgainstChannels = (state, actionsInput) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const actions = normalizeRuleActionsInput(actionsInput);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!actions.length) {
    return { error: "Rule actions is required and cannot be empty.", actions: [] };
  }

  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const invalid = actions.filter((action) => {
    const matchedById = state.channels.some((channel) => channel.id === action);
    const matchedByType = CHANNEL_TYPE_VALUES.includes(action);
    return !matchedById && !matchedByType;
  });

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (invalid.length) {
    return {
      error: `Unknown rule actions: ${invalid.join(", ")}. Please choose existing channels or valid channel types.`,
      actions,
    };
  }

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return { error: null, actions: [...new Set(actions)] };
};

/**
 * 符号：computePercentile（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const computePercentile = (values, percentile) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Array.isArray(values) || values.length === 0) return null;
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const sorted = [...values].sort((a, b) => a - b);
  const p = clamp(toNumber(percentile, 50), 0, 100);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return sorted[index];
};

/**
 * 符号：buildScopeMatcher（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildScopeMatcher = (scope) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const normalized = normalizeRuleScope(scope);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (normalized.type === "api") {
    return (api) => api.id === normalized.value;
  }
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (normalized.type === "service") {
    return (api) => api.service === normalized.value;
  }
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return () => true;
};

/**
 * 符号：createAutoRuleCandidates（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const createAutoRuleCandidates = (state, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const sensitivity = String(options.sensitivity || "medium").toLowerCase();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const profile =
    sensitivity === "high"
      ? { errorFactor: 1.5, latencyFactor: 1.4, availabilityDrop: 0.3, fiveXxFactor: 1.4, window: 3, minSamples: 1, cooldown: 5 }
      : sensitivity === "low"
        ? { errorFactor: 2.2, latencyFactor: 1.9, availabilityDrop: 0.8, fiveXxFactor: 2.0, window: 8, minSamples: 3, cooldown: 15 }
        : { errorFactor: 1.8, latencyFactor: 1.6, availabilityDrop: 0.5, fiveXxFactor: 1.7, window: 5, minSamples: 2, cooldown: 10 };

  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const days = Math.max(1, Math.min(toNumber(options.days, 7), 30));
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const scope = normalizeRuleScope(options.scope);
  const matchApi = buildScopeMatcher(scope);
  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const scopedApis = state.apis.filter(matchApi);
  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const scopedApiIds = new Set(scopedApis.map((api) => api.id));
  const scopedMetrics = state.metrics.filter(
    (item) => scopedApiIds.has(item.apiId) && new Date(item.timestamp).getTime() >= sinceMs,
  );

  const avgBaseline = {
    errorRate: avg(scopedApis.map((api) => toNumber(api.baseline?.errorRate, 1))) || 1,
    latencyP95: avg(scopedApis.map((api) => toNumber(api.baseline?.latencyP95, 200))) || 200,
    availability: avg(scopedApis.map((api) => toNumber(api.baseline?.availability, 99.9))) || 99.9,
  };

  // 步骤 4：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const errorP95 = computePercentile(scopedMetrics.map((m) => toNumber(m.errorRate, 0)), 95);
  // 步骤 4：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const latencyP95 = computePercentile(scopedMetrics.map((m) => toNumber(m.latencyP95, 0)), 95);
  const availP05 = computePercentile(scopedMetrics.map((m) => toNumber(m.availability, 100)), 5);
  // 步骤 5：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const fiveXxP95 = computePercentile(scopedMetrics.map((m) => toNumber(m.statusCode5xx, 0)), 95);

  const errorThreshold = round(
    Math.max(
      avgBaseline.errorRate * profile.errorFactor,
      toNumber(errorP95, avgBaseline.errorRate * profile.errorFactor) * 1.05,
      2,
    ),
    3,
  );
  const latencyThreshold = round(
    Math.max(
      avgBaseline.latencyP95 * profile.latencyFactor,
      toNumber(latencyP95, avgBaseline.latencyP95 * profile.latencyFactor) * 1.08,
      120,
    ),
    0,
  );
  const availabilityThreshold = round(
    clamp(
      Math.min(
        avgBaseline.availability - profile.availabilityDrop,
        toNumber(availP05, avgBaseline.availability) - 0.05,
      ),
      90,
      99.99,
    ),
    3,
  );
  const fiveXxThreshold = round(
    Math.max(toNumber(fiveXxP95, 5) * profile.fiveXxFactor, 5),
    0,
  );

  // 步骤 6：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    scope,
    scopedApisCount: scopedApis.length,
    scopedMetricsCount: scopedMetrics.length,
    profile,
    candidates: [
      {
        metric: "errorRate",
        operator: ">",
        aggregation: "avg",
        threshold: errorThreshold,
        priority: "P1",
        name: "Auto High Error Rate",
        description: `Auto generated from last ${days} days metrics`,
      },
      {
        metric: "latencyP95",
        operator: ">",
        aggregation: "max",
        threshold: latencyThreshold,
        priority: "P2",
        name: "Auto High Latency P95",
        description: `Auto generated from last ${days} days metrics`,
      },
      {
        metric: "availability",
        operator: "<",
        aggregation: "latest",
        threshold: availabilityThreshold,
        priority: "P1",
        name: "Auto Availability Drop",
        description: `Auto generated from last ${days} days metrics`,
      },
      {
        metric: "statusCode5xx",
        operator: ">",
        aggregation: "max",
        threshold: fiveXxThreshold,
        priority: "P1",
        name: "Auto 5xx Surge",
        description: `Auto generated from last ${days} days metrics`,
      },
    ],
  };
};

/**
 * 符号：getDefaultChannelConfig（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getDefaultChannelConfig = (type) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "email") {
    return {
      deliveryMode: "mock",
      recipients: ["ops@example.com"],
      from: "alerts@example.com",
      smtpHost: "smtp.example.com",
      smtpPort: 587,
    };
  }
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "webhook") {
    return {
      deliveryMode: "mock",
      url: "https://example.com/webhook",
      method: "POST",
      timeoutMs: 8000,
    };
  }
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "slack") {
    return {
      deliveryMode: "mock",
      webhookUrl: "https://hooks.slack.com/services/EXAMPLE",
      channel: "#api-alert",
    };
  }
  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "wechat") {
    return {
      deliveryMode: "mock",
      webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=EXAMPLE",
    };
  }
  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "sms") {
    return {
      deliveryMode: "mock",
      provider: "mock-provider",
      recipients: ["+10000000000"],
    };
  }
  // 步骤 6：返回当前结果并结束函数，明确本路径的输出语义。
  return { deliveryMode: "mock" };
};

/**
 * 符号：matchesAlertQualityFilters（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const matchesAlertQualityFilters = (state, alert, filters) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (filters.apiId && alert.apiId !== filters.apiId) return false;
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (filters.ruleId && alert.ruleId !== filters.ruleId) return false;
  if (filters.service) {
    const api = state.apis.find((item) => item.id === alert.apiId);
    if (!api || api.service !== filters.service) return false;
  }
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return true;
};

/**
 * 符号：computeAlertQualitySnapshot（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const computeAlertQualitySnapshot = (state, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const days = Math.max(1, Math.min(toNumber(options.days, 7), 90));
  const sinceMs = nowMs - days * 24 * 60 * 60 * 1000;
  const filters = {
    service: options.service ? String(options.service).trim() : "",
    apiId: options.apiId ? String(options.apiId).trim() : "",
    ruleId: options.ruleId ? String(options.ruleId).trim() : "",
  };

  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const alerts = state.alerts
    .filter((item) => new Date(item.triggeredAt).getTime() >= sinceMs)
    .filter((item) => matchesAlertQualityFilters(state, item, filters));

  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const allowedAlertIds = new Set(alerts.map((item) => item.id));
  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const allowedApiIds = new Set(alerts.map((item) => item.apiId));
  const notifications = state.notifications.filter(
    (item) =>
      new Date(item.createdAt).getTime() >= sinceMs &&
      (!item.alertId || allowedAlertIds.has(item.alertId)) &&
      (!item.apiId || allowedApiIds.has(item.apiId)),
  );

  // 步骤 4：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const byFingerprint = new Map();
  // 步骤 3：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const alert of alerts) {
    const key = `${alert.ruleId}:${alert.apiId}`;
    if (!byFingerprint.has(key)) byFingerprint.set(key, []);
    byFingerprint.get(key).push(alert);
  }

  let duplicateBurstCount = 0;
  let flappingFingerprintCount = 0;
  // 步骤 5：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const items of byFingerprint.values()) {
    items.sort((a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime());
    let localBurst = 0;
    for (let index = 1; index < items.length; index += 1) {
      const gapMs =
        new Date(items[index].triggeredAt).getTime() -
        new Date(items[index - 1].triggeredAt).getTime();
      if (gapMs <= 5 * 60 * 1000) localBurst += 1;
    }
    duplicateBurstCount += localBurst;

    const resolvedQuickly = items.filter((item) => {
      if (!item.resolvedAt) return false;
      const durationMs = new Date(item.resolvedAt).getTime() - new Date(item.triggeredAt).getTime();
      return durationMs >= 0 && durationMs <= 10 * 60 * 1000;
    });
    if (resolvedQuickly.length >= 3) {
      flappingFingerprintCount += 1;
    }
  }

  // 步骤 6：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const resolvedAlerts = alerts.filter((item) => Boolean(item.resolvedAt));
  // 步骤 4：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const feedbackFalsePositive = alerts.filter(
    (item) => item.feedback?.label === "false_positive",
  ).length;
  // 步骤 7：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const feedbackTruePositive = alerts.filter(
    (item) => item.feedback?.label === "true_positive",
  ).length;
  // 步骤 8：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const feedbackNoise = alerts.filter((item) => item.feedback?.label === "noise").length;
  const mttrMinutes = resolvedAlerts.length
    ? round(
        avg(
          resolvedAlerts.map((item) =>
            (new Date(item.resolvedAt).getTime() - new Date(item.triggeredAt).getTime()) / 60_000,
          ),
        ),
        2,
      )
    : null;

  // 步骤 9：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const sentNotifications = notifications.filter((item) => item.status === "sent");
  // 步骤 5：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const failedNotifications = notifications.filter((item) => item.status !== "sent");
  const recoveryNotifications = notifications.filter((item) => item.eventType === "recovery");

  // 步骤 10：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const ruleCount = new Map();
  // 步骤 6：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const alert of alerts) {
    ruleCount.set(alert.ruleId, (ruleCount.get(alert.ruleId) || 0) + 1);
  }
  const topNoisyRules = [...ruleCount.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([ruleId, count]) => ({
      ruleId,
      ruleName: state.rules.find((rule) => rule.id === ruleId)?.name ?? ruleId,
      count,
    }));

  // 步骤 7：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    generatedAt: nowIso(),
    windowDays: days,
    filters: {
      service: filters.service || null,
      apiId: filters.apiId || null,
      ruleId: filters.ruleId || null,
    },
    totals: {
      alerts: alerts.length,
      resolvedAlerts: resolvedAlerts.length,
      activeAlerts: alerts.filter((item) => ACTIVE_ALERT_STATUSES.has(item.status)).length,
      notifications: notifications.length,
      sentNotifications: sentNotifications.length,
      failedNotifications: failedNotifications.length,
      recoveryNotifications: recoveryNotifications.length,
      feedbackFalsePositive,
      feedbackTruePositive,
      feedbackNoise,
    },
    quality: {
      duplicateBurstCount,
      flappingFingerprintCount,
      mttrMinutes,
      notificationFailureRate: notifications.length
        ? round((failedNotifications.length / notifications.length) * 100, 2)
        : 0,
      duplicateRate: alerts.length ? round((duplicateBurstCount / alerts.length) * 100, 2) : 0,
      falsePositiveRate: alerts.length ? round((feedbackFalsePositive / alerts.length) * 100, 2) : 0,
    },
    topNoisyRules,
  };
};

/**
 * 符号：computeAlertQualityCompare（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const computeAlertQualityCompare = (state, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const days = Math.max(1, Math.min(toNumber(options.days, 7), 90));
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
  const previousNowMs = nowMs - days * 24 * 60 * 60 * 1000;

  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const current = computeAlertQualitySnapshot(state, {
    ...options,
    days,
    nowMs,
  });
  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const previous = computeAlertQualitySnapshot(state, {
    ...options,
    days,
    nowMs: previousNowMs,
  });

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    generatedAt: nowIso(),
    days,
    filters: current.filters,
    current,
    previous,
    delta: {
      alerts: current.totals.alerts - previous.totals.alerts,
      duplicateRate: round(current.quality.duplicateRate - previous.quality.duplicateRate, 2),
      falsePositiveRate: round(
        current.quality.falsePositiveRate - previous.quality.falsePositiveRate,
        2,
      ),
      notificationFailureRate: round(
        current.quality.notificationFailureRate - previous.quality.notificationFailureRate,
        2,
      ),
      mttrMinutes: round(
        (current.quality.mttrMinutes ?? 0) - (previous.quality.mttrMinutes ?? 0),
        2,
      ),
    },
  };
};

/**
 * 符号：clamp（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * 符号：toFinitePercentDelta（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const toFinitePercentDelta = (nextValue, currentValue) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const base = Math.max(Math.abs(toNumber(currentValue, 0)), 1);
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (toNumber(nextValue, 0) - toNumber(currentValue, 0)) / base;
};

/**
 * 符号：buildDraftImpactEstimate（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildDraftImpactEstimate = (state, draft, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const days = Math.max(1, Math.min(toNumber(options.days, 7), 90));
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const rule = state.rules.find((item) => item.id === draft.ruleId);
  if (!rule) {
    return null;
  }

  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const currentSnapshot = computeAlertQualitySnapshot(state, {
    days,
    service: options.service,
    apiId: options.apiId,
    ruleId: draft.ruleId,
  });

  const currentMinSamples = Math.max(1, toNumber(rule.minSamples, 1));
  const currentWindowMinutes = Math.max(1, toNumber(rule.windowMinutes, 1));
  const currentCooldownMinutes = Math.max(0, toNumber(rule.cooldownMinutes, 0));
  const nextMinSamples = Math.max(1, toNumber(draft.patch?.minSamples, currentMinSamples));
  const nextWindowMinutes = Math.max(1, toNumber(draft.patch?.windowMinutes, currentWindowMinutes));
  const nextCooldownMinutes = Math.max(0, toNumber(draft.patch?.cooldownMinutes, currentCooldownMinutes));

  const minSamplesDelta = toFinitePercentDelta(nextMinSamples, currentMinSamples);
  const windowMinutesDelta = toFinitePercentDelta(nextWindowMinutes, currentWindowMinutes);
  const cooldownMinutesDelta = toFinitePercentDelta(nextCooldownMinutes, currentCooldownMinutes);

  const duplicateComponents = {
    minSamples: 0.25 * minSamplesDelta,
    windowMinutes: 0.3 * windowMinutesDelta,
    cooldownMinutes: 0.45 * cooldownMinutesDelta,
  };
  const falsePositiveComponents = {
    minSamples: 0.5 * minSamplesDelta,
    windowMinutes: 0.35 * windowMinutesDelta,
    cooldownMinutes: 0.15 * cooldownMinutesDelta,
  };

  const duplicateRawEffect =
    duplicateComponents.minSamples +
    duplicateComponents.windowMinutes +
    duplicateComponents.cooldownMinutes;
  const falsePositiveRawEffect =
    falsePositiveComponents.minSamples +
    falsePositiveComponents.windowMinutes +
    falsePositiveComponents.cooldownMinutes;

  const duplicateEffect = clamp(
    duplicateRawEffect,
    -0.8,
    0.85,
  );
  const falsePositiveEffect = clamp(
    falsePositiveRawEffect,
    -0.7,
    0.75,
  );

  const currentDuplicateRate = toNumber(currentSnapshot.quality.duplicateRate, 0);
  const currentFalsePositiveRate = toNumber(currentSnapshot.quality.falsePositiveRate, 0);
  const estimatedDuplicateRate = round(clamp(currentDuplicateRate * (1 - duplicateEffect), 0, 100), 2);
  const estimatedFalsePositiveRate = round(
    clamp(currentFalsePositiveRate * (1 - falsePositiveEffect), 0, 100),
    2,
  );

  const sampleCount = currentSnapshot.totals.alerts;
  const confidence = sampleCount >= 50 ? "high" : sampleCount >= 15 ? "medium" : "low";
  const duplicateScale = duplicateRawEffect === 0 ? 0 : duplicateEffect / duplicateRawEffect;
  const falsePositiveScale =
    falsePositiveRawEffect === 0 ? 0 : falsePositiveEffect / falsePositiveRawEffect;

  const duplicateContributions = {
    minSamples: round(-currentDuplicateRate * duplicateComponents.minSamples * duplicateScale, 2),
    windowMinutes: round(
      -currentDuplicateRate * duplicateComponents.windowMinutes * duplicateScale,
      2,
    ),
    cooldownMinutes: round(
      -currentDuplicateRate * duplicateComponents.cooldownMinutes * duplicateScale,
      2,
    ),
  };
  const falsePositiveContributions = {
    minSamples: round(
      -currentFalsePositiveRate * falsePositiveComponents.minSamples * falsePositiveScale,
      2,
    ),
    windowMinutes: round(
      -currentFalsePositiveRate * falsePositiveComponents.windowMinutes * falsePositiveScale,
      2,
    ),
    cooldownMinutes: round(
      -currentFalsePositiveRate * falsePositiveComponents.cooldownMinutes * falsePositiveScale,
      2,
    ),
  };

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    generatedAt: nowIso(),
    days,
    filters: {
      service: options.service ? String(options.service) : null,
      apiId: options.apiId ? String(options.apiId) : null,
      ruleId: draft.ruleId,
    },
    draftId: draft.id,
    ruleId: draft.ruleId,
    ruleName: rule.name,
    sampleCount,
    confidence,
    assumptions: {
      model: "heuristic_v1",
      effectWeights: {
        duplicateRate: {
          minSamples: 0.25,
          windowMinutes: 0.3,
          cooldownMinutes: 0.45,
        },
        falsePositiveRate: {
          minSamples: 0.5,
          windowMinutes: 0.35,
          cooldownMinutes: 0.15,
        },
      },
    },
    explanation: {
      normalizedDelta: {
        minSamples: round(minSamplesDelta, 4),
        windowMinutes: round(windowMinutesDelta, 4),
        cooldownMinutes: round(cooldownMinutesDelta, 4),
      },
      contributions: {
        duplicateRate: duplicateContributions,
        falsePositiveRate: falsePositiveContributions,
      },
    },
    current: {
      duplicateRate: currentDuplicateRate,
      falsePositiveRate: currentFalsePositiveRate,
      minSamples: currentMinSamples,
      windowMinutes: currentWindowMinutes,
      cooldownMinutes: currentCooldownMinutes,
    },
    draft: {
      minSamples: nextMinSamples,
      windowMinutes: nextWindowMinutes,
      cooldownMinutes: nextCooldownMinutes,
    },
    estimated: {
      duplicateRate: estimatedDuplicateRate,
      falsePositiveRate: estimatedFalsePositiveRate,
    },
    delta: {
      duplicateRate: round(estimatedDuplicateRate - currentDuplicateRate, 2),
      falsePositiveRate: round(estimatedFalsePositiveRate - currentFalsePositiveRate, 2),
    },
  };
};

/**
 * 符号：buildConclusionText（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildConclusionText = (compare) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const delta = compare.delta;
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const trendText = [
    delta.alerts <= 0 ? "告警数量下降或持平" : "告警数量上升",
    delta.duplicateRate <= 0 ? "重复率改善" : "重复率恶化",
    delta.falsePositiveRate <= 0 ? "误报率改善" : "误报率恶化",
    delta.notificationFailureRate <= 0 ? "通知稳定性提升" : "通知稳定性下降",
    delta.mttrMinutes <= 0 ? "恢复效率提升" : "恢复效率下降",
  ].join("；");

  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return `在最近 ${compare.days} 天窗口内，相比上一同等窗口：${trendText}。` +
    `当前窗口告警 ${compare.current.totals.alerts} 条，误报率 ${compare.current.quality.falsePositiveRate}%，重复率 ${compare.current.quality.duplicateRate}%，通知失败率 ${compare.current.quality.notificationFailureRate}% 。`;
};

/**
 * 符号：createApp（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const createApp = () => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/api/health", (_req, res) => {
    const state = getState();
    res.json({
      ok: true,
      service: "api-alert-engine",
      timestamp: nowIso(),
      uptimeSeconds: Math.round(process.uptime()),
      version: state.meta.version,
      schemaVersion: state.meta.schemaVersion || 1,
      updatedAt: state.meta.updatedAt,
    });
  });

  app.get("/api/dashboard/summary", (_req, res) => {
    const state = getState();
    const payload = withRouteCache(state, "dashboard:summary", () => {
      const indices = buildDerivedApiIndices(state);
      const apiViews = state.apis.map((api) => buildApiListItem(state, api, indices));

      const latestMetrics = apiViews
        .map((api) => api.latestMetrics)
        .filter((metric) => Boolean(metric));

      const activeAlerts = state.alerts.filter((alert) => ACTIVE_ALERT_STATUSES.has(alert.status));

      return {
        meta: {
          generatedAt: nowIso(),
        },
        kpis: {
          apiTotal: state.apis.length,
          apiCritical: apiViews.filter((api) => api.status === "critical").length,
          apiWarning: apiViews.filter((api) => api.status === "warning").length,
          ruleTotal: state.rules.length,
          ruleEnabled: state.rules.filter((rule) => rule.enabled).length,
          alertActive: activeAlerts.length,
          alertP1Active: activeAlerts.filter((alert) => alert.level === "P1").length,
          notificationsToday: state.notifications.filter((item) => {
            const today = new Date().toISOString().slice(0, 10);
            return item.createdAt.startsWith(today);
          }).length,
        },
        runtime: {
          qpsAvg: round(avg(latestMetrics.map((item) => item.qps)), 2),
          errorRateAvg: round(avg(latestMetrics.map((item) => item.errorRate)), 3),
          latencyP95Avg: round(avg(latestMetrics.map((item) => item.latencyP95)), 2),
          availabilityAvg: round(avg(latestMetrics.map((item) => item.availability)), 3),
        },
        topRiskApis: apiViews
          .sort((left, right) => right.activeAlertCount - left.activeAlertCount)
          .slice(0, 5),
        recentAlerts: safeSortByTimeDesc(state.alerts, (item) => item.triggeredAt)
          .slice(0, 8)
          .map((alert) => serializeAlert(state, alert)),
      };
    });
    res.json(payload);
  });

  app.get("/api/dashboard/trends", (req, res) => {
    const state = getState();
    const hours = req.query.hours;
    const bucketMinutes = req.query.bucketMinutes;
    const key = `dashboard:trends:${toNumber(hours, 24)}:${toNumber(bucketMinutes, 30)}`;
    const payload = withRouteCache(state, key, () => ({
      series: buildTrendSeries(state, hours, bucketMinutes),
    }));
    res.json(payload);
  });

  app.get("/api/apis", (req, res) => {
    const state = getState();

    const search = String(req.query.search || "").trim().toLowerCase();
    const owner = String(req.query.owner || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim().toLowerCase();
    const monitorMode = String(req.query.monitorMode || "").trim().toLowerCase();
    const method = String(req.query.method || "").trim().toUpperCase();
    const limit = Math.max(1, Math.min(toNumber(req.query.limit, 1_000), 1_000));
    const offset = Math.max(0, toNumber(req.query.offset, 0));
    const key = `apis:list:${search}:${owner}:${status}:${monitorMode}:${method}:${limit}:${offset}`;
    const payload = withRouteCache(state, key, () => {
      const indices = buildDerivedApiIndices(state);
      const preFiltered = state.apis.filter((api) => {
        if (search) {
          const matched =
            api.name.toLowerCase().includes(search) ||
            api.path.toLowerCase().includes(search) ||
            api.service.toLowerCase().includes(search) ||
            String(api.method || "").toLowerCase().includes(search);
          if (!matched) return false;
        }

        if (owner && !api.owner.toLowerCase().includes(owner)) {
          return false;
        }

        if (monitorMode && String(api.monitor?.mode || "push").toLowerCase() !== monitorMode) {
          return false;
        }

        if (method && normalizeApiMethod(api.method) !== method) {
          return false;
        }

        return true;
      });

      const filtered = preFiltered
        .map((api) => buildApiListItem(state, api, indices))
        .filter((api) => {
          if (status && api.status.toLowerCase() !== status) {
            return false;
          }
          return true;
        })
        .sort((left, right) => right.activeAlertCount - left.activeAlertCount);

      return {
        items: filtered.slice(offset, offset + limit),
        total: filtered.length,
        limit,
        offset,
      };
    });

    res.json(payload);
  });

  app.post("/api/apis", (req, res) => {
    const body = req.body ?? {};

    if (!body.name || !body.path || !body.owner || !body.service) {
      res.status(400).json({ error: "name, path, owner, service are required." });
      return;
    }

    const created = {};

    try {
      mutateState((state) => {
        const method = normalizeApiMethod(body.method, normalizeApiMethod(body.monitor?.checkConfig?.method));
        const path = String(body.path);

        if (state.apis.some((item) => item.path === path && normalizeApiMethod(item.method) === method)) {
          throw new Error(`API already exists: ${method} ${path}`);
        }

        const api = {
          id: uid("api"),
          method,
          name: String(body.name),
          path,
          owner: String(body.owner),
          service: String(body.service),
          environment: API_ENV_VALUES.includes(String(body.environment))
            ? String(body.environment)
            : "production",
          tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
          baseline: buildApiBaseline(body.baseline),
          monitor: normalizeMonitorConfig(
            body.monitor,
            createPushMonitor({
              source: body.monitor?.mode === "pull" ? "http-check" : "manual",
            }),
          ),
          status: "healthy",
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };

        state.apis.push(api);
        created.api = api;

        addAuditLog(state, {
          user: getActor(body),
          action: "api_created",
          target: api.id,
          detail: `Created API ${api.method} ${api.path}`,
        });
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ item: created.api });
  });

  app.post("/api/apis/import-openapi", async (req, res) => {
    const body = req.body ?? {};
    const actor = getActor(body);

    try {
      const doc = await parseOpenApiDocument(body);
      const previewItems = buildOpenApiImportPreview(doc, body.defaults || {});
      const responsePayload = {
        total: previewItems.length,
        created: 0,
        skipped: 0,
        errors: [],
        items: [],
      };

      mutateState((state) => {
        for (const record of previewItems) {
          const duplicated = state.apis.some(
            (item) =>
              normalizeApiMethod(item.method) === normalizeApiMethod(record.method) &&
              item.path === record.path,
          );

          if (duplicated) {
            responsePayload.skipped += 1;
            continue;
          }

          const api = createApiFromOpenApiRecord(record);
          state.apis.push(api);
          responsePayload.created += 1;
          responsePayload.items.push(api);
        }

        addAuditLog(state, {
          user: actor,
          action: "api_openapi_imported",
          target: "openapi",
          detail: `imported=${responsePayload.created} skipped=${responsePayload.skipped}` ,
        });
      });

      res.status(201).json(responsePayload);
    } catch (error) {
      res.status(400).json({ error: error.message || "openapi_import_failed" });
    }
  });

  app.post("/api/apis/bulk-delete", (req, res) => {
    const ids = toUniqueIdList(req.body?.ids);
    const cascade = Boolean(req.body?.cascade);
    const actor = getActor(req.body);

    if (!ids.length) {
      res.status(400).json({ error: "ids is required and cannot be empty." });
      return;
    }

    const summary = {
      requested: ids.length,
      cascade,
      deletedCount: 0,
      deletedIds: [],
      notFoundIds: [],
      conflicts: [],
      removedTotals: {
        metrics: 0,
        alerts: 0,
        ruleHits: 0,
        scopedRules: 0,
        notifications: 0,
      },
    };

    mutateState((state) => {
      for (const apiId of ids) {
        const result = removeApiFromState(state, apiId, { cascade });
        if (!result.ok) {
          if (result.reason === "not_found") {
            summary.notFoundIds.push(apiId);
            continue;
          }
          if (result.reason === "has_related_data") {
            summary.conflicts.push({
              id: apiId,
              path: result.item?.path || null,
              related: result.related,
            });
          }
          continue;
        }

        summary.deletedCount += 1;
        summary.deletedIds.push(apiId);
        summary.removedTotals.metrics += result.removed.metrics;
        summary.removedTotals.alerts += result.removed.alerts;
        summary.removedTotals.ruleHits += result.removed.ruleHits;
        summary.removedTotals.scopedRules += result.removed.scopedRules;
        summary.removedTotals.notifications += result.removed.notifications;
      }

      addAuditLog(state, {
        user: actor,
        action: "api_bulk_deleted",
        target: "apis",
        detail: `requested=${summary.requested} deleted=${summary.deletedCount} cascade=${cascade}`,
      });
    });

    res.json(summary);
  });
  app.get("/api/apis/:apiId", (req, res) => {
    const state = getState();
    const api = findApiOr404(state, req.params.apiId, res);
    if (!api) return;

    const metrics = state.metrics.filter((item) => item.apiId === api.id);
    const recentMetrics = safeSortByTimeDesc(metrics).slice(0, 180).reverse();
    const recentAlerts = safeSortByTimeDesc(
      state.alerts.filter((alert) => alert.apiId === api.id),
      (item) => item.triggeredAt,
    )
      .slice(0, 20)
      .map((alert) => serializeAlert(state, alert));

    const recentRuleHits = safeSortByTimeDesc(
      state.ruleHits.filter((hit) => hit.apiId === api.id),
      (item) => item.evaluatedAt,
    ).slice(0, 30);

    const applicableRules = state.rules.filter((rule) => {
      if (!rule.scope || rule.scope.type === "global") return true;
      if (rule.scope.type === "api") return rule.scope.value === api.id;
      if (rule.scope.type === "service") return rule.scope.value === api.service;
      return false;
    });

    res.json({
      item: {
        ...api,
        status: computeApiStatus(state, api.id),
        activeAlertCount: getActiveAlertCountByApi(state, api.id),
        latestMetrics: getLatestMetricForApi(state, api.id),
      },
      metrics: recentMetrics,
      alerts: recentAlerts,
      ruleHits: recentRuleHits,
      rules: applicableRules,
    });
  });

  app.patch("/api/apis/:apiId", (req, res) => {
    const body = req.body ?? {};
    const apiId = req.params.apiId;
    const operator = getActor(body);

    const updated = {};

    try {
      mutateState((state) => {
        const api = findApiOr404(state, apiId, res);
        if (!api) return;

        const patchableFields = ["name", "path", "owner", "service", "tags", "environment", "method"];
        for (const field of patchableFields) {
          if (!(field in body)) continue;

          if (field === "environment") {
            api.environment = API_ENV_VALUES.includes(String(body.environment))
              ? String(body.environment)
              : api.environment;
            continue;
          }

          if (field === "method") {
            api.method = normalizeApiMethod(body.method, api.method);
            continue;
          }

          if (field === "path") {
            const nextPath = String(body.path);
            const nextMethod = normalizeApiMethod(body.method || api.method);
            if (
              state.apis.some(
                (item) =>
                  item.id !== api.id &&
                  item.path === nextPath &&
                  normalizeApiMethod(item.method) === nextMethod,
              )
            ) {
              throw new Error(`API already exists: ${nextMethod} ${nextPath}`);
            }
            api.path = nextPath;
            continue;
          }

          api[field] = field === "tags" && Array.isArray(body.tags) ? body.tags.map(String) : body[field];
        }

        if ("method" in body && !("path" in body)) {
          const nextMethod = normalizeApiMethod(body.method, api.method);
          if (
            state.apis.some(
              (item) =>
                item.id !== api.id &&
                item.path === api.path &&
                normalizeApiMethod(item.method) === nextMethod,
            )
          ) {
            throw new Error(`API already exists: ${nextMethod} ${api.path}`);
          }
        }

        if (body.baseline && typeof body.baseline === "object") {
          api.baseline = buildApiBaseline(body.baseline, api.baseline);
        }

        if ("monitor" in body) {
          api.monitor = normalizeMonitorConfig(body.monitor, api.monitor || createPushMonitor());
          api.method = normalizeApiMethod(body.method || api.monitor?.checkConfig?.method || api.method);
        }

        api.updatedAt = nowIso();
        updated.api = api;

        addAuditLog(state, {
          user: operator,
          action: "api_updated",
          target: api.id,
          detail: `Updated API ${api.method} ${api.path}`,
        });
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    if (!updated.api) return;

    res.json({ item: updated.api });
  });

  app.post("/api/apis/:apiId/check-now", async (req, res) => {
    const apiId = req.params.apiId;
    const actor = getActor(req.body);
    const snapshot = getState();
    const api = snapshot.apis.find((item) => item.id === apiId);

    if (!api) {
      res.status(404).json({ error: `API not found: ${apiId}` });
      return;
    }

    if (api.monitor?.mode !== "pull") {
      res.status(400).json({
        error: "manual check is only available for pull mode APIs",
      });
      return;
    }

    const credential = findCredentialForApi(snapshot, api);
    let resolvedCredentialSecrets = null;
    if (credential) {
      try {
        resolvedCredentialSecrets = resolveCredentialSecrets(credential);
      } catch (error) {
        res.status(400).json({ error: String(error?.message || "resolve_credential_failed") });
        return;
      }
    }

    const checkResult = await runHttpCheck(api, {
      credential,
      resolvedCredentialSecrets,
    });
    const output = {};

    mutateState((state) => {
      const targetApi = state.apis.find((item) => item.id === apiId);
      if (!targetApi) return;

      applyCheckResultToApi(targetApi, checkResult);

      const metric = buildMetricFromPullCheck(targetApi, checkResult);
      const engineResult = ingestMetric(state, metric, {
        source: "manual-check",
        onAlertCreated: (alert, rule, apiItem) => {
          dispatchAlertNotifications(state, alert, rule, apiItem);
        },
        onAlertResolved: (alert, rule, apiItem) => {
          dispatchAlertRecoveryNotifications(state, alert, rule, apiItem);
        },
      });

      updateApiStatusInState(state, apiId);

      addAuditLog(state, {
        user: actor,
        action: "api_checked_manually",
        target: apiId,
        detail: `Check result success=${checkResult.success} status=${checkResult.statusCode ?? "n/a"}`,
      });

      output.payload = {
        checkResult,
        metric,
        createdAlerts: engineResult.createdAlerts.length,
        resolvedAlerts: engineResult.resolvedAlerts.length,
      };
    });

    res.json(output.payload);
  });

  app.delete("/api/apis/:apiId", (req, res) => {
    const apiId = req.params.apiId;
    const cascade = Boolean(req.body?.cascade) || req.query.cascade === "true";
    const actor = getActor(req.body);
    let responsePayload = null;

    mutateState((state) => {
      const result = removeApiFromState(state, apiId, { cascade });
      if (!result.ok) {
        if (result.reason === "not_found") {
          res.status(404).json({ error: `API not found: ${apiId}` });
          return;
        }
        if (result.reason === "has_related_data") {
          res.status(409).json({
            error: "API has related data, use cascade=true to delete all dependencies.",
            related: result.related,
          });
        }
        return;
      }

      addAuditLog(state, {
        user: actor,
        action: "api_deleted",
        target: apiId,
        detail: `Deleted API ${result.item.path} cascade=${cascade}`,
      });

      responsePayload = {
        item: result.item,
        cascade: result.cascade,
        removed: result.removed,
      };
    });

    if (!responsePayload) return;
    res.json(responsePayload);
  });

  app.get("/api/apis/:apiId/metrics", (req, res) => {
    const state = getState();
    const api = findApiOr404(state, req.params.apiId, res);
    if (!api) return;

    const limit = Math.max(1, Math.min(toNumber(req.query.limit, 200), 2_000));
    const items = safeSortByTimeDesc(
      state.metrics.filter((metric) => metric.apiId === api.id),
      (item) => item.timestamp,
    )
      .slice(0, limit)
      .reverse();

    res.json({ items, total: items.length });
  });

  app.get("/api/apis/:apiId/rule-hits", (req, res) => {
    const state = getState();
    const api = findApiOr404(state, req.params.apiId, res);
    if (!api) return;

    const limit = Math.max(1, Math.min(toNumber(req.query.limit, 100), 1_000));
    const items = safeSortByTimeDesc(
      state.ruleHits.filter((hit) => hit.apiId === api.id),
      (item) => item.evaluatedAt,
    ).slice(0, limit);

    res.json({ items, total: items.length });
  });

  app.post("/api/metrics", (req, res) => {
    const rawPayload = req.body;
    const items = Array.isArray(rawPayload)
      ? rawPayload
      : Array.isArray(rawPayload?.metrics)
      ? rawPayload.metrics
      : [rawPayload];

    if (!items.length) {
      res.status(400).json({ error: "Metric payload is empty." });
      return;
    }

    if (process.env.ASYNC_METRICS_ENABLED === "true") {
      const result = enqueueMetrics(items);
      res.json({
        queued: result.queued,
        dropped: result.dropped,
        mode: "async",
      });
      return;
    }

    const summary = {
      ingested: 0,
      createdAlerts: 0,
      resolvedAlerts: 0,
      errors: [],
    };

    mutateState((state) => {
      const result = ingestMetricsBatch(state, items, {
        source: "api",
        onAlertCreated: (alert, rule, api) => {
          dispatchAlertNotifications(state, alert, rule, api);
        },
        onAlertResolved: (alert, rule, api) => {
          dispatchAlertRecoveryNotifications(state, alert, rule, api);
        },
      });

      summary.ingested = result.ingested;
      summary.createdAlerts = result.createdAlerts;
      summary.resolvedAlerts = result.resolvedAlerts;
      summary.errors = result.errors;
    });

    res.json(summary);
  });

  app.post("/api/rules/parse-dsl", (req, res) => {
    const dsl = String(req.body?.dsl || "").trim();
    if (!dsl) {
      res.status(400).json({ error: "dsl is required" });
      return;
    }
    const result = parseRuleDsl(dsl);
    if (result.error) {
      res.status(400).json({ error: result.error, warnings: result.warnings || [] });
      return;
    }
    res.json({ rule: result.rule, warnings: result.warnings || [] });
  });

  app.post("/api/rules/create-dsl", (req, res) => {
    const dsl = String(req.body?.dsl || "").trim();
    const actor = String(req.body?.actor || "system");
    if (!dsl) {
      res.status(400).json({ error: "dsl is required" });
      return;
    }
    const parsed = parseRuleDsl(dsl);
    if (parsed.error) {
      res.status(400).json({ error: parsed.error, warnings: parsed.warnings || [] });
      return;
    }
    const body = { ...parsed.rule, actor };
    const validationError = validateRulePayload(body);
    if (validationError) {
      res.status(400).json({ error: validationError, warnings: parsed.warnings || [] });
      return;
    }

    const snapshot = getState();
    const actionsValidation = validateRuleActionsAgainstChannels(snapshot, body.actions);
    if (actionsValidation.error) {
      res.status(400).json({ error: actionsValidation.error });
      return;
    }

    const created = {};
    mutateState((state) => {
      const rule = {
        id: uid("rule"),
        ruleType: String(body.ruleType || "threshold"),
        name: String(body.name),
        description: String(body.description ?? ""),
        enabled: body.enabled !== false,
        priority: body.priority,
        scope: normalizeRuleScope(body.scope),
        metric: body.metric,
        operator: body.operator,
        threshold: toNumber(body.threshold, 0),
        aggregation: body.aggregation,
        windowMinutes: Math.max(1, toNumber(body.windowMinutes, 5)),
        minSamples: Math.max(1, toNumber(body.minSamples, 1)),
        failureCount: Math.max(2, toNumber(body.failureCount, body.minSamples || 3)),
        shortWindowMinutes: Math.max(1, toNumber(body.shortWindowMinutes, 5)),
        longWindowMinutes: Math.max(2, toNumber(body.longWindowMinutes, 60)),
        burnRateThreshold: Math.max(1, toNumber(body.burnRateThreshold, 2)),
        sloTarget: Math.min(Math.max(toNumber(body.sloTarget, 99.9), 90), 100),
          cooldownMinutes: Math.max(0, toNumber(body.cooldownMinutes, 10)),
          conditions: normalizeRuleConditions(body.conditions),
          conditionLogic:
            body.conditionLogic && RULE_CONDITION_LOGIC_VALUES.includes(String(body.conditionLogic))
              ? String(body.conditionLogic)
              : "all",
          actions: actionsValidation.actions,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          lastTriggeredByApi: {},
      };

      state.rules.push(rule);
      created.rule = rule;

      addAuditLog(state, {
        user: getActor(body),
        action: "rule_created",
        target: rule.id,
        detail: `Created rule ${rule.name}`,
      });
    });

    res.status(201).json({ item: created.rule, warnings: parsed.warnings || [] });
  });

  app.get("/api/rules", (req, res) => {
    const state = getState();
    const enabledFilter = req.query.enabled;

    let items = [...state.rules];

    if (enabledFilter !== undefined) {
      const wanted = String(enabledFilter) === "true";
      items = items.filter((rule) => Boolean(rule.enabled) === wanted);
    }

    const mapped = items.map((rule) => {
      const activeAlertCount = state.alerts.filter(
        (alert) => alert.ruleId === rule.id && ACTIVE_ALERT_STATUSES.has(alert.status),
      ).length;

      return {
        ...rule,
        activeAlertCount,
      };
    });

    res.json({ items: mapped, total: mapped.length });
  });

  app.post("/api/rules", (req, res) => {
    const body = req.body ?? {};
    const validationError = validateRulePayload(body);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const snapshot = getState();
    const actionsValidation = validateRuleActionsAgainstChannels(snapshot, body.actions);
    if (actionsValidation.error) {
      res.status(400).json({ error: actionsValidation.error });
      return;
    }

    const created = {};

    mutateState((state) => {
      const rule = {
        id: uid("rule"),
        ruleType: String(body.ruleType || "threshold"),
        name: String(body.name),
        description: String(body.description ?? ""),
        enabled: body.enabled !== false,
        priority: body.priority,
        scope: normalizeRuleScope(body.scope),
        metric: body.metric,
        operator: body.operator,
        threshold: toNumber(body.threshold, 0),
        aggregation: body.aggregation,
        windowMinutes: Math.max(1, toNumber(body.windowMinutes, 5)),
        minSamples: Math.max(1, toNumber(body.minSamples, 1)),
        failureCount: Math.max(2, toNumber(body.failureCount, body.minSamples || 3)),
        shortWindowMinutes: Math.max(1, toNumber(body.shortWindowMinutes, 5)),
        longWindowMinutes: Math.max(2, toNumber(body.longWindowMinutes, 60)),
        burnRateThreshold: Math.max(1, toNumber(body.burnRateThreshold, 2)),
        sloTarget: Math.min(Math.max(toNumber(body.sloTarget, 99.9), 90), 100),
          cooldownMinutes: Math.max(0, toNumber(body.cooldownMinutes, 10)),
          conditions: normalizeRuleConditions(body.conditions),
          conditionLogic:
            body.conditionLogic && RULE_CONDITION_LOGIC_VALUES.includes(String(body.conditionLogic))
              ? String(body.conditionLogic)
              : "all",
          actions: actionsValidation.actions,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          lastTriggeredByApi: {},
      };

      state.rules.push(rule);
      created.rule = rule;

      addAuditLog(state, {
        user: getActor(body),
        action: "rule_created",
        target: rule.id,
        detail: `Created rule ${rule.name}`,
      });
    });

    res.status(201).json({ item: created.rule });
  });

  app.post("/api/rules/auto-create", (req, res) => {
    const body = req.body ?? {};
    const state = getState();
    const actionsValidation = validateRuleActionsAgainstChannels(
      state,
      Array.isArray(body.actions) && body.actions.length
        ? body.actions
        : state.channels.filter((channel) => channel.enabled).slice(0, 2).map((channel) => channel.id),
    );
    if (actionsValidation.error) {
      res.status(400).json({ error: actionsValidation.error });
      return;
    }

    const auto = createAutoRuleCandidates(state, {
      scope: body.scope,
      sensitivity: body.sensitivity,
      days: body.days,
    });

    if (auto.scopedApisCount === 0) {
      res.status(400).json({ error: "No APIs matched current scope." });
      return;
    }

    const created = [];
    const skipped = [];
    mutateState((mutable) => {
      for (const candidate of auto.candidates) {
        const exists = mutable.rules.find((item) => {
          if (item.metric !== candidate.metric) return false;
          if (item.operator !== candidate.operator) return false;
          const scopeA = normalizeRuleScope(item.scope);
          return scopeA.type === auto.scope.type && String(scopeA.value || "") === String(auto.scope.value || "");
        });
        if (exists) {
          skipped.push({
            metric: candidate.metric,
            reason: `existing_rule:${exists.id}`,
          });
          continue;
        }

        const scopeLabel =
          auto.scope.type === "global" ? "Global" : auto.scope.type === "service" ? `Service:${auto.scope.value}` : `API:${auto.scope.value}`;
        const rule = {
          id: uid("rule"),
          ruleType: "threshold",
          name: `${scopeLabel} ${candidate.name}`,
          description: candidate.description,
          enabled: true,
          priority: body.priority && RULE_PRIORITY_VALUES.includes(String(body.priority)) ? String(body.priority) : candidate.priority,
          scope: auto.scope,
          metric: candidate.metric,
          operator: candidate.operator,
          threshold: candidate.threshold,
          aggregation: candidate.aggregation,
          windowMinutes: auto.profile.window,
          minSamples: auto.profile.minSamples,
          failureCount: Math.max(2, auto.profile.minSamples),
          shortWindowMinutes: 5,
          longWindowMinutes: 60,
          burnRateThreshold: 2,
          sloTarget: 99.9,
          cooldownMinutes: auto.profile.cooldown,
          actions: actionsValidation.actions,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          lastTriggeredByApi: {},
        };
        mutable.rules.push(rule);
        created.push(rule);
      }

      addAuditLog(mutable, {
        user: getActor(body),
        action: "rules_auto_created",
        target: "rules",
        detail: `created=${created.length}, skipped=${skipped.length}, scope=${auto.scope.type}`,
      });
    });

    res.status(201).json({
      generatedAt: nowIso(),
      scope: auto.scope,
      sensitivity: String(body.sensitivity || "medium"),
      created,
      skipped,
      total: created.length,
      basis: {
        scopedApis: auto.scopedApisCount,
        scopedMetrics: auto.scopedMetricsCount,
      },
    });
  });

  app.post("/api/rules/bulk-toggle", (req, res) => {
    const ids = toUniqueIdList(req.body?.ids);
    const enabled = Boolean(req.body?.enabled);
    const actor = getActor(req.body);

    if (!ids.length) {
      res.status(400).json({ error: "ids is required and cannot be empty." });
      return;
    }

    const summary = {
      requested: ids.length,
      enabled,
      updatedCount: 0,
      updatedIds: [],
      notFoundIds: [],
    };

    mutateState((state) => {
      for (const ruleId of ids) {
        const rule = state.rules.find((item) => item.id === ruleId);
        if (!rule) {
          summary.notFoundIds.push(ruleId);
          continue;
        }
        rule.enabled = enabled;
        rule.updatedAt = nowIso();
        summary.updatedCount += 1;
        summary.updatedIds.push(ruleId);
      }

      addAuditLog(state, {
        user: actor,
        action: "rules_bulk_toggled",
        target: "rules",
        detail: `requested=${summary.requested} updated=${summary.updatedCount} enabled=${enabled}`,
      });
    });

    res.json(summary);
  });

  app.post("/api/rules/bulk-delete", (req, res) => {
    const ids = toUniqueIdList(req.body?.ids);
    const actor = getActor(req.body);

    if (!ids.length) {
      res.status(400).json({ error: "ids is required and cannot be empty." });
      return;
    }

    const summary = {
      requested: ids.length,
      deletedCount: 0,
      deletedIds: [],
      notFoundIds: [],
    };

    mutateState((state) => {
      for (const ruleId of ids) {
        const index = state.rules.findIndex((item) => item.id === ruleId);
        if (index === -1) {
          summary.notFoundIds.push(ruleId);
          continue;
        }
        state.rules.splice(index, 1);
        summary.deletedCount += 1;
        summary.deletedIds.push(ruleId);
      }

      addAuditLog(state, {
        user: actor,
        action: "rules_bulk_deleted",
        target: "rules",
        detail: `requested=${summary.requested} deleted=${summary.deletedCount}`,
      });
    });

    res.json(summary);
  });

  app.patch("/api/rules/:ruleId", (req, res) => {
    const body = req.body ?? {};
    const ruleId = req.params.ruleId;

    const updated = {};

    mutateState((state) => {
      const rule = state.rules.find((item) => item.id === ruleId);
      if (!rule) {
        res.status(404).json({ error: `Rule not found: ${ruleId}` });
        return;
      }

      if ("name" in body) rule.name = String(body.name);
      if ("description" in body) rule.description = String(body.description ?? "");
      if ("enabled" in body) rule.enabled = Boolean(body.enabled);
      if ("ruleType" in body && RULE_TYPE_VALUES.includes(String(body.ruleType))) {
        rule.ruleType = String(body.ruleType);
        if (rule.ruleType !== "threshold") {
          rule.conditions = [];
          rule.conditionLogic = "all";
        }
      }
      if ("priority" in body && RULE_PRIORITY_VALUES.includes(body.priority)) rule.priority = body.priority;
      if ("metric" in body && RULE_METRICS.includes(body.metric)) rule.metric = body.metric;
      if ("operator" in body && RULE_OPERATOR_VALUES.includes(body.operator)) rule.operator = body.operator;
      if ("aggregation" in body && RULE_AGGREGATION_VALUES.includes(body.aggregation)) {
        rule.aggregation = body.aggregation;
      }
      if ("conditionLogic" in body) {
        const candidate = String(body.conditionLogic);
        if (RULE_CONDITION_LOGIC_VALUES.includes(candidate)) {
          rule.conditionLogic = candidate;
        }
      }
      if ("conditions" in body) {
        const targetRuleType = "ruleType" in body ? String(body.ruleType) : String(rule.ruleType || "threshold");
        if (targetRuleType !== "threshold") {
          res.status(400).json({ error: "conditions only supported for threshold rules." });
          return;
        }
        const conditionError = validateRuleConditionsInput(body.conditions);
        if (conditionError) {
          res.status(400).json({ error: conditionError });
          return;
        }
        rule.conditions = normalizeRuleConditions(body.conditions);
      }
      if ("threshold" in body) rule.threshold = toNumber(body.threshold, rule.threshold);
      if ("windowMinutes" in body) rule.windowMinutes = Math.max(1, toNumber(body.windowMinutes, rule.windowMinutes));
      if ("minSamples" in body) rule.minSamples = Math.max(1, toNumber(body.minSamples, rule.minSamples));
      if ("failureCount" in body) rule.failureCount = Math.max(2, toNumber(body.failureCount, rule.failureCount || 3));
      if ("shortWindowMinutes" in body) {
        rule.shortWindowMinutes = Math.max(1, toNumber(body.shortWindowMinutes, rule.shortWindowMinutes || 5));
      }
      if ("longWindowMinutes" in body) {
        rule.longWindowMinutes = Math.max(2, toNumber(body.longWindowMinutes, rule.longWindowMinutes || 60));
      }
      if ("burnRateThreshold" in body) {
        rule.burnRateThreshold = Math.max(1, toNumber(body.burnRateThreshold, rule.burnRateThreshold || 2));
      }
      if ("sloTarget" in body) {
        rule.sloTarget = Math.min(Math.max(toNumber(body.sloTarget, rule.sloTarget || 99.9), 90), 100);
      }
      if ("cooldownMinutes" in body) {
        rule.cooldownMinutes = Math.max(0, toNumber(body.cooldownMinutes, rule.cooldownMinutes));
      }
      if ("actions" in body && Array.isArray(body.actions)) {
        const actionsValidation = validateRuleActionsAgainstChannels(state, body.actions);
        if (actionsValidation.error) {
          res.status(400).json({ error: actionsValidation.error });
          return;
        }
        rule.actions = actionsValidation.actions;
      }
      if ("scope" in body) rule.scope = normalizeRuleScope(body.scope);

      rule.updatedAt = nowIso();
      updated.rule = rule;

      addAuditLog(state, {
        user: getActor(body),
        action: "rule_updated",
        target: rule.id,
        detail: `Updated rule ${rule.name}`,
      });
    });

    if (!updated.rule) return;

    res.json({ item: updated.rule });
  });

  app.delete("/api/rules/:ruleId", (req, res) => {
    const ruleId = req.params.ruleId;
    let removed = null;

    mutateState((state) => {
      const index = state.rules.findIndex((item) => item.id === ruleId);

      if (index === -1) {
        res.status(404).json({ error: `Rule not found: ${ruleId}` });
        return;
      }

      removed = state.rules[index];
      state.rules.splice(index, 1);

      addAuditLog(state, {
        user: getActor(req.body),
        action: "rule_deleted",
        target: removed.id,
        detail: `Deleted rule ${removed.name}`,
      });
    });

    if (!removed) return;

    res.json({ item: removed });
  });

  app.post("/api/rules/:ruleId/toggle", (req, res) => {
    const ruleId = req.params.ruleId;
    const enabled = Boolean(req.body?.enabled);

    const updated = {};

    mutateState((state) => {
      const rule = state.rules.find((item) => item.id === ruleId);
      if (!rule) {
        res.status(404).json({ error: `Rule not found: ${ruleId}` });
        return;
      }

      rule.enabled = enabled;
      rule.updatedAt = nowIso();
      updated.rule = rule;

      addAuditLog(state, {
        user: getActor(req.body),
        action: "rule_toggled",
        target: rule.id,
        detail: `Rule ${rule.name} enabled=${enabled}`,
      });
    });

    if (!updated.rule) return;

    res.json({ item: updated.rule });
  });

  app.post("/api/rules/:ruleId/simulate", (req, res) => {
    const state = getState();
    const rule = state.rules.find((item) => item.id === req.params.ruleId);

    if (!rule) {
      res.status(404).json({ error: `Rule not found: ${req.params.ruleId}` });
      return;
    }

    const bodyApiId = req.body?.apiId;

    const targets = bodyApiId
      ? state.apis.filter((api) => api.id === bodyApiId)
      : state.apis.filter((api) => {
          if (!rule.scope || rule.scope.type === "global") return true;
          if (rule.scope.type === "api") return rule.scope.value === api.id;
          if (rule.scope.type === "service") return rule.scope.value === api.service;
          return false;
        });

    const items = targets.map((api) => {
      const evaluation = previewRuleEvaluation(state, rule, api.id, nowIso());
      return {
        apiId: api.id,
        apiPath: api.path,
        matched: evaluation.matched,
        evaluable: evaluation.evaluable,
        value: evaluation.value,
        sampleCount: evaluation.sampleCount,
        reason: evaluation.reason ?? null,
      };
    });

    res.json({
      ruleId: rule.id,
      generatedAt: nowIso(),
      items,
    });
  });

  app.get("/api/alerts", (req, res) => {
    const state = getState();

    const status = String(req.query.status || "").trim();
    const level = String(req.query.level || "").trim();
    const apiId = String(req.query.apiId || "").trim();
    const limit = Math.max(1, Math.min(toNumber(req.query.limit, 200), 1_000));
    const key = `alerts:list:${status}:${level}:${apiId}:${limit}`;
    const payload = withRouteCache(state, key, () => {
      let items = state.alerts;

      if (status) {
        items = items.filter((alert) => alert.status === status);
      }

      if (level) {
        items = items.filter((alert) => alert.level === level);
      }

      if (apiId) {
        items = items.filter((alert) => alert.apiId === apiId);
      }

      items = safeSortByTimeDesc(items, (item) => item.triggeredAt).slice(0, limit);

      return {
        items: items.map((alert) => serializeAlert(state, alert)),
        total: items.length,
      };
    });

    res.json(payload);
  });

  app.post("/api/alerts/bulk-status", (req, res) => {
    const ids = toUniqueIdList(req.body?.ids);
    const status = req.body?.status;
    const actor = getActor(req.body);
    const note = String(req.body?.note || "");

    if (!ids.length) {
      res.status(400).json({ error: "ids is required and cannot be empty." });
      return;
    }

    if (!ALERT_STATUS_VALUES.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${ALERT_STATUS_VALUES.join(", ")}` });
      return;
    }

    const summary = {
      requested: ids.length,
      status,
      updatedCount: 0,
      updatedIds: [],
      notFoundIds: [],
      recoveryNotifications: 0,
    };

    mutateState((state) => {
      const touchedApiIds = new Set();

      for (const alertId of ids) {
        const alert = state.alerts.find((item) => item.id === alertId);
        if (!alert) {
          summary.notFoundIds.push(alertId);
          continue;
        }

        const previousStatus = alert.status;
        alert.status = status;
        alert.updatedAt = nowIso();

        if (status === "acknowledged") {
          alert.acknowledgedBy = actor;
        }

        if (status === "resolved" || status === "closed") {
          alert.resolvedAt = alert.updatedAt;
        }

        appendAlertEvent(alert, "status_change", actor, note || `${previousStatus} -> ${status}`);
        touchedApiIds.add(alert.apiId);
        summary.updatedCount += 1;
        summary.updatedIds.push(alertId);

        if (
          (status === "resolved" || status === "closed") &&
          (previousStatus === "open" || previousStatus === "acknowledged")
        ) {
          const before = state.notifications.length;
          const rule = state.rules.find((item) => item.id === alert.ruleId);
          const api = state.apis.find((item) => item.id === alert.apiId);
          if (rule && api) {
            dispatchAlertRecoveryNotifications(state, alert, rule, api);
            const created = state.notifications.length - before;
            if (created > 0) {
              summary.recoveryNotifications += created;
            }
          }
        }
      }

      for (const apiId of touchedApiIds) {
        updateApiStatusInState(state, apiId);
      }

      addAuditLog(state, {
        user: actor,
        action: "alerts_bulk_status_updated",
        target: "alerts",
        detail: `requested=${summary.requested} updated=${summary.updatedCount} status=${status}`,
      });
    });

    res.json(summary);
  });

  app.post("/api/alerts/bulk-delete", (req, res) => {
    const ids = toUniqueIdList(req.body?.ids);
    const actor = getActor(req.body);

    if (!ids.length) {
      res.status(400).json({ error: "ids is required and cannot be empty." });
      return;
    }

    const summary = {
      requested: ids.length,
      deletedCount: 0,
      deletedIds: [],
      notFoundIds: [],
      removedNotifications: 0,
    };

    mutateState((state) => {
      const touchedApiIds = new Set();

      for (const alertId of ids) {
        const index = state.alerts.findIndex((item) => item.id === alertId);
        if (index === -1) {
          summary.notFoundIds.push(alertId);
          continue;
        }

        const removed = state.alerts[index];
        state.alerts.splice(index, 1);
        touchedApiIds.add(removed.apiId);

        const removedNotifications = state.notifications.filter((item) => item.alertId === alertId).length;
        if (removedNotifications > 0) {
          state.notifications = state.notifications.filter((item) => item.alertId !== alertId);
        }

        summary.deletedCount += 1;
        summary.deletedIds.push(alertId);
        summary.removedNotifications += removedNotifications;
      }

      for (const apiId of touchedApiIds) {
        updateApiStatusInState(state, apiId);
      }

      addAuditLog(state, {
        user: actor,
        action: "alerts_bulk_deleted",
        target: "alerts",
        detail: `requested=${summary.requested} deleted=${summary.deletedCount}`,
      });
    });

    res.json(summary);
  });

  app.get("/api/alerts/:alertId", (req, res) => {
    const state = getState();
    const alert = state.alerts.find((item) => item.id === req.params.alertId);

    if (!alert) {
      res.status(404).json({ error: `Alert not found: ${req.params.alertId}` });
      return;
    }

    const notificationHistory = state.notifications.filter((item) => item.alertId === alert.id);

    res.json({
      item: serializeAlert(state, alert),
      notifications: safeSortByTimeDesc(notificationHistory, (item) => item.createdAt).slice(0, 50),
    });
  });

  app.patch("/api/alerts/:alertId/status", (req, res) => {
    const status = req.body?.status;
    const operator = getActor(req.body);
    const note = req.body?.note || "";

    if (!ALERT_STATUS_VALUES.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${ALERT_STATUS_VALUES.join(", ")}` });
      return;
    }

    const updated = {};

    mutateState((state) => {
      const alert = state.alerts.find((item) => item.id === req.params.alertId);

      if (!alert) {
        res.status(404).json({ error: `Alert not found: ${req.params.alertId}` });
        return;
      }

      const previousStatus = alert.status;
      alert.status = status;
      alert.updatedAt = nowIso();

      if (status === "acknowledged") {
        alert.acknowledgedBy = operator;
      }

      if (status === "resolved" || status === "closed") {
        alert.resolvedAt = alert.updatedAt;
      }

      appendAlertEvent(alert, "status_change", operator, note || `${previousStatus} -> ${status}`);

      updated.alert = alert;

      addAuditLog(state, {
        user: operator,
        action: "alert_status_updated",
        target: alert.id,
        detail: `${previousStatus} -> ${status}`,
      });

      if (
        (status === "resolved" || status === "closed") &&
        (previousStatus === "open" || previousStatus === "acknowledged")
      ) {
        const rule = state.rules.find((item) => item.id === alert.ruleId);
        const api = state.apis.find((item) => item.id === alert.apiId);
        if (rule && api) {
          dispatchAlertRecoveryNotifications(state, alert, rule, api);
        }
      }

      const api = state.apis.find((item) => item.id === alert.apiId);
      if (api) {
        api.status = computeApiStatus(state, api.id);
      }
    });

    if (!updated.alert) return;

    res.json({ item: updated.alert });
  });

  app.delete("/api/alerts/:alertId", (req, res) => {
    const alertId = req.params.alertId;
    const actor = getActor(req.body);
    let removed = null;
    let removedNotifications = 0;

    mutateState((state) => {
      const index = state.alerts.findIndex((item) => item.id === alertId);
      if (index === -1) {
        res.status(404).json({ error: `Alert not found: ${alertId}` });
        return;
      }

      removed = state.alerts[index];
      state.alerts.splice(index, 1);

      removedNotifications = state.notifications.filter((item) => item.alertId === alertId).length;
      state.notifications = state.notifications.filter((item) => item.alertId !== alertId);

      updateApiStatusInState(state, removed.apiId);

      addAuditLog(state, {
        user: actor,
        action: "alert_deleted",
        target: alertId,
        detail: `Deleted alert for api=${removed.apiId}`,
      });
    });

    if (!removed) return;
    res.json({ item: removed, removedNotifications });
  });

  app.get("/api/channels", (_req, res) => {
    const state = getState();
    res.json({ items: state.channels, total: state.channels.length });
  });

  app.post("/api/channels", (req, res) => {
    const body = req.body ?? {};
    const type = String(body.type || "").trim().toLowerCase();
    const name = String(body.name || "").trim();

    if (!CHANNEL_TYPE_VALUES.includes(type)) {
      res.status(400).json({ error: `Invalid channel type. allowed=${CHANNEL_TYPE_VALUES.join(",")}` });
      return;
    }
    if (!name) {
      res.status(400).json({ error: "Channel name is required." });
      return;
    }

    const created = {};
    mutateState((state) => {
      const exists = state.channels.some(
        (item) => item.name.toLowerCase() === name.toLowerCase() && item.type === type,
      );
      if (exists) {
        res.status(409).json({ error: `Channel already exists: ${type}/${name}` });
        return;
      }

      const channel = {
        id: uid("channel"),
        type,
        name,
        enabled: body.enabled ?? true,
        config: {
          ...getDefaultChannelConfig(type),
          ...(body.config && typeof body.config === "object" ? body.config : {}),
        },
      };

      state.channels.unshift(channel);
      created.item = channel;

      addAuditLog(state, {
        user: getActor(body),
        action: "channel_created",
        target: channel.id,
        detail: `Created channel ${channel.name}`,
      });
    });

    if (!created.item) return;
    res.status(201).json({ item: created.item });
  });

  app.post("/api/channels/bulk-toggle", (req, res) => {
    const ids = toUniqueIdList(req.body?.ids);
    const enabled = Boolean(req.body?.enabled);
    const actor = getActor(req.body);

    if (!ids.length) {
      res.status(400).json({ error: "ids is required and cannot be empty." });
      return;
    }

    const summary = {
      requested: ids.length,
      enabled,
      updatedCount: 0,
      updatedIds: [],
      notFoundIds: [],
    };

    mutateState((state) => {
      for (const channelId of ids) {
        const channel = state.channels.find((item) => item.id === channelId);
        if (!channel) {
          summary.notFoundIds.push(channelId);
          continue;
        }
        channel.enabled = enabled;
        summary.updatedCount += 1;
        summary.updatedIds.push(channelId);
      }

      addAuditLog(state, {
        user: actor,
        action: "channels_bulk_toggled",
        target: "channels",
        detail: `requested=${summary.requested} updated=${summary.updatedCount} enabled=${enabled}`,
      });
    });

    res.json(summary);
  });

  app.post("/api/channels/bulk-delete", (req, res) => {
    const ids = toUniqueIdList(req.body?.ids);
    const force = Boolean(req.body?.force);
    const actor = getActor(req.body);

    if (!ids.length) {
      res.status(400).json({ error: "ids is required and cannot be empty." });
      return;
    }

    const summary = {
      requested: ids.length,
      force,
      deletedCount: 0,
      deletedIds: [],
      notFoundIds: [],
      affectedRules: 0,
      conflicts: [],
    };

    mutateState((state) => {
      const affectedRuleIdSet = new Set();

      for (const channelId of ids) {
        const index = state.channels.findIndex((item) => item.id === channelId);
        if (index === -1) {
          summary.notFoundIds.push(channelId);
          continue;
        }

        if (state.channels.length <= 1) {
          summary.conflicts.push({
            id: channelId,
            reason: "at_least_one_channel_must_be_kept",
          });
          continue;
        }

        const channel = state.channels[index];
        const ruleRefs = state.rules.filter(
          (rule) => rule.actions.includes(channel.id) || rule.actions.includes(channel.type),
        );

        if (ruleRefs.length > 0 && !force) {
          summary.conflicts.push({
            id: channelId,
            reason: "referenced_by_rules",
            referencedByRules: ruleRefs.map((rule) => ({ id: rule.id, name: rule.name })),
          });
          continue;
        }

        if (ruleRefs.length > 0) {
          for (const rule of ruleRefs) {
            affectedRuleIdSet.add(rule.id);
          }
          for (const rule of state.rules) {
            rule.actions = rule.actions.filter(
              (action) => action !== channel.id && action !== channel.type,
            );
          }
        }

        state.channels.splice(index, 1);
        summary.deletedCount += 1;
        summary.deletedIds.push(channelId);
      }

      summary.affectedRules = affectedRuleIdSet.size;

      addAuditLog(state, {
        user: actor,
        action: "channels_bulk_deleted",
        target: "channels",
        detail: `requested=${summary.requested} deleted=${summary.deletedCount} force=${force}`,
      });
    });

    res.json(summary);
  });

  app.patch("/api/channels/:channelId", (req, res) => {
    const body = req.body ?? {};
    const updated = {};

    mutateState((state) => {
      const channel = state.channels.find((item) => item.id === req.params.channelId);

      if (!channel) {
        res.status(404).json({ error: `Channel not found: ${req.params.channelId}` });
        return;
      }

      if ("enabled" in body) {
        channel.enabled = Boolean(body.enabled);
      }

      if ("name" in body) {
        channel.name = String(body.name);
      }

      if ("config" in body && typeof body.config === "object") {
        channel.config = {
          ...channel.config,
          ...body.config,
        };
      }

      updated.channel = channel;

      addAuditLog(state, {
        user: getActor(body),
        action: "channel_updated",
        target: channel.id,
        detail: `Updated channel ${channel.name}`,
      });
    });

    if (!updated.channel) return;

    res.json({ item: updated.channel });
  });

  app.post("/api/channels/:channelId/test", (req, res) => {
    const body = req.body ?? {};
    const output = {};

    mutateState((state) => {
      const channel = state.channels.find((item) => item.id === req.params.channelId);

      if (!channel) {
        res.status(404).json({ error: `Channel not found: ${req.params.channelId}` });
        return;
      }

      const record = dispatchChannelTest(state, channel, getActor(body));

      output.record = record;

      addAuditLog(state, {
        user: getActor(body),
        action: "channel_tested",
        target: channel.id,
        detail: `Tested channel ${channel.name}`,
      });
    });

    if (!output.record) return;

    res.json({ item: output.record });
  });

  app.delete("/api/channels/:channelId", (req, res) => {
    const channelId = req.params.channelId;
    const actor = getActor(req.body);
    const force = Boolean(req.body?.force) || req.query.force === "true";
    let removed = null;
    let affectedRules = 0;

    mutateState((state) => {
      const index = state.channels.findIndex((item) => item.id === channelId);
      if (index === -1) {
        res.status(404).json({ error: `Channel not found: ${channelId}` });
        return;
      }

      if (state.channels.length <= 1) {
        res.status(409).json({ error: "At least one channel must be kept." });
        return;
      }

      const channel = state.channels[index];
      const ruleRefs = state.rules.filter(
        (rule) => rule.actions.includes(channel.id) || rule.actions.includes(channel.type),
      );

      if (ruleRefs.length > 0 && !force) {
        res.status(409).json({
          error: "Channel is referenced by rules, use force=true to detach and delete.",
          referencedByRules: ruleRefs.map((rule) => ({ id: rule.id, name: rule.name })),
        });
        return;
      }

      if (ruleRefs.length > 0) {
        affectedRules = ruleRefs.length;
        for (const rule of state.rules) {
          rule.actions = rule.actions.filter(
            (action) => action !== channel.id && action !== channel.type,
          );
        }
      }

      removed = channel;
      state.channels.splice(index, 1);

      addAuditLog(state, {
        user: actor,
        action: "channel_deleted",
        target: channelId,
        detail: `Deleted channel ${channel.name} force=${force}`,
      });
    });

    if (!removed) return;
    res.json({ item: removed, affectedRules });
  });

  app.patch("/api/alerts/:alertId/feedback", (req, res) => {
    const alertId = req.params.alertId;
    const label = String(req.body?.label || "unknown");
    const note = String(req.body?.note || "");
    const actor = getActor(req.body);

    if (!ALERT_FEEDBACK_VALUES.includes(label)) {
      res.status(400).json({
        error: `label must be one of: ${ALERT_FEEDBACK_VALUES.join(", ")}`,
      });
      return;
    }

    const updated = {};
    mutateState((state) => {
      const alert = state.alerts.find((item) => item.id === alertId);
      if (!alert) {
        res.status(404).json({ error: `Alert not found: ${alertId}` });
        return;
      }

      alert.feedback = {
        label,
        note,
        by: actor,
        at: nowIso(),
      };
      alert.updatedAt = nowIso();
      appendAlertEvent(alert, "feedback", actor, `${label}${note ? `: ${note}` : ""}`);
      updated.item = alert;

      addAuditLog(state, {
        user: actor,
        action: "alert_feedback_updated",
        target: alertId,
        detail: `feedback=${label}`,
      });
    });

    if (!updated.item) return;
    res.json({ item: updated.item });
  });

  app.get("/api/credentials", (_req, res) => {
    const state = getState();
    res.json({
      items: state.credentials.map((item) => sanitizeCredential(item)),
      total: state.credentials.length,
    });
  });

  app.post("/api/credentials", (req, res) => {
    const body = req.body ?? {};
    const type = String(body.type || "bearer");
    if (!body.name || !CREDENTIAL_TYPE_VALUES.includes(type)) {
      res.status(400).json({ error: `name and type(${CREDENTIAL_TYPE_VALUES.join(",")}) are required` });
      return;
    }

    const config = sanitizeCredentialConfigForStorage(type, body.config);
    const errorMessage = validateCredentialConfig(type, config);
    if (errorMessage) {
      res.status(400).json({ error: errorMessage });
      return;
    }
    const created = {};

    mutateState((state) => {
      const credential = {
        id: uid("cred"),
        name: String(body.name),
        type,
        enabled: body.enabled ?? true,
        config,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      state.credentials.push(credential);
      created.item = credential;

      addAuditLog(state, {
        user: getActor(body),
        action: "credential_created",
        target: credential.id,
        detail: `Created credential ${credential.name}`,
      });
    });

    res.status(201).json({ item: sanitizeCredential(created.item) });
  });

  app.post("/api/credentials/bulk-toggle", (req, res) => {
    const ids = toUniqueIdList(req.body?.ids);
    const enabled = Boolean(req.body?.enabled);
    const actor = getActor(req.body);

    if (!ids.length) {
      res.status(400).json({ error: "ids is required and cannot be empty." });
      return;
    }

    const summary = {
      requested: ids.length,
      enabled,
      updatedCount: 0,
      updatedIds: [],
      notFoundIds: [],
    };

    mutateState((state) => {
      for (const credentialId of ids) {
        const credential = state.credentials.find((item) => item.id === credentialId);
        if (!credential) {
          summary.notFoundIds.push(credentialId);
          continue;
        }
        credential.enabled = enabled;
        credential.updatedAt = nowIso();
        summary.updatedCount += 1;
        summary.updatedIds.push(credentialId);
      }

      addAuditLog(state, {
        user: actor,
        action: "credentials_bulk_toggled",
        target: "credentials",
        detail: `requested=${summary.requested} updated=${summary.updatedCount} enabled=${enabled}`,
      });
    });

    res.json(summary);
  });

  app.post("/api/credentials/bulk-delete", (req, res) => {
    const ids = toUniqueIdList(req.body?.ids);
    const force = Boolean(req.body?.force);
    const actor = getActor(req.body);

    if (!ids.length) {
      res.status(400).json({ error: "ids is required and cannot be empty." });
      return;
    }

    const summary = {
      requested: ids.length,
      force,
      deletedCount: 0,
      deletedIds: [],
      notFoundIds: [],
      detachedApis: 0,
      conflicts: [],
    };

    mutateState((state) => {
      for (const credentialId of ids) {
        const index = state.credentials.findIndex((item) => item.id === credentialId);
        if (index === -1) {
          summary.notFoundIds.push(credentialId);
          continue;
        }

        const refApis = state.apis.filter(
          (api) => api.monitor?.checkConfig?.credentialId === credentialId,
        );

        if (refApis.length > 0 && !force) {
          summary.conflicts.push({
            id: credentialId,
            reason: "referenced_by_apis",
            referencedByApis: refApis.map((api) => ({ id: api.id, name: api.name, path: api.path })),
          });
          continue;
        }

        if (refApis.length > 0) {
          for (const api of refApis) {
            if (api.monitor?.checkConfig) {
              api.monitor.checkConfig.credentialId = null;
              api.updatedAt = nowIso();
            }
          }
          summary.detachedApis += refApis.length;
        }

        state.credentials.splice(index, 1);
        summary.deletedCount += 1;
        summary.deletedIds.push(credentialId);
      }

      addAuditLog(state, {
        user: actor,
        action: "credentials_bulk_deleted",
        target: "credentials",
        detail: `requested=${summary.requested} deleted=${summary.deletedCount} force=${force}`,
      });
    });

    res.json(summary);
  });

  app.patch("/api/credentials/:credentialId", (req, res) => {
    const credentialId = req.params.credentialId;
    const body = req.body ?? {};
    const updated = {};

    mutateState((state) => {
      const credential = state.credentials.find((item) => item.id === credentialId);
      if (!credential) {
        res.status(404).json({ error: `Credential not found: ${credentialId}` });
        return;
      }

      if ("name" in body) credential.name = String(body.name);
      if ("enabled" in body) credential.enabled = Boolean(body.enabled);
      if ("type" in body && CREDENTIAL_TYPE_VALUES.includes(String(body.type))) {
        credential.type = String(body.type);
      }
      if ("config" in body && typeof body.config === "object") {
        const sanitized = sanitizeCredentialConfigForStorage(credential.type, body.config);
        const validationError = validateCredentialConfig(credential.type, sanitized);
        if (validationError) {
          res.status(400).json({ error: validationError });
          return;
        }
        credential.config = sanitized;
      }

      if (!("config" in body)) {
        const normalizedExisting = sanitizeCredentialConfigForStorage(credential.type, credential.config);
        const validationError = validateCredentialConfig(credential.type, normalizedExisting);
        if (validationError) {
          res.status(400).json({ error: `config required for type ${credential.type}` });
          return;
        }
        credential.config = normalizedExisting;
      }

      credential.updatedAt = nowIso();
      updated.item = credential;

      addAuditLog(state, {
        user: getActor(body),
        action: "credential_updated",
        target: credential.id,
        detail: `Updated credential ${credential.name}`,
      });
    });

    if (!updated.item) return;
    res.json({ item: sanitizeCredential(updated.item) });
  });

  app.delete("/api/credentials/:credentialId", (req, res) => {
    const credentialId = req.params.credentialId;
    const force = Boolean(req.body?.force) || req.query.force === "true";
    const actor = getActor(req.body);
    let removed = null;
    let detachedApis = 0;

    mutateState((state) => {
      const index = state.credentials.findIndex((item) => item.id === credentialId);
      if (index === -1) {
        res.status(404).json({ error: `Credential not found: ${credentialId}` });
        return;
      }

      const refApis = state.apis.filter(
        (api) => api.monitor?.checkConfig?.credentialId === credentialId,
      );

      if (refApis.length && !force) {
        res.status(409).json({
          error: "Credential is referenced by APIs, use force=true to detach and delete.",
          referencedByApis: refApis.map((api) => ({ id: api.id, name: api.name, path: api.path })),
        });
        return;
      }

      if (refApis.length) {
        for (const api of refApis) {
          if (api.monitor?.checkConfig) {
            api.monitor.checkConfig.credentialId = null;
            api.updatedAt = nowIso();
          }
        }
        detachedApis = refApis.length;
      }

      removed = state.credentials[index];
      state.credentials.splice(index, 1);

      addAuditLog(state, {
        user: actor,
        action: "credential_deleted",
        target: credentialId,
        detail: `Deleted credential ${removed.name}, detachedApis=${detachedApis}`,
      });
    });

    if (!removed) return;
    res.json({ item: sanitizeCredential(removed), detachedApis });
  });

  app.post("/api/credentials/:credentialId/verify", (req, res) => {
    const credentialId = req.params.credentialId;
    const state = getState();
    const credential = state.credentials.find((item) => item.id === credentialId);
    if (!credential) {
      res.status(404).json({ error: `Credential not found: ${credentialId}` });
      return;
    }

    try {
      resolveCredentialSecrets(credential);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ ok: false, error: String(error?.message || "verify_failed") });
    }
  });

  app.get("/api/credentials/env-template", (_req, res) => {
    const state = getState();
    const refs = [...new Set(state.credentials.flatMap((credential) => collectCredentialSecretRefs(credential)))];
    const lines = refs.map((ref) => `${getSecretEnvName(ref)}=`);
    const missing = refs.filter((ref) => !resolveSecretRefStatus(ref));

    res.json({
      prefix: getSecretPrefix(),
      totalRefs: refs.length,
      missingRefs: missing,
      lines,
      example: lines.join("\n"),
    });
  });

  app.get("/api/alert-policy", (_req, res) => {
    const state = getState();
    res.json({ item: state.alertPolicy });
  });

  app.patch("/api/alert-policy", (req, res) => {
    const body = req.body ?? {};
    const actor = getActor(body);
    const updated = {};

    mutateState((state) => {
      state.alertPolicy = normalizeAlertPolicy(body, state.alertPolicy);
      updated.item = state.alertPolicy;

      addAuditLog(state, {
        user: actor,
        action: "alert_policy_updated",
        target: "alert-policy",
        detail: `dedup=${state.alertPolicy.dedupWindowSeconds}s suppress=${state.alertPolicy.suppressWindowSeconds}s`,
      });

      runRuleEvaluationSweep(state, {
        source: "policy-update",
        onAlertCreated: (alert, rule, api) => {
          dispatchAlertNotifications(state, alert, rule, api);
        },
        onAlertResolved: (alert, rule, api) => {
          dispatchAlertRecoveryNotifications(state, alert, rule, api);
        },
      });
    });

    res.json({ item: updated.item });
  });
  app.get("/api/settings/users", (_req, res) => {
    const state = getState();
    res.json({ items: state.users, total: state.users.length });
  });

  app.get("/api/settings/overview", (req, res) => {
    const state = getState();
    const auditLimit = Math.max(1, Math.min(toNumber(req.query.auditLimit, 300), 1_000));
    const notificationLimit = Math.max(1, Math.min(toNumber(req.query.notificationLimit, 200), 1_000));
    const key = `settings:overview:${auditLimit}:${notificationLimit}`;
    const payload = withRouteCache(state, key, () => ({
      users: {
        items: state.users,
        total: state.users.length,
      },
      auditLogs: {
        items: safeSortByTimeDesc(state.auditLogs, (item) => item.timestamp).slice(0, auditLimit),
      },
      notifications: {
        items: safeSortByTimeDesc(state.notifications, (item) => item.createdAt).slice(0, notificationLimit),
      },
      credentials: {
        items: state.credentials,
        total: state.credentials.length,
      },
      alertPolicy: {
        item: state.alertPolicy,
      },
    }));
    res.json(payload);
  });

  app.delete("/api/settings/users/:userId", (_req, res) => {
    res.status(405).json({
      error: "users_are_readonly",
      message: "Responsibility directory is managed externally and cannot be deleted here.",
    });
  });

  app.get("/api/settings/audit-logs", (req, res) => {
    const state = getState();
    const limit = Math.max(1, Math.min(toNumber(req.query.limit, 200), 1_000));

    const items = safeSortByTimeDesc(state.auditLogs, (item) => item.timestamp).slice(0, limit);

    res.json({ items, total: items.length });
  });

  app.get("/api/notifications", (req, res) => {
    const state = getState();
    const limit = Math.max(1, Math.min(toNumber(req.query.limit, 200), 1_000));

    const items = safeSortByTimeDesc(state.notifications, (item) => item.createdAt).slice(0, limit);

    res.json({ items, total: items.length });
  });

  app.post("/api/notifications/dispatch-now", async (req, res) => {
    const state = getState();
    const limit = Math.max(1, Math.min(toNumber(req.body?.limit, 30), 200));
    const summary = await processNotificationQueueTick(state, { limit });
    if (summary.processed > 0) {
      mutateState(() => {});
    }
    res.json({
      ...summary,
      queued: state.notifications.filter((item) => item.status === "queued").length,
    });
  });

  app.post("/api/notifications/bulk-delete", (req, res) => {
    const ids = toUniqueIdList(req.body?.ids);
    const actor = getActor(req.body);

    if (!ids.length) {
      res.status(400).json({ error: "ids is required and cannot be empty." });
      return;
    }

    const summary = {
      requested: ids.length,
      deletedCount: 0,
      deletedIds: [],
      notFoundIds: [],
    };

    mutateState((state) => {
      for (const notificationId of ids) {
        const index = state.notifications.findIndex((item) => item.id === notificationId);
        if (index === -1) {
          summary.notFoundIds.push(notificationId);
          continue;
        }
        state.notifications.splice(index, 1);
        summary.deletedCount += 1;
        summary.deletedIds.push(notificationId);
      }

      addAuditLog(state, {
        user: actor,
        action: "notifications_bulk_deleted",
        target: "notifications",
        detail: `requested=${summary.requested} deleted=${summary.deletedCount}`,
      });
    });

    res.json(summary);
  });

  app.delete("/api/notifications/:notificationId", (req, res) => {
    const notificationId = req.params.notificationId;
    const actor = getActor(req.body);
    let removed = null;

    mutateState((state) => {
      const index = state.notifications.findIndex((item) => item.id === notificationId);
      if (index === -1) {
        res.status(404).json({ error: `Notification not found: ${notificationId}` });
        return;
      }

      removed = state.notifications[index];
      state.notifications.splice(index, 1);

      addAuditLog(state, {
        user: actor,
        action: "notification_deleted",
        target: notificationId,
        detail: `Deleted notification channel=${removed.channelType}`,
      });
    });

    if (!removed) return;
    res.json({ item: removed });
  });

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (process.env.DEMO_MODE === "true") {
    app.post("/api/demo/reset", (_req, res) => {
      const state = resetState();
      refreshAllApiStatuses(state);
      res.json({ ok: true, updatedAt: state.meta.updatedAt });
    });

    app.post("/api/demo/simulate", (req, res) => {
      const minutes = req.body?.minutes;
      const stepSeconds = req.body?.stepSeconds;
      const startTime = req.body?.startTime;
      const seed = req.body?.seed;
      const startTimeMs = startTime ? new Date(startTime).getTime() : null;
      const hasSeed = seed !== undefined && seed !== null && String(seed).trim() !== "";

      if (startTime && !Number.isFinite(startTimeMs)) {
        res.status(400).json({ error: "startTime must be a valid date string" });
        return;
      }

      const summary = {};

      mutateState((state) => {
        const result = runHistoricalSimulation(state, minutes, stepSeconds, {
          source: "simulation",
          startTimeMs: Number.isFinite(startTimeMs) ? startTimeMs : undefined,
          randomFn: hasSeed ? createSeededRandom(seed) : undefined,
          onAlertCreated: (alert, rule, api) => {
            dispatchAlertNotifications(state, alert, rule, api);
          },
          onAlertResolved: (alert, rule, api) => {
            dispatchAlertRecoveryNotifications(state, alert, rule, api);
          },
        });

        refreshAllApiStatuses(state);

        addAuditLog(state, {
          user: getActor(req.body),
          action: "demo_simulation",
          target: "historical",
          detail: `Simulated ${result.minutes}m with ${result.stepSeconds}s step`,
        });

        summary.result = result;
      });

      res.json(summary.result);
    });

    app.post("/api/demo/tick", (req, res) => {
      const output = {};

      mutateState((state) => {
        const result = runSimulationTick(state, {
          source: "simulation",
          onAlertCreated: (alert, rule, api) => {
            dispatchAlertNotifications(state, alert, rule, api);
          },
          onAlertResolved: (alert, rule, api) => {
            dispatchAlertRecoveryNotifications(state, alert, rule, api);
          },
        });

        refreshAllApiStatuses(state);

        output.result = result;
      });

      res.json(output.result);
    });
  }

  app.get("/api/bootstrap", (_req, res) => {
    const state = getState();
    res.json({
      apis: state.apis.length,
      pullApis: state.apis.filter((api) => api.monitor?.mode === "pull").length,
      pushApis: state.apis.filter((api) => api.monitor?.mode !== "pull").length,
      rules: state.rules.length,
      metrics: state.metrics.length,
      alerts: state.alerts.length,
      notifications: state.notifications.length,
      users: state.users.length,
      credentials: state.credentials.length,
      alertPolicy: state.alertPolicy,
      schemaVersion: state.meta?.schemaVersion || 1,
      demoMode: process.env.DEMO_MODE === "true",
      simulator: state.simulator,
    });
  });

  app.get("/api/reports/alert-quality", (req, res) => {
    const state = getState();
    res.json(
      computeAlertQualitySnapshot(state, {
        days: req.query.days,
        service: req.query.service,
        apiId: req.query.apiId,
        ruleId: req.query.ruleId,
      }),
    );
  });

  app.get("/api/reports/alert-quality-trend", (req, res) => {
    const state = getState();
    const days = Math.max(1, Math.min(toNumber(req.query.days, 14), 90));
    const bucketDays = Math.max(1, Math.min(toNumber(req.query.bucketDays, 1), 14));
    const nowMs = Date.now();
    const totalBuckets = Math.max(1, Math.ceil(days / bucketDays));

    const series = [];
    for (let offset = totalBuckets - 1; offset >= 0; offset -= 1) {
      const endMs = nowMs - offset * bucketDays * 24 * 60 * 60 * 1000;
      const snapshot = computeAlertQualitySnapshot(state, {
        days: bucketDays,
        service: req.query.service,
        apiId: req.query.apiId,
        ruleId: req.query.ruleId,
        nowMs: endMs,
      });
      series.push({
        bucketEnd: new Date(endMs).toISOString(),
        alerts: snapshot.totals.alerts,
        duplicateRate: snapshot.quality.duplicateRate,
        falsePositiveRate: snapshot.quality.falsePositiveRate,
        notificationFailureRate: snapshot.quality.notificationFailureRate,
      });
    }

    res.json({
      generatedAt: nowIso(),
      days,
      bucketDays,
      filters: {
        service: req.query.service ? String(req.query.service) : null,
        apiId: req.query.apiId ? String(req.query.apiId) : null,
        ruleId: req.query.ruleId ? String(req.query.ruleId) : null,
      },
      series,
    });
  });

  app.get("/api/reports/alert-quality-compare", (req, res) => {
    const state = getState();
    res.json(
      computeAlertQualityCompare(state, {
        days: req.query.days,
        service: req.query.service,
        apiId: req.query.apiId,
        ruleId: req.query.ruleId,
      }),
    );
  });

  app.get("/api/reports/alert-quality-conclusion", (req, res) => {
    const state = getState();
    const compare = computeAlertQualityCompare(state, {
      days: req.query.days,
      service: req.query.service,
      apiId: req.query.apiId,
      ruleId: req.query.ruleId,
    });
    res.json({
      generatedAt: nowIso(),
      filters: compare.filters,
      days: compare.days,
      text: buildConclusionText(compare),
      compare,
    });
  });

  app.get("/api/reports/markers", (_req, res) => {
    const state = getState();
    const items = safeSortByTimeDesc(state.qualityMarkers || [], (item) => item.createdAt);
    res.json({ items, total: items.length });
  });

  app.post("/api/reports/markers", (req, res) => {
    const body = req.body ?? {};
    const created = {};
    mutateState((state) => {
      const marker = {
        id: uid("marker"),
        name: String(body.name || "quality-marker"),
        note: String(body.note || ""),
        createdBy: getActor(body),
        createdAt: nowIso(),
      };
      state.qualityMarkers.unshift(marker);
      created.item = marker;
      addAuditLog(state, {
        user: getActor(body),
        action: "quality_marker_created",
        target: marker.id,
        detail: marker.name,
      });
    });
    res.status(201).json({ item: created.item });
  });

  app.delete("/api/reports/markers/:markerId", (req, res) => {
    const markerId = req.params.markerId;
    let removed = null;
    mutateState((state) => {
      const index = (state.qualityMarkers || []).findIndex((item) => item.id === markerId);
      if (index === -1) {
        res.status(404).json({ error: `Marker not found: ${markerId}` });
        return;
      }
      removed = state.qualityMarkers[index];
      state.qualityMarkers.splice(index, 1);
      addAuditLog(state, {
        user: getActor(req.body),
        action: "quality_marker_deleted",
        target: markerId,
        detail: removed.name,
      });
    });
    if (!removed) return;
    res.json({ item: removed });
  });

  app.get("/api/reports/alert-quality-marker-compare", (req, res) => {
    const state = getState();
    const markerId = String(req.query.markerId || "");
    const marker = (state.qualityMarkers || []).find((item) => item.id === markerId);
    if (!marker) {
      res.status(404).json({ error: `Marker not found: ${markerId}` });
      return;
    }

    const daysBefore = Math.max(1, Math.min(toNumber(req.query.daysBefore, 7), 90));
    const daysAfter = Math.max(1, Math.min(toNumber(req.query.daysAfter, 7), 90));
    const markerMs = new Date(marker.createdAt).getTime();

    const before = computeAlertQualitySnapshot(state, {
      days: daysBefore,
      service: req.query.service,
      apiId: req.query.apiId,
      ruleId: req.query.ruleId,
      nowMs: markerMs,
    });
    const after = computeAlertQualitySnapshot(state, {
      days: daysAfter,
      service: req.query.service,
      apiId: req.query.apiId,
      ruleId: req.query.ruleId,
      nowMs: markerMs + daysAfter * 24 * 60 * 60 * 1000,
    });
    res.json({
      generatedAt: nowIso(),
      marker,
      before,
      after,
      delta: {
        alerts: after.totals.alerts - before.totals.alerts,
        duplicateRate: round(after.quality.duplicateRate - before.quality.duplicateRate, 2),
        falsePositiveRate: round(
          after.quality.falsePositiveRate - before.quality.falsePositiveRate,
          2,
        ),
        notificationFailureRate: round(
          after.quality.notificationFailureRate - before.quality.notificationFailureRate,
          2,
        ),
        mttrMinutes: round(
          (after.quality.mttrMinutes ?? 0) - (before.quality.mttrMinutes ?? 0),
          2,
        ),
      },
    });
  });

  app.get("/api/reports/rule-tuning-suggestions", (req, res) => {
    const state = getState();
    const snapshot = computeAlertQualitySnapshot(state, {
      days: req.query.days,
      service: req.query.service,
      apiId: req.query.apiId,
      ruleId: req.query.ruleId,
    });

    const suggestions = [];
    for (const noisy of snapshot.topNoisyRules) {
      const alerts = state.alerts.filter((item) => item.ruleId === noisy.ruleId);
      const falsePositiveCount = alerts.filter(
        (item) => item.feedback?.label === "false_positive",
      ).length;
      const noiseCount = alerts.filter((item) => item.feedback?.label === "noise").length;

      if (falsePositiveCount + noiseCount === 0) {
        continue;
      }

      const rule = state.rules.find((item) => item.id === noisy.ruleId);
      const severity = falsePositiveCount + noiseCount >= 5 ? "high" : "medium";
      suggestions.push({
        ruleId: noisy.ruleId,
        ruleName: noisy.ruleName,
        severity,
        observed: {
          totalAlerts: noisy.count,
          falsePositiveCount,
          noiseCount,
        },
        recommendation: {
          increaseMinSamplesTo: Math.max(toNumber(rule?.minSamples, 1), 3),
          increaseWindowMinutesTo: Math.max(toNumber(rule?.windowMinutes, 5), 10),
          increaseCooldownMinutesTo: Math.max(toNumber(rule?.cooldownMinutes, 5), 10),
        },
      });
    }

    res.json({
      generatedAt: nowIso(),
      filters: snapshot.filters,
      suggestions,
    });
  });

  app.get("/api/rule-drafts", (_req, res) => {
    const state = getState();
    const items = safeSortByTimeDesc(state.ruleDrafts || [], (item) => item.createdAt);
    res.json({ items, total: items.length });
  });

  app.get("/api/rule-drafts/:draftId/impact-estimate", (req, res) => {
    const state = getState();
    const draftId = req.params.draftId;
    const draft = (state.ruleDrafts || []).find((item) => item.id === draftId);
    if (!draft) {
      res.status(404).json({ error: `Draft not found: ${draftId}` });
      return;
    }

    const estimate = buildDraftImpactEstimate(state, draft, {
      days: req.query.days,
      service: req.query.service,
      apiId: req.query.apiId,
    });
    if (!estimate) {
      res.status(404).json({ error: `Rule not found: ${draft.ruleId}` });
      return;
    }
    res.json(estimate);
  });

  app.post("/api/reports/rule-drafts/from-suggestions", (req, res) => {
    const state = getState();
    const suggestionResult = (() => {
      const snapshot = computeAlertQualitySnapshot(state, {
        days: req.body?.days,
        service: req.body?.service,
        apiId: req.body?.apiId,
        ruleId: req.body?.ruleId,
      });
      return snapshot.topNoisyRules
        .map((noisy) => {
          const alerts = state.alerts.filter((item) => item.ruleId === noisy.ruleId);
          const falsePositiveCount = alerts.filter(
            (item) => item.feedback?.label === "false_positive",
          ).length;
          const noiseCount = alerts.filter((item) => item.feedback?.label === "noise").length;
          const rule = state.rules.find((item) => item.id === noisy.ruleId);
          if (!rule || falsePositiveCount + noiseCount === 0) return null;
          return {
            rule,
            recommendation: {
              minSamples: Math.max(toNumber(rule.minSamples, 1), 3),
              windowMinutes: Math.max(toNumber(rule.windowMinutes, 5), 10),
              cooldownMinutes: Math.max(toNumber(rule.cooldownMinutes, 5), 10),
            },
          };
        })
        .filter(Boolean);
    })();

    const createdItems = [];
    mutateState((mutable) => {
      for (const item of suggestionResult) {
        const draft = {
          id: uid("draft"),
          ruleId: item.rule.id,
          ruleName: item.rule.name,
          patch: item.recommendation,
          createdBy: getActor(req.body),
          createdAt: nowIso(),
          status: "draft",
        };
        mutable.ruleDrafts.unshift(draft);
        createdItems.push(draft);
      }
      addAuditLog(mutable, {
        user: getActor(req.body),
        action: "rule_drafts_created_from_suggestions",
        target: "rule-drafts",
        detail: `count=${createdItems.length}`,
      });
    });

    res.status(201).json({ items: createdItems, total: createdItems.length });
  });

  app.post("/api/rule-drafts/:draftId/apply", (req, res) => {
    const draftId = req.params.draftId;
    let updatedRule = null;
    let updatedDraft = null;
    mutateState((state) => {
      const draft = (state.ruleDrafts || []).find((item) => item.id === draftId);
      if (!draft) {
        res.status(404).json({ error: `Draft not found: ${draftId}` });
        return;
      }
      const rule = state.rules.find((item) => item.id === draft.ruleId);
      if (!rule) {
        res.status(404).json({ error: `Rule not found: ${draft.ruleId}` });
        return;
      }
      rule.minSamples = Math.max(1, toNumber(draft.patch?.minSamples, rule.minSamples));
      rule.windowMinutes = Math.max(1, toNumber(draft.patch?.windowMinutes, rule.windowMinutes));
      rule.cooldownMinutes = Math.max(0, toNumber(draft.patch?.cooldownMinutes, rule.cooldownMinutes));
      rule.updatedAt = nowIso();
      draft.status = "applied";
      draft.appliedAt = nowIso();
      draft.appliedBy = getActor(req.body);
      updatedRule = rule;
      updatedDraft = draft;
      addAuditLog(state, {
        user: getActor(req.body),
        action: "rule_draft_applied",
        target: draft.id,
        detail: `rule=${rule.id}`,
      });
    });
    if (!updatedRule) return;
    res.json({ rule: updatedRule, draft: updatedDraft });
  });

  app.delete("/api/rule-drafts/:draftId", (req, res) => {
    const draftId = req.params.draftId;
    let removed = null;
    mutateState((state) => {
      const index = (state.ruleDrafts || []).findIndex((item) => item.id === draftId);
      if (index === -1) {
        res.status(404).json({ error: `Draft not found: ${draftId}` });
        return;
      }
      removed = state.ruleDrafts[index];
      state.ruleDrafts.splice(index, 1);
      addAuditLog(state, {
        user: getActor(req.body),
        action: "rule_draft_deleted",
        target: draftId,
        detail: removed.ruleName || removed.ruleId,
      });
    });
    if (!removed) return;
    res.json({ item: removed });
  });

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (fs.existsSync(CLIENT_DIST_DIR)) {
    app.use(express.static(CLIENT_DIST_DIR, {
      index: false,
      etag: true,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return;
        }
        res.setHeader("Cache-Control", "public, max-age=300");
      },
    }));
    app.get(/.*/, (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        next();
        return;
      }

      // Only fallback real page navigations, not static asset requests.
      if (path.extname(req.path)) {
        next();
        return;
      }

      const acceptsHtml = req.headers.accept?.includes("text/html");
      if (!acceptsHtml) {
        next();
        return;
      }

      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(CLIENT_INDEX_FILE, (error) => {
        if (error) next();
      });
    });
  }

  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: "internal_server_error", message: error.message });
  });

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return app;
};




