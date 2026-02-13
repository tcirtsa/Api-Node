/**
 * @file server/rule-engine.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import { avg, compareByOperator, nowIso, round, toNumber, uid } from "./utils.js";

/**
 * 符号：METRIC_SELECTORS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const METRIC_SELECTORS = {
  qps: (metric) => metric.qps,
  errorRate: (metric) => metric.errorRate,
  latencyP95: (metric) => metric.latencyP95,
  latencyP99: (metric) => metric.latencyP99,
  availability: (metric) => metric.availability,
  statusCode5xx: (metric) => metric.statusCode5xx,
};

/**
 * 符号：ACTIVE_ALERT_STATUSES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const ACTIVE_ALERT_STATUSES = new Set(["open", "acknowledged"]);
/**
 * 符号：MAX_METRICS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const MAX_METRICS = 30_000;
/**
 * 符号：MAX_ALERTS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const MAX_ALERTS = 10_000;
/**
 * 符号：MAX_RULE_HITS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const MAX_RULE_HITS = 5_000;
/**
 * 符号：DEFAULT_ALERT_POLICY（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const DEFAULT_ALERT_POLICY = {
  enabled: true,
  dedupWindowSeconds: 180,
  suppressWindowSeconds: 120,
};

/**
 * 符号：aggregateValues（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const aggregateValues = (values, aggregation) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!values.length) {
    return null;
  }

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  switch (aggregation) {
    case "avg":
      return avg(values);
    case "max":
      return Math.max(...values);
    case "min":
      return Math.min(...values);
    case "latest":
    default:
      return values[values.length - 1];
  }
};

/**
 * 符号：appliesToScope（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const appliesToScope = (rule, api) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!rule.scope || rule.scope.type === "global") {
    return true;
  }

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rule.scope.type === "api") {
    return rule.scope.value === api.id;
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rule.scope.type === "service") {
    return rule.scope.value === api.service;
  }

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return false;
};

/**
 * 符号：getPriorityWeight（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getPriorityWeight = (level) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (level === "P1") return 3;
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (level === "P2") return 2;
  return 1;
};

/**
 * 符号：normalizeRuleType（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeRuleType = (rule) => String(rule.ruleType || "threshold");

/**
 * 符号：getMetricsInWindow（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getMetricsInWindow = (state, apiId, startMs, endMs) =>
  state.metrics.filter((point) => {
    // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
    if (point.apiId !== apiId) {
      return false;
    }

    // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
    const timeMs = new Date(point.timestamp).getTime();
    // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
    return timeMs >= startMs && timeMs <= endMs;
  });

/**
 * 符号：getLatestMetricForApi（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const getLatestMetricForApi = (state, apiId) => {
  // 步骤 1：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (let index = state.metrics.length - 1; index >= 0; index -= 1) {
    const point = state.metrics[index];
    if (point.apiId === apiId) {
      return point;
    }
  }
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return null;
};

/**
 * 符号：computeApiStatus（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const computeApiStatus = (state, apiId) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const activeAlerts = state.alerts.filter(
    (alert) => alert.apiId === apiId && ACTIVE_ALERT_STATUSES.has(alert.status),
  );

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (activeAlerts.some((alert) => alert.level === "P1")) {
    return "critical";
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (activeAlerts.length > 0) {
    return "warning";
  }

  // 步骤 4：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const latest = getLatestMetricForApi(state, apiId);

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!latest) {
    return "unknown";
  }

  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (latest.errorRate > 4 || latest.availability < 99 || latest.latencyP95 > 900) {
    return "warning";
  }

  // 步骤 6：返回当前结果并结束函数，明确本路径的输出语义。
  return "healthy";
};

/**
 * 符号：appendAlertEvent（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const appendAlertEvent = (alert, type, by, note, timestamp) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Array.isArray(alert.events)) {
    alert.events = [];
  }

  alert.events.push({
    id: uid("event"),
    type,
    by,
    note,
    at: timestamp,
  });
};

/**
 * 符号：buildThresholdMessage（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildThresholdMessage = (metric, aggregation, operator, threshold, value) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const normalized = round(value, 3);
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return `${aggregation} ${metric} ${normalized} ${operator} ${threshold}`;
};

/**
 * 符号：evaluateThresholdCondition（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const evaluateThresholdCondition = (state, rule, apiId, referenceTimeIso, condition = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const metric = condition.metric || rule.metric;
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const selector = METRIC_SELECTORS[metric];

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!selector) {
    return {
      evaluable: false,
      matched: false,
      reason: "unsupported_metric",
      value: null,
      sampleCount: 0,
      message: "unsupported_metric",
      aggregation: condition.aggregation || rule.aggregation || "latest",
      threshold: toNumber(condition.threshold ?? rule.threshold, 0),
      metric,
      operator: condition.operator || rule.operator,
    };
  }

  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const referenceMs = new Date(referenceTimeIso).getTime();
  const windowMinutes = Math.max(
    toNumber(condition.windowMinutes ?? rule.windowMinutes, 1),
    1,
  );
  const minSamples = Math.max(toNumber(condition.minSamples ?? rule.minSamples, 1), 1);
  const startMs = referenceMs - windowMinutes * 60_000;

  // 步骤 4：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const inWindow = getMetricsInWindow(state, apiId, startMs, referenceMs);
  const values = inWindow
    .map((point) => selector(point))
    .filter((value) => Number.isFinite(value));

  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (values.length < minSamples) {
    return {
      evaluable: false,
      matched: false,
      reason: "insufficient_samples",
      value: null,
      sampleCount: values.length,
      message: `insufficient_samples(${values.length}/${minSamples})`,
      aggregation: condition.aggregation || rule.aggregation || "latest",
      threshold: toNumber(condition.threshold ?? rule.threshold, 0),
      metric,
      operator: condition.operator || rule.operator,
    };
  }

  const aggregation = condition.aggregation || rule.aggregation || "latest";
  const value = aggregateValues(values, aggregation);

  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Number.isFinite(value)) {
    return {
      evaluable: false,
      matched: false,
      reason: "invalid_aggregation",
      value: null,
      sampleCount: values.length,
      message: "invalid_aggregation",
      aggregation,
      threshold: toNumber(condition.threshold ?? rule.threshold, 0),
      metric,
      operator: condition.operator || rule.operator,
    };
  }

  const operator = condition.operator || rule.operator;
  const threshold = toNumber(condition.threshold ?? rule.threshold, 0);
  const matched = compareByOperator(value, operator, threshold);

  // 步骤 7：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    evaluable: true,
    matched,
    value,
    sampleCount: values.length,
    aggregation,
    threshold,
    metric,
    operator,
    message: buildThresholdMessage(metric, aggregation, operator, threshold, value),
  };
};

/**
 * 符号：evaluateThresholdRule（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const evaluateThresholdRule = (state, rule, apiId, referenceTimeIso) =>
  evaluateThresholdCondition(state, rule, apiId, referenceTimeIso);

/**
 * 符号：evaluateCompositeThresholdRule（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const evaluateCompositeThresholdRule = (state, rule, apiId, referenceTimeIso) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!conditions.length) {
    return evaluateThresholdRule(state, rule, apiId, referenceTimeIso);
  }

  const logic = rule.conditionLogic === "any" ? "any" : "all";
  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const evaluations = conditions.map((condition) =>
    evaluateThresholdCondition(state, rule, apiId, referenceTimeIso, condition),
  );

  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const evaluableCount = evaluations.filter((item) => item.evaluable).length;
  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const matchedCount = evaluations.filter((item) => item.evaluable && item.matched).length;
  const allEvaluable = evaluableCount === evaluations.length;

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (logic === "any") {
    if (matchedCount > 0) {
      return {
        evaluable: true,
        matched: true,
        value: matchedCount,
        sampleCount: evaluations.reduce((sum, item) => sum + item.sampleCount, 0),
        aggregation: "composite:any",
        threshold: 1,
        message: `composite(any) matched ${matchedCount}/${evaluations.length}: ${evaluations.map((item) => item.message).join(" | ")}`,
      };
    }
    if (evaluableCount === 0) {
      return {
        evaluable: false,
        matched: false,
        reason: "insufficient_samples",
        value: null,
        sampleCount: evaluations.reduce((sum, item) => sum + item.sampleCount, 0),
        aggregation: "composite:any",
        threshold: 1,
        message: "composite(any) insufficient_samples",
      };
    }
    return {
      evaluable: true,
      matched: false,
      value: matchedCount,
      sampleCount: evaluations.reduce((sum, item) => sum + item.sampleCount, 0),
      aggregation: "composite:any",
      threshold: 1,
      message: `composite(any) matched ${matchedCount}/${evaluations.length}: ${evaluations.map((item) => item.message).join(" | ")}`,
    };
  }

  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!allEvaluable) {
    return {
      evaluable: false,
      matched: false,
      reason: "insufficient_samples",
      value: null,
      sampleCount: evaluations.reduce((sum, item) => sum + item.sampleCount, 0),
      aggregation: "composite:all",
      threshold: evaluations.length,
      message: `composite(all) insufficient_samples: ${evaluations.map((item) => item.message).join(" | ")}`,
    };
  }

  const matched = matchedCount === evaluations.length;
  // 步骤 6：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    evaluable: true,
    matched,
    value: matchedCount,
    sampleCount: evaluations.reduce((sum, item) => sum + item.sampleCount, 0),
    aggregation: "composite:all",
    threshold: evaluations.length,
    message: `composite(all) matched ${matchedCount}/${evaluations.length}: ${evaluations.map((item) => item.message).join(" | ")}`,
  };
};

/**
 * 符号：evaluateConsecutiveFailuresRule（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const evaluateConsecutiveFailuresRule = (state, rule, apiId, referenceTimeIso) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const selector = METRIC_SELECTORS[rule.metric || "errorRate"];
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!selector) {
    return {
      evaluable: false,
      matched: false,
      reason: "unsupported_metric",
      value: null,
      sampleCount: 0,
      message: "unsupported_metric",
      aggregation: "latest",
      threshold: toNumber(rule.threshold, 0),
    };
  }

  const requiredFailures = Math.max(toNumber(rule.failureCount, rule.minSamples || 3), 2);
  const windowMinutes = Math.max(toNumber(rule.windowMinutes, 10), 1);
  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const referenceMs = new Date(referenceTimeIso).getTime();
  const startMs = referenceMs - windowMinutes * 60_000;

  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const metrics = getMetricsInWindow(state, apiId, startMs, referenceMs)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (metrics.length < requiredFailures) {
    return {
      evaluable: false,
      matched: false,
      reason: "insufficient_samples",
      value: null,
      sampleCount: metrics.length,
      message: `insufficient_samples(${metrics.length}/${requiredFailures})`,
      aggregation: "latest",
      threshold: toNumber(rule.threshold, 0),
    };
  }

  const tail = metrics.slice(-requiredFailures);
  // 步骤 5：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const values = tail.map((point) => selector(point));
  const threshold = toNumber(rule.threshold, 0);
  const operator = rule.operator || ">";
  // 步骤 6：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const failures = values.filter((value) => compareByOperator(value, operator, threshold));
  const matched = failures.length === requiredFailures;
  const latestValue = values[values.length - 1] ?? null;

  // 步骤 7：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    evaluable: true,
    matched,
    value: latestValue,
    sampleCount: tail.length,
    aggregation: "latest",
    threshold,
    message: `consecutive_failures ${failures.length}/${requiredFailures} on ${rule.metric || "errorRate"} ${operator} ${threshold}`,
  };
};

/**
 * 符号：evaluateMissingDataRule（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const evaluateMissingDataRule = (state, rule, apiId, referenceTimeIso) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const windowMinutes = Math.max(toNumber(rule.windowMinutes, 5), 1);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const referenceMs = new Date(referenceTimeIso).getTime();
  const latest = getLatestMetricForApi(state, apiId);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!latest) {
    return {
      evaluable: true,
      matched: true,
      value: windowMinutes + 1,
      sampleCount: 0,
      aggregation: "latest",
      threshold: windowMinutes,
      message: `missing_data no metric in ${windowMinutes}m window`,
    };
  }

  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const latestMs = new Date(latest.timestamp).getTime();
  const gapMinutes = (referenceMs - latestMs) / 60_000;
  const matched = gapMinutes > windowMinutes;

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    evaluable: true,
    matched,
    value: round(gapMinutes, 3),
    sampleCount: 1,
    aggregation: "latest",
    threshold: windowMinutes,
    message: `missing_data gap=${round(gapMinutes, 2)}m > ${windowMinutes}m`,
  };
};

/**
 * 符号：evaluateBurnRateRule（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const evaluateBurnRateRule = (state, rule, apiId, referenceTimeIso) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const metric = rule.metric || "errorRate";
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const selector = METRIC_SELECTORS[metric];

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!selector) {
    return {
      evaluable: false,
      matched: false,
      reason: "unsupported_metric",
      value: null,
      sampleCount: 0,
      message: "unsupported_metric",
      aggregation: "avg",
      threshold: toNumber(rule.burnRateThreshold, 1),
    };
  }

  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const referenceMs = new Date(referenceTimeIso).getTime();
  const shortWindowMinutes = Math.max(toNumber(rule.shortWindowMinutes, 5), 1);
  const longWindowMinutes = Math.max(toNumber(rule.longWindowMinutes, 60), shortWindowMinutes + 1);

  const shortMetrics = getMetricsInWindow(
    state,
    apiId,
    referenceMs - shortWindowMinutes * 60_000,
    referenceMs,
  );
  const longMetrics = getMetricsInWindow(
    state,
    apiId,
    referenceMs - longWindowMinutes * 60_000,
    referenceMs,
  );

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!shortMetrics.length || !longMetrics.length) {
    return {
      evaluable: false,
      matched: false,
      reason: "insufficient_samples",
      value: null,
      sampleCount: shortMetrics.length + longMetrics.length,
      message: "insufficient_samples",
      aggregation: "avg",
      threshold: toNumber(rule.burnRateThreshold, 1),
    };
  }

  // 步骤 5：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const shortRate = avg(shortMetrics.map((item) => selector(item)));
  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const longRate = avg(longMetrics.map((item) => selector(item)));
  const sloTarget = Math.min(Math.max(toNumber(rule.sloTarget, 99.9), 90), 100);
  const errorBudget = Math.max(100 - sloTarget, 0.001);

  const shortBurn = shortRate / errorBudget;
  const longBurn = longRate / errorBudget;
  const burnRateThreshold = Math.max(toNumber(rule.burnRateThreshold, 2), 1);

  const matched = shortBurn >= burnRateThreshold && longBurn >= burnRateThreshold;

  // 步骤 6：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    evaluable: true,
    matched,
    value: round(Math.max(shortBurn, longBurn), 3),
    sampleCount: shortMetrics.length + longMetrics.length,
    aggregation: "max",
    threshold: burnRateThreshold,
    message: `burn_rate short=${round(shortBurn, 3)} long=${round(longBurn, 3)} threshold=${burnRateThreshold} slo=${sloTarget}%`,
  };
};

/**
 * 符号：evaluateRule（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const evaluateRule = (state, rule, apiId, referenceTimeIso) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const ruleType = normalizeRuleType(rule);

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (ruleType === "consecutive_failures") {
    return evaluateConsecutiveFailuresRule(state, rule, apiId, referenceTimeIso);
  }

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (ruleType === "missing_data") {
    return evaluateMissingDataRule(state, rule, apiId, referenceTimeIso);
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (ruleType === "burn_rate") {
    return evaluateBurnRateRule(state, rule, apiId, referenceTimeIso);
  }

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (Array.isArray(rule.conditions) && rule.conditions.length > 0) {
    return evaluateCompositeThresholdRule(state, rule, apiId, referenceTimeIso);
  }

  // 步骤 5：返回当前结果并结束函数，明确本路径的输出语义。
  return evaluateThresholdRule(state, rule, apiId, referenceTimeIso);
};

/**
 * 符号：findActiveAlert（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const findActiveAlert = (state, ruleId, apiId) =>
  state.alerts.find(
    (alert) =>
      alert.ruleId === ruleId && alert.apiId === apiId && ACTIVE_ALERT_STATUSES.has(alert.status),
  );

/**
 * 符号：getAlertPolicy（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getAlertPolicy = (state) => ({ ...DEFAULT_ALERT_POLICY, ...(state.alertPolicy || {}) });

/**
 * 符号：ensureAlertNoiseState（arrow-function）
 * 作用说明：该函数用于前置校验，尽早拦截非法输入并缩短错误路径。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const ensureAlertNoiseState = (state) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!state.alertNoiseState || typeof state.alertNoiseState !== "object") {
    state.alertNoiseState = { byFingerprint: {} };
  }
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!state.alertNoiseState.byFingerprint || typeof state.alertNoiseState.byFingerprint !== "object") {
    state.alertNoiseState.byFingerprint = {};
  }
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return state.alertNoiseState;
};

/**
 * 符号：getNoiseEntry（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getNoiseEntry = (state, ruleId, apiId) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const noiseState = ensureAlertNoiseState(state);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const key = `${ruleId}:${apiId}`;
  if (!noiseState.byFingerprint[key]) {
    noiseState.byFingerprint[key] = {
      lastOpenedAt: null,
      lastResolvedAt: null,
    };
  }
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return noiseState.byFingerprint[key];
};

/**
 * 符号：shouldSkipNewAlertByNoise（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const shouldSkipNewAlertByNoise = (state, ruleId, apiId, timestampIso) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const policy = getAlertPolicy(state);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!policy.enabled) {
    return false;
  }

  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const entry = getNoiseEntry(state, ruleId, apiId);
  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const nowMs = new Date(timestampIso).getTime();
  const dedupMs = Math.max(toNumber(policy.dedupWindowSeconds, 180), 0) * 1_000;
  const suppressMs = Math.max(toNumber(policy.suppressWindowSeconds, 120), 0) * 1_000;

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (entry.lastResolvedAt && dedupMs > 0) {
    const elapsed = nowMs - new Date(entry.lastResolvedAt).getTime();
    if (elapsed < dedupMs) {
      return true;
    }
  }

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (entry.lastOpenedAt && suppressMs > 0) {
    const elapsed = nowMs - new Date(entry.lastOpenedAt).getTime();
    if (elapsed < suppressMs) {
      return true;
    }
  }

  // 步骤 5：返回当前结果并结束函数，明确本路径的输出语义。
  return false;
};

/**
 * 符号：shouldSkipByCooldown（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const shouldSkipByCooldown = (rule, apiId, timestampIso) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const cooldownMinutes = Math.max(toNumber(rule.cooldownMinutes, 0), 0);

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!cooldownMinutes) {
    return false;
  }

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!rule.lastTriggeredByApi || typeof rule.lastTriggeredByApi !== "object") {
    rule.lastTriggeredByApi = {};
  }

  const lastTriggeredAt = rule.lastTriggeredByApi[apiId];

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!lastTriggeredAt) {
    return false;
  }

  // 步骤 4：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const elapsedMs = new Date(timestampIso).getTime() - new Date(lastTriggeredAt).getTime();
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return elapsedMs < cooldownMinutes * 60_000;
};

/**
 * 符号：upsertRuleHit（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const upsertRuleHit = (state, hit) => {
  state.ruleHits.unshift(hit);

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (state.ruleHits.length > MAX_RULE_HITS) {
    state.ruleHits.length = MAX_RULE_HITS;
  }
};

/**
 * 符号：createAlert（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const createAlert = (rule, api, evaluation, timestampIso, source) => ({
  id: uid("alert"),
  ruleId: rule.id,
  apiId: api.id,
  level: rule.priority,
  title: rule.name,
  message: evaluation.message,
  status: "open",
  metric: evaluation.metric || rule.metric,
  operator: evaluation.operator || rule.operator,
  threshold: evaluation.threshold,
  observedValue: round(toNumber(evaluation.value, 0), 3),
  aggregation: evaluation.aggregation,
  windowMinutes: rule.windowMinutes,
  source,
  triggeredAt: timestampIso,
  updatedAt: timestampIso,
  resolvedAt: null,
  acknowledgedBy: null,
  notifications: [],
  events: [
    {
      id: uid("event"),
      type: "created",
      by: "system",
      note: "Alert created by rule engine.",
      at: timestampIso,
    },
  ],
});

/**
 * 符号：evaluateRuleForApi（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const evaluateRuleForApi = (state, rule, api, timestampIso, options, results) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const evaluation = evaluateRule(state, rule, api.id, timestampIso);

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!evaluation.evaluable) {
    return;
  }

  results.evaluatedRules += 1;

  upsertRuleHit(state, {
    id: uid("hit"),
    ruleId: rule.id,
    apiId: api.id,
    metric: evaluation.metric || rule.metric,
    aggregation: evaluation.aggregation,
    operator: evaluation.operator || rule.operator,
    threshold: evaluation.threshold,
    value: round(toNumber(evaluation.value, 0), 3),
    matched: evaluation.matched,
    evaluatedAt: timestampIso,
  });

  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const activeAlert = findActiveAlert(state, rule.id, api.id);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (evaluation.matched) {
    if (activeAlert) {
      activeAlert.observedValue = round(toNumber(evaluation.value, 0), 3);
      activeAlert.message = evaluation.message;
      activeAlert.updatedAt = timestampIso;
      return;
    }

    if (shouldSkipByCooldown(rule, api.id, timestampIso)) {
      return;
    }

    if (shouldSkipNewAlertByNoise(state, rule.id, api.id, timestampIso)) {
      return;
    }

  const newAlert = createAlert(rule, api, evaluation, timestampIso, options.source ?? "api");
    state.alerts.unshift(newAlert);
    results.createdAlerts.push(newAlert);
    const openNoise = getNoiseEntry(state, rule.id, api.id);
    openNoise.lastOpenedAt = timestampIso;

    if (state.alerts.length > MAX_ALERTS) {
      state.alerts.length = MAX_ALERTS;
    }

    if (!rule.lastTriggeredByApi || typeof rule.lastTriggeredByApi !== "object") {
      rule.lastTriggeredByApi = {};
    }

    rule.lastTriggeredByApi[api.id] = timestampIso;
    rule.updatedAt = timestampIso;

    results.onAlertCreated(newAlert, rule, api);
    return;
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (activeAlert) {
    activeAlert.status = "resolved";
    activeAlert.updatedAt = timestampIso;
    activeAlert.resolvedAt = timestampIso;
    appendAlertEvent(activeAlert, "auto_resolved", "system", "Rule condition recovered.", timestampIso);
    const resolvedNoise = getNoiseEntry(state, rule.id, api.id);
    resolvedNoise.lastResolvedAt = timestampIso;
    results.resolvedAlerts.push(activeAlert);
    results.onAlertResolved(activeAlert, rule, api);
  }
};

/**
 * 符号：evaluateRulesForApi（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const evaluateRulesForApi = (state, api, timestampIso, options, results) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const enabledRules = state.rules.filter((rule) => rule.enabled && appliesToScope(rule, api));

  // 步骤 1：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const rule of enabledRules) {
    evaluateRuleForApi(state, rule, api, timestampIso, options, results);
  }

  api.status = computeApiStatus(state, api.id);
  api.updatedAt = timestampIso;
};

/**
 * 符号：previewRuleEvaluation（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const previewRuleEvaluation = (state, rule, apiId, referenceTimeIso = nowIso()) =>
  evaluateRule(state, rule, apiId, referenceTimeIso);

/**
 * 符号：ingestMetric（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const ingestMetric = (state, metricInput, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const api = state.apis.find((item) => item.id === metricInput.apiId);

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!api) {
    throw new Error(`API not found: ${metricInput.apiId}`);
  }

  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const timestampIso = metricInput.timestamp ? new Date(metricInput.timestamp).toISOString() : nowIso();

  const qps = round(Math.max(toNumber(metricInput.qps, api.baseline.qps), 0), 0);
  const errorRate = round(Math.max(toNumber(metricInput.errorRate, api.baseline.errorRate), 0), 3);
  const latencyP95 = round(Math.max(toNumber(metricInput.latencyP95, api.baseline.latencyP95), 0), 0);
  const latencyP99 = round(Math.max(toNumber(metricInput.latencyP99, api.baseline.latencyP99), latencyP95), 0);
  const availability = round(
    Math.min(Math.max(toNumber(metricInput.availability, api.baseline.availability), 0), 100),
    3,
  );
  const statusCode5xx = round(
    Math.max(toNumber(metricInput.statusCode5xx, (qps * errorRate) / 1000), 0),
    0,
  );

  const metric = {
    id: uid("metric"),
    apiId: api.id,
    timestamp: timestampIso,
    qps,
    errorRate,
    latencyP95,
    latencyP99,
    availability,
    statusCode5xx,
  };

  state.metrics.push(metric);

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (state.metrics.length > MAX_METRICS) {
    state.metrics.splice(0, state.metrics.length - MAX_METRICS);
  }

  const results = {
    metric,
    createdAlerts: [],
    resolvedAlerts: [],
    evaluatedRules: 0,
    onAlertCreated:
      typeof options.onAlertCreated === "function" ? options.onAlertCreated : () => {},
    onAlertResolved:
      typeof options.onAlertResolved === "function" ? options.onAlertResolved : () => {},
  };

  evaluateRulesForApi(state, api, timestampIso, options, results);

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    metric: results.metric,
    createdAlerts: results.createdAlerts,
    resolvedAlerts: results.resolvedAlerts,
    evaluatedRules: results.evaluatedRules,
  };
};

/**
 * 符号：runRuleEvaluationSweep（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const runRuleEvaluationSweep = (state, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const timestampIso = options.timestamp ? new Date(options.timestamp).toISOString() : nowIso();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const results = {
    timestamp: timestampIso,
    evaluatedApis: 0,
    evaluatedRules: 0,
    createdAlerts: [],
    resolvedAlerts: [],
    onAlertCreated:
      typeof options.onAlertCreated === "function" ? options.onAlertCreated : () => {},
    onAlertResolved:
      typeof options.onAlertResolved === "function" ? options.onAlertResolved : () => {},
  };

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const api of state.apis) {
    evaluateRulesForApi(state, api, timestampIso, options, results);
    results.evaluatedApis += 1;
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    timestamp: results.timestamp,
    evaluatedApis: results.evaluatedApis,
    evaluatedRules: results.evaluatedRules,
    createdAlerts: results.createdAlerts,
    resolvedAlerts: results.resolvedAlerts,
  };
};

/**
 * 符号：refreshAllApiStatuses（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const refreshAllApiStatuses = (state) => {
  // 步骤 1：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const api of state.apis) {
    api.status = computeApiStatus(state, api.id);
  }
};

/**
 * 符号：getActiveAlertCountByApi（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const getActiveAlertCountByApi = (state, apiId) =>
  state.alerts.filter((alert) => alert.apiId === apiId && ACTIVE_ALERT_STATUSES.has(alert.status))
    .length;

/**
 * 符号：getHighestActiveAlertLevelByApi（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const getHighestActiveAlertLevelByApi = (state, apiId) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const activeAlerts = state.alerts.filter(
    (alert) => alert.apiId === apiId && ACTIVE_ALERT_STATUSES.has(alert.status),
  );

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!activeAlerts.length) {
    return null;
  }

  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const sorted = [...activeAlerts].sort(
    (left, right) => getPriorityWeight(right.level) - getPriorityWeight(left.level),
  );

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return sorted[0]?.level ?? null;
};




