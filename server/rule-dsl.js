/**
 * @file server/rule-dsl.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { uid } from "./utils.js";

/**
 * 符号：DEFAULT_RULE（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const DEFAULT_RULE = {
  ruleType: "threshold",
  name: "",
  description: "",
  priority: "P2",
  metric: "errorRate",
  operator: ">",
  threshold: 5,
  aggregation: "avg",
  windowMinutes: 5,
  minSamples: 2,
  cooldownMinutes: 10,
  scope: { type: "global" },
  actions: ["email", "slack"],
};

/**
 * 符号：OPERATOR_ALIASES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const OPERATOR_ALIASES = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  eq: "==",
  ne: "!=",
};

/**
 * 符号：METRIC_ALIASES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const METRIC_ALIASES = {
  p95: "latencyP95",
  p99: "latencyP99",
  "5xx": "statusCode5xx",
  status5xx: "statusCode5xx",
  error: "errorRate",
  err: "errorRate",
  availability: "availability",
  qps: "qps",
};

/**
 * 符号：RULE_TYPE_ALIASES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const RULE_TYPE_ALIASES = {
  threshold: "threshold",
  consecutive: "consecutive_failures",
  "consecutive_failures": "consecutive_failures",
  missing: "missing_data",
  "missing_data": "missing_data",
  burn: "burn_rate",
  "burn_rate": "burn_rate",
};

/**
 * 符号：AGGREGATION_ALIASES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const AGGREGATION_ALIASES = {
  avg: "avg",
  mean: "avg",
  max: "max",
  min: "min",
  latest: "latest",
  last: "latest",
};

/**
 * 符号：PRIORITY_ALIASES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const PRIORITY_ALIASES = {
  p1: "P1",
  p2: "P2",
  p3: "P3",
};

/**
 * 符号：tokenizeDsl（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const tokenizeDsl = (text) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const matches = text.match(/"[^"]*"|'[^']*'|\S+/g);
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return matches ? matches.map((token) => token.trim()).filter(Boolean) : [];
};

/**
 * 符号：stripQuotes（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const stripQuotes = (value) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!value) return value;
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return trimmed;
};

/**
 * 符号：parseKeyValue（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const parseKeyValue = (token) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const index = token.indexOf("=");
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (index < 0) return null;
  const key = token.slice(0, index).trim();
  const value = stripQuotes(token.slice(index + 1).trim());
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return { key, value };
};

/**
 * 符号：parseScope（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const parseScope = (value) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const raw = String(value || "").trim();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!raw || raw === "global") return { type: "global" };
  if (raw.startsWith("service/")) {
    return { type: "service", value: raw.slice("service/".length) };
  }
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (raw.startsWith("api/")) {
    return { type: "api", value: raw.slice("api/".length) };
  }
  const parts = raw.split(":");
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (parts.length === 2) {
    return { type: parts[0], value: parts[1] };
  }
  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return { type: "global" };
};

/**
 * 符号：parseWindowMinutes（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const parseWindowMinutes = (value) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const raw = String(value || "").trim();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!raw) return null;
  const match = raw.match(/^(\d+(?:\.\d+)?)(s|m|h)?$/i);
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!match) return Number(raw);
  const amount = Number(match[1]);
  const unit = (match[2] || "m").toLowerCase();
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Number.isFinite(amount)) return null;
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (unit === "s") return amount / 60;
  if (unit === "h") return amount * 60;
  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return amount;
};

/**
 * 符号：normalizeOperator（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeOperator = (value) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const raw = String(value || "").trim();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!raw) return raw;
  const alias = OPERATOR_ALIASES[raw.toLowerCase()];
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return alias || raw;
};

/**
 * 符号：normalizeMetric（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeMetric = (value) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const raw = String(value || "").trim();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!raw) return raw;
  const alias = METRIC_ALIASES[raw.toLowerCase()];
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return alias || raw;
};

/**
 * 符号：normalizeRuleType（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeRuleType = (value) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const raw = String(value || "").trim();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!raw) return raw;
  const alias = RULE_TYPE_ALIASES[raw.toLowerCase()];
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return alias || raw;
};

/**
 * 符号：normalizeAggregation（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeAggregation = (value) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const raw = String(value || "").trim();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!raw) return raw;
  const alias = AGGREGATION_ALIASES[raw.toLowerCase()];
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return alias || raw;
};

/**
 * 符号：normalizePriority（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizePriority = (value) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const raw = String(value || "").trim();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!raw) return raw;
  const alias = PRIORITY_ALIASES[raw.toLowerCase()];
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return alias || raw.toUpperCase();
};

/**
 * 符号：parseActions（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const parseActions = (value) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const raw = String(value || "");
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return raw
    .split(/[,\|;]/g)
    .map((item) => item.trim())
    .filter(Boolean);
};

/**
 * 符号：parseRuleDsl（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const parseRuleDsl = (dsl) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const text = String(dsl || "").trim();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!text) return { error: "dsl is empty" };

  const tokens = tokenizeDsl(text);
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (tokens.length < 1) {
    return { error: "dsl must not be empty" };
  }

  const rule = { ...DEFAULT_RULE };
  const warnings = [];
  const keyValues = [];

  // 步骤 3：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const token of tokens) {
    const kv = parseKeyValue(token);
    if (kv) {
      keyValues.push(kv);
    }
  }

  const conditionTokens = tokens
    .filter((token) => !token.includes("="))
    .map((token) => token.trim())
    .filter(Boolean);
  // 步骤 4：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const cleanedTokens = conditionTokens.filter(
    (token) => !["when", "if", "where"].includes(token.toLowerCase()),
  );
  const conditions = [];
  let logic = "all";

  // 步骤 5：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (let index = 0; index < cleanedTokens.length; index += 1) {
    const token = cleanedTokens[index];
    const lowered = token.toLowerCase();
    if (["and", "&&", "&"].includes(lowered)) {
      logic = "all";
      continue;
    }
    if (["or", "||", "|"].includes(lowered)) {
      logic = "any";
      continue;
    }

    if (index + 2 < cleanedTokens.length) {
      const metric = normalizeMetric(cleanedTokens[index]);
      const operator = normalizeOperator(cleanedTokens[index + 1]);
      const thresholdValue = Number(cleanedTokens[index + 2]);
      if (Number.isFinite(thresholdValue)) {
        conditions.push({ metric, operator, threshold: thresholdValue });
        index += 2;
        continue;
      }
    }
  }

  const hasMetricKey = keyValues.some((kv) => kv.key.toLowerCase() === "metric");
  const hasOperatorKey = keyValues.some((kv) => ["operator", "op"].includes(kv.key.toLowerCase()));
  const hasThresholdKey = keyValues.some((kv) => ["threshold", "value"].includes(kv.key.toLowerCase()));

  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (conditions.length > 0) {
    rule.conditions = conditions;
    rule.conditionLogic = logic;
    rule.metric = conditions[0].metric;
    rule.operator = conditions[0].operator;
    rule.threshold = conditions[0].threshold;
  } else if (!hasMetricKey && !hasOperatorKey && !hasThresholdKey) {
    if (tokens.length < 3) {
      return { error: "dsl must start with: <metric> <operator> <threshold>" };
    }
    rule.metric = normalizeMetric(tokens[0]);
    rule.operator = normalizeOperator(tokens[1]);
    rule.threshold = Number(tokens[2]);
    if (!Number.isFinite(rule.threshold)) {
      return { error: "threshold must be a number" };
    }
  }

  // 步骤 7：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const { key, value } of keyValues) {
    const normalizedKey = key.toLowerCase();
    const normalizedValue = stripQuotes(value);
    if (normalizedKey === "metric") rule.metric = normalizeMetric(normalizedValue);
    else if (normalizedKey === "operator" || normalizedKey === "op") rule.operator = normalizeOperator(normalizedValue);
    else if (normalizedKey === "threshold" || normalizedKey === "value") rule.threshold = Number(normalizedValue);
    else if (normalizedKey === "name") rule.name = normalizedValue;
    else if (normalizedKey === "desc" || normalizedKey === "description") rule.description = normalizedValue;
    else if (normalizedKey === "priority") rule.priority = normalizePriority(normalizedValue);
    else if (normalizedKey === "type" || normalizedKey === "ruletype") rule.ruleType = normalizeRuleType(normalizedValue);
    else if (normalizedKey === "logic" || normalizedKey === "conditionlogic") {
      rule.conditionLogic = normalizedValue === "any" ? "any" : "all";
    }
    else if (normalizedKey === "aggregation" || normalizedKey === "agg") rule.aggregation = normalizeAggregation(normalizedValue);
    else if (normalizedKey === "window") rule.windowMinutes = parseWindowMinutes(normalizedValue);
    else if (normalizedKey === "min" || normalizedKey === "minsamples") rule.minSamples = Number(normalizedValue);
    else if (normalizedKey === "cooldown") rule.cooldownMinutes = Number(normalizedValue);
    else if (normalizedKey === "scope") rule.scope = parseScope(normalizedValue);
    else if (normalizedKey === "actions") rule.actions = parseActions(normalizedValue);
    else warnings.push(`unknown_token:${normalizedKey}`);
  }

  // 步骤 8：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Number.isFinite(rule.threshold)) {
    return { error: "threshold must be a number" };
  }

  // 步骤 9：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!rule.name) {
    rule.name = `DSL ${rule.metric} ${rule.operator} ${rule.threshold}`;
  }

  rule.id = uid("rule");
  rule.enabled = true;
  rule.createdAt = new Date().toISOString();
  rule.updatedAt = rule.createdAt;

  // 步骤 10：返回当前结果并结束函数，明确本路径的输出语义。
  return { rule, warnings };
};




