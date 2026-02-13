/**
 * @file server/alert-policy.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { toNumber } from "./utils.js";

/**
 * 符号：toPositiveInt（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const toPositiveInt = (value, fallback, min, max) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const normalized = Math.trunc(toNumber(value, fallback));
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Number.isFinite(normalized)) return fallback;
  return Math.min(Math.max(normalized, min), max);
};

/**
 * 符号：normalizeEscalations（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeEscalations = (value) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Array.isArray(value)) return [];
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return value
    .map((item, index) => {
      const entry = item && typeof item === "object" ? item : {};
      return {
        level: String(entry.level || `E${index + 1}`),
        afterMinutes: toPositiveInt(entry.afterMinutes, 15, 1, 43_200),
        repeatMinutes: toPositiveInt(entry.repeatMinutes, 0, 0, 43_200),
        actions: Array.isArray(entry.actions) ? entry.actions.map((action) => String(action)) : [],
      };
    })
    .filter((item) => item.actions.length > 0);
};

/**
 * 符号：createDefaultAlertPolicy（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const createDefaultAlertPolicy = () => ({
  enabled: true,
  dedupWindowSeconds: 180,
  suppressWindowSeconds: 120,
  flapWindowMinutes: 20,
  flapThreshold: 3,
  autoSilenceMinutes: 30,
  sendRecovery: true,
  escalationEnabled: true,
  escalateRequiresPrimary: true,
  escalations: [],
});

/**
 * 符号：normalizeAlertPolicy（const）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const normalizeAlertPolicy = (input, fallback = createDefaultAlertPolicy()) => {
  const base = fallback && typeof fallback === "object" ? fallback : createDefaultAlertPolicy();
  const source = input && typeof input === "object" ? input : {};

  return {
    enabled: source.enabled ?? base.enabled ?? true,
    dedupWindowSeconds: toPositiveInt(
      source.dedupWindowSeconds,
      base.dedupWindowSeconds ?? 180,
      0,
      86_400,
    ),
    suppressWindowSeconds: toPositiveInt(
      source.suppressWindowSeconds,
      base.suppressWindowSeconds ?? 120,
      0,
      86_400,
    ),
    flapWindowMinutes: toPositiveInt(
      source.flapWindowMinutes,
      base.flapWindowMinutes ?? 20,
      1,
      1_440,
    ),
    flapThreshold: toPositiveInt(source.flapThreshold, base.flapThreshold ?? 3, 2, 100),
    autoSilenceMinutes: toPositiveInt(
      source.autoSilenceMinutes,
      base.autoSilenceMinutes ?? 30,
      0,
      43_200,
    ),
    sendRecovery: source.sendRecovery ?? base.sendRecovery ?? true,
    escalationEnabled: source.escalationEnabled ?? base.escalationEnabled ?? true,
    escalateRequiresPrimary: source.escalateRequiresPrimary ?? base.escalateRequiresPrimary ?? true,
    escalations: normalizeEscalations(source.escalations ?? base.escalations ?? []),
  };
};

/**
 * 符号：createDefaultAlertNoiseState（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const createDefaultAlertNoiseState = () => ({
  byFingerprint: {},
});

/**
 * 符号：normalizeAlertNoiseState（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const normalizeAlertNoiseState = (input) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!input || typeof input !== "object") {
    return createDefaultAlertNoiseState();
  }

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!input.byFingerprint || typeof input.byFingerprint !== "object") {
    return createDefaultAlertNoiseState();
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    byFingerprint: input.byFingerprint,
  };
};




