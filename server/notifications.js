/**
 * @file server/notifications.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { nowIso, uid } from "./utils.js";

/**
 * 符号：MAX_NOTIFICATIONS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const MAX_NOTIFICATIONS = 5_000;
/**
 * 符号：RETRY_DELAYS_SECONDS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const RETRY_DELAYS_SECONDS = [15, 60, 300];
/**
 * 符号：MAX_ATTEMPTS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const MAX_ATTEMPTS = RETRY_DELAYS_SECONDS.length + 1;
/**
 * 符号：VALID_DELIVERY_MODES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const VALID_DELIVERY_MODES = new Set(["mock", "http"]);

/**
 * 符号：ensureNoiseState（arrow-function）
 * 作用说明：该函数用于前置校验，尽早拦截非法输入并缩短错误路径。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const ensureNoiseState = (state) => {
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
 * 符号：getPolicy（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getPolicy = (state) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const policy = state.alertPolicy || {};
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    enabled: policy.enabled ?? true,
    dedupWindowSeconds: Number(policy.dedupWindowSeconds ?? 180),
    suppressWindowSeconds: Number(policy.suppressWindowSeconds ?? 120),
    flapWindowMinutes: Number(policy.flapWindowMinutes ?? 20),
    flapThreshold: Number(policy.flapThreshold ?? 3),
    autoSilenceMinutes: Number(policy.autoSilenceMinutes ?? 30),
    sendRecovery: policy.sendRecovery ?? true,
    escalationEnabled: policy.escalationEnabled ?? true,
    escalateRequiresPrimary: policy.escalateRequiresPrimary ?? true,
    escalations: Array.isArray(policy.escalations) ? policy.escalations : [],
  };
};

/**
 * 符号：getFingerprint（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getFingerprint = (alert) => `${alert.ruleId}:${alert.apiId}`;

/**
 * 符号：getFingerprintState（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getFingerprintState = (state, fingerprint) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const noiseState = ensureNoiseState(state);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!noiseState.byFingerprint[fingerprint]) {
    noiseState.byFingerprint[fingerprint] = {
      openedAtHistory: [],
      lastNotifiedAt: null,
      lastRecoveryNotifiedAt: null,
      silencedUntil: null,
      lastOpenedAt: null,
      lastResolvedAt: null,
    };
  }
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return noiseState.byFingerprint[fingerprint];
};

/**
 * 符号：makeNotificationRecord（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const makeNotificationRecord = (channel, action, alert, rule, api, eventType) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const timestamp = nowIso();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const missingChannel = !channel;
  const disabled = Boolean(channel && channel.enabled === false);
  const configError = channel ? validateChannelConfig(channel) : null;
  const blockedReason = missingChannel
    ? "action_not_mapped_to_channel"
    : disabled
      ? "channel_disabled"
      : configError;
  const status = blockedReason ? "failed" : "queued";

  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    id: uid("notify"),
    alertId: alert.id,
    ruleId: rule.id,
    apiId: api.id,
    channelType: action,
    channelId: channel?.id ?? null,
    status,
    response: blockedReason || "queued",
    eventType,
    createdAt: timestamp,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    nextRetryAt: blockedReason ? null : timestamp,
    lastAttemptAt: null,
    sentAt: null,
    lastError: blockedReason,
    lastLatencyMs: null,
    deliveryMode: getDeliveryMode(channel),
    payload: {
      title: alert.title,
      message: alert.message,
      level: alert.level,
      apiPath: api.path,
      apiMethod: api.method || "GET",
      status: alert.status,
    },
  };
};

/**
 * 符号：normalizeUrlText（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeUrlText = (value) => String(value || "").trim();

/**
 * 符号：getDeliveryMode（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getDeliveryMode = (channel) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!channel || typeof channel !== "object") return "mock";
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const mode = String(channel.config?.deliveryMode || "mock").toLowerCase();
  return VALID_DELIVERY_MODES.has(mode) ? mode : "mock";
};

/**
 * 符号：validateChannelConfig（arrow-function）
 * 作用说明：该函数用于前置校验，尽早拦截非法输入并缩短错误路径。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const validateChannelConfig = (channel) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!channel) return "channel_missing";
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const config = channel.config && typeof channel.config === "object" ? channel.config : {};
  const type = String(channel.type || "").toLowerCase();

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "email") {
    if (!Array.isArray(config.recipients) || config.recipients.length === 0) {
      return "invalid_email_recipients";
    }
    return null;
  }
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "sms") {
    if (!Array.isArray(config.recipients) || config.recipients.length === 0) {
      return "invalid_sms_recipients";
    }
    return null;
  }
  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "webhook") {
    if (!normalizeUrlText(config.url)) return "invalid_webhook_url";
    return null;
  }
  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "slack" || type === "wechat") {
    if (!normalizeUrlText(config.webhookUrl)) return `invalid_${type}_webhook_url`;
    return null;
  }
  // 步骤 6：返回当前结果并结束函数，明确本路径的输出语义。
  return null;
};

/**
 * 符号：getChannelsForAction（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getChannelsForAction = (state, action) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const exactById = state.channels.find((item) => item.id === action);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (exactById) return [exactById];
  return state.channels.filter((item) => item.type === action);
};

/**
 * 符号：resolveDispatchTargets（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const resolveDispatchTargets = (state, actions) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const resolved = [];
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const seen = new Set();

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const action of actions) {
    const channels = getChannelsForAction(state, action);
    if (!channels.length) {
      const key = `missing:${action}`;
      if (!seen.has(key)) {
        seen.add(key);
        resolved.push({ action, channel: null });
      }
      continue;
    }

    for (const channel of channels) {
      const key = `channel:${channel.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      resolved.push({ action, channel });
    }
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return resolved;
};

/**
 * 符号：shouldSuppressTriggerNotification（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const shouldSuppressTriggerNotification = (state, alert, policy) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!policy.enabled) {
    return { suppress: false, reason: null };
  }

  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const nowMs = Date.now();
  const fingerprint = getFingerprint(alert);
  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const entry = getFingerprintState(state, fingerprint);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (entry.silencedUntil && nowMs < new Date(entry.silencedUntil).getTime()) {
    return { suppress: true, reason: "silenced_by_flapping" };
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (entry.lastNotifiedAt && policy.dedupWindowSeconds > 0) {
    const dedupMs = policy.dedupWindowSeconds * 1_000;
    if (nowMs - new Date(entry.lastNotifiedAt).getTime() < dedupMs) {
      return { suppress: true, reason: "deduplicated" };
    }
  }

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (entry.lastOpenedAt && policy.suppressWindowSeconds > 0) {
    const suppressMs = policy.suppressWindowSeconds * 1_000;
    if (nowMs - new Date(entry.lastOpenedAt).getTime() < suppressMs) {
      return { suppress: true, reason: "suppressed_by_window" };
    }
  }

  // 步骤 5：返回当前结果并结束函数，明确本路径的输出语义。
  return { suppress: false, reason: null };
};

/**
 * 符号：updateFlappingStateOnOpen（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const updateFlappingStateOnOpen = (state, alert, policy) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const now = nowIso();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const nowMs = Date.now();
  const fingerprint = getFingerprint(alert);
  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const entry = getFingerprintState(state, fingerprint);
  const flapWindowMs = Math.max(policy.flapWindowMinutes, 1) * 60_000;
  const history = Array.isArray(entry.openedAtHistory) ? entry.openedAtHistory : [];
  const nextHistory = history
    .filter((item) => nowMs - new Date(item).getTime() <= flapWindowMs)
    .concat(now);

  entry.openedAtHistory = nextHistory;
  entry.lastOpenedAt = now;

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (
    policy.enabled &&
    policy.autoSilenceMinutes > 0 &&
    nextHistory.length >= Math.max(policy.flapThreshold, 2)
  ) {
    entry.silencedUntil = new Date(nowMs + policy.autoSilenceMinutes * 60_000).toISOString();
  }
};

/**
 * 符号：updateFingerprintOnTriggerSend（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const updateFingerprintOnTriggerSend = (state, alert) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const now = nowIso();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const entry = getFingerprintState(state, getFingerprint(alert));
  entry.lastNotifiedAt = now;
};

/**
 * 符号：updateFingerprintOnRecoverySend（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const updateFingerprintOnRecoverySend = (state, alert) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const now = nowIso();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const entry = getFingerprintState(state, getFingerprint(alert));
  entry.lastRecoveryNotifiedAt = now;
};

/**
 * 符号：updateFingerprintOnResolved（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const updateFingerprintOnResolved = (state, alert) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const now = nowIso();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const entry = getFingerprintState(state, getFingerprint(alert));
  entry.lastResolvedAt = now;
};

/**
 * 符号：dispatchToActions（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const dispatchToActions = (state, alert, rule, api, eventType) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const actions = Array.isArray(rule.actions) ? rule.actions : [];
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const records = [];
  const targets = resolveDispatchTargets(state, actions);

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const { action, channel } of targets) {
    const record = makeNotificationRecord(channel, action, alert, rule, api, eventType);
    records.push(record);
    state.notifications.unshift(record);
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (state.notifications.length > MAX_NOTIFICATIONS) {
    state.notifications.length = MAX_NOTIFICATIONS;
  }

  alert.notifications = (alert.notifications ?? []).concat(records.map((item) => item.id));
  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return records;
};

/**
 * 符号：dispatchEscalationNotifications（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const dispatchEscalationNotifications = (state, alert, rule, api, escalation) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const actions = Array.isArray(escalation.actions) ? escalation.actions : [];
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const records = [];
  const targets = resolveDispatchTargets(state, actions);

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const { action, channel } of targets) {
    const record = makeNotificationRecord(channel, action, alert, rule, api, "escalation");
    record.payload = {
      ...record.payload,
      escalationLevel: escalation.level,
      escalationAfterMinutes: escalation.afterMinutes,
    };
    records.push(record);
    state.notifications.unshift(record);
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (state.notifications.length > MAX_NOTIFICATIONS) {
    state.notifications.length = MAX_NOTIFICATIONS;
  }

  alert.notifications = (alert.notifications ?? []).concat(records.map((item) => item.id));
  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return records;
};

/**
 * 符号：dispatchAlertNotifications（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const dispatchAlertNotifications = (state, alert, rule, api) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const policy = getPolicy(state);
  updateFlappingStateOnOpen(state, alert, policy);

  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const decision = shouldSuppressTriggerNotification(state, alert, policy);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (decision.suppress) {
    alert.lastNotificationStatus = "suppressed";
    alert.lastNotificationReason = decision.reason;
    return [];
  }

  updateFingerprintOnTriggerSend(state, alert);
  alert.lastNotificationStatus = "sent";
  alert.lastNotificationReason = null;
  alert.lastNotifiedAt = nowIso();
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return dispatchToActions(state, alert, rule, api, "trigger");
};

/**
 * 符号：dispatchAlertRecoveryNotifications（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const dispatchAlertRecoveryNotifications = (state, alert, rule, api) => {
  updateFingerprintOnResolved(state, alert);

  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const policy = getPolicy(state);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!policy.sendRecovery) {
    return [];
  }

  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const fingerprintState = getFingerprintState(state, getFingerprint(alert));
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!fingerprintState.lastNotifiedAt) {
    return [];
  }

  updateFingerprintOnRecoverySend(state, alert);
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return dispatchToActions(state, alert, rule, api, "recovery");
};

/**
 * 符号：processEscalationTick（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const processEscalationTick = (state, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const policy = getPolicy(state);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!policy.enabled || !policy.escalationEnabled) {
    return { processed: 0, sent: 0 };
  }

  const nowMs = Date.now();
  const escalations = policy.escalations
    .map((item) => ({
      level: String(item.level || "E1"),
      afterMinutes: Number(item.afterMinutes ?? 15),
      repeatMinutes: Number(item.repeatMinutes ?? 0),
      actions: Array.isArray(item.actions) ? item.actions : [],
    }))
    .filter((item) => item.actions.length > 0)
    .sort((a, b) => a.afterMinutes - b.afterMinutes);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!escalations.length) {
    return { processed: 0, sent: 0 };
  }

  let processed = 0;
  let sent = 0;

  // 步骤 3：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const alert of state.alerts) {
    if (!alert || (alert.status !== "open" && alert.status !== "acknowledged")) {
      continue;
    }

    if (policy.escalateRequiresPrimary && !alert.lastNotifiedAt) {
      continue;
    }

    const triggeredAtMs = new Date(alert.triggeredAt).getTime();
    if (!Number.isFinite(triggeredAtMs)) continue;
    const ageMinutes = (nowMs - triggeredAtMs) / 60_000;

    const rule = state.rules.find((item) => item.id === alert.ruleId);
    const api = state.apis.find((item) => item.id === alert.apiId);
    if (!rule || !api) continue;

    alert.escalations = Array.isArray(alert.escalations) ? alert.escalations : [];

    for (const escalation of escalations) {
      if (ageMinutes < escalation.afterMinutes) {
        continue;
      }

      const entry = alert.escalations.find((item) => item.level === escalation.level);
      const lastSentAt = entry?.lastSentAt ? new Date(entry.lastSentAt).getTime() : 0;
      const repeatMs = Math.max(0, escalation.repeatMinutes || 0) * 60_000;
      if (lastSentAt && repeatMs > 0 && nowMs - lastSentAt < repeatMs) {
        continue;
      }
      if (lastSentAt && repeatMs === 0) {
        continue;
      }

      const records = dispatchEscalationNotifications(state, alert, rule, api, escalation);
      if (records.length) {
        const nowIsoStr = nowIso();
        if (entry) {
          entry.lastSentAt = nowIsoStr;
        } else {
          alert.escalations.push({ level: escalation.level, lastSentAt: nowIsoStr });
        }
        alert.lastEscalationLevel = escalation.level;
        sent += records.length;
      }
    }

    processed += 1;
  }

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return { processed, sent };
};

/**
 * 符号：dispatchChannelTest（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const dispatchChannelTest = (state, channel, operator = "manual") => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const configError = validateChannelConfig(channel);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const blockedReason =
    !channel?.enabled ? "channel_disabled" : configError ? configError : null;
  const status = blockedReason ? "failed" : "queued";
  const record = {
    id: uid("notify"),
    alertId: null,
    ruleId: null,
    apiId: null,
    channelType: channel.type,
    channelId: channel.id,
    status,
    response: blockedReason || "queued",
    eventType: "test",
    createdAt: nowIso(),
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    nextRetryAt: blockedReason ? null : nowIso(),
    lastAttemptAt: null,
    sentAt: null,
    lastError: blockedReason,
    lastLatencyMs: null,
    deliveryMode: getDeliveryMode(channel),
    payload: {
      title: "Channel Test",
      message: `Test message to ${channel.name}`,
      level: "info",
      operator,
    },
  };

  state.notifications.unshift(record);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (state.notifications.length > MAX_NOTIFICATIONS) {
    state.notifications.length = MAX_NOTIFICATIONS;
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return record;
};

/**
 * 符号：parseHeaderMap（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const parseHeaderMap = (headersInput) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!headersInput || typeof headersInput !== "object") {
    return {};
  }

  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const output = {};
  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const [key, value] of Object.entries(headersInput)) {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) continue;
    output[normalizedKey] = String(value ?? "");
  }
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return output;
};

/**
 * 符号：fetchWithTimeout（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含 try/catch，说明该路径显式处理异常。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const fetchWithTimeout = async (url, options = {}, timeoutMs = 8_000) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const controller = new AbortController();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * 符号：shouldMockFail（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const shouldMockFail = (channel) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const rate = Number(channel?.config?.mockFailRate ?? 0);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Number.isFinite(rate) || rate <= 0) return false;
  const capped = Math.min(Math.max(rate, 0), 1);
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return Math.random() < capped;
};

/**
 * 符号：deliverByChannel（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const deliverByChannel = async (channel, record) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!channel) {
    return { success: false, response: "channel_missing", error: "channel_missing" };
  }

  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const deliveryMode = getDeliveryMode(channel);
  const config = channel.config && typeof channel.config === "object" ? channel.config : {};

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (deliveryMode === "mock") {
    if (shouldMockFail(channel)) {
      return { success: false, response: "mock_failed", error: "mock_failed" };
    }
    return { success: true, response: "mock_sent" };
  }

  const timeoutMs = Math.max(1_000, Number(config.timeoutMs ?? config.timeout ?? 8_000));
  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const payload = record.payload || {};
  const type = String(channel.type || "").toLowerCase();

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "webhook") {
    const url = normalizeUrlText(config.url);
    const method = String(config.method || "POST").toUpperCase();
    const headers = {
      "Content-Type": "application/json",
      ...parseHeaderMap(config.headers),
    };
    const response = await fetchWithTimeout(
      url,
      { method, headers, body: JSON.stringify(payload) },
      timeoutMs,
    );
    if (!response.ok) {
      return {
        success: false,
        response: `http_${response.status}`,
        error: `http_${response.status}`,
      };
    }
    return { success: true, response: `http_${response.status}` };
  }

  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "slack" || type === "wechat") {
    const url = normalizeUrlText(config.webhookUrl);
    const body =
      type === "slack"
        ? {
            text: `[${payload.level || "info"}] ${payload.title || ""} ${payload.message || ""}`.trim(),
          }
        : {
            msgtype: "text",
            text: {
              content: `[${payload.level || "info"}] ${payload.title || ""} ${payload.message || ""}`.trim(),
            },
          };
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      timeoutMs,
    );
    if (!response.ok) {
      return {
        success: false,
        response: `http_${response.status}`,
        error: `http_${response.status}`,
      };
    }
    return { success: true, response: `http_${response.status}` };
  }

  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "email") {
    return { success: true, response: "smtp_mock_sent" };
  }
  // 步骤 7：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "sms") {
    return { success: true, response: "sms_mock_sent" };
  }

  // 步骤 8：返回当前结果并结束函数，明确本路径的输出语义。
  return { success: true, response: "custom_mock_sent" };
};

/**
 * 符号：getRetryDelaySeconds（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getRetryDelaySeconds = (attempts) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (attempts <= 0) return RETRY_DELAYS_SECONDS[0];
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const index = Math.min(attempts - 1, RETRY_DELAYS_SECONDS.length - 1);
  return RETRY_DELAYS_SECONDS[index];
};

/**
 * 符号：processNotificationQueueTick（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const processNotificationQueueTick = async (state, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const limit = Math.max(1, Math.min(Number(options.limit ?? 20), 200));
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const nowMs = Date.now();
  const queued = state.notifications
    .filter((item) => {
      if (item.status !== "queued") return false;
      if (!item.channelId) return false;
      const nextRetryMs = item.nextRetryAt ? new Date(item.nextRetryAt).getTime() : 0;
      return !Number.isFinite(nextRetryMs) || nextRetryMs <= nowMs;
    })
    .slice(0, limit);

  const summary = {
    processed: 0,
    sent: 0,
    failed: 0,
    retried: 0,
  };

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const record of queued) {
    const channel = state.channels.find((item) => item.id === record.channelId);
    const configError = validateChannelConfig(channel);
    if (!channel || !channel.enabled || configError) {
      record.status = "failed";
      record.lastError = !channel
        ? "channel_missing"
        : !channel.enabled
          ? "channel_disabled"
          : configError;
      record.response = record.lastError;
      record.nextRetryAt = null;
      summary.failed += 1;
      summary.processed += 1;
      continue;
    }

    record.attempts = Number(record.attempts || 0) + 1;
    record.lastAttemptAt = nowIso();
    const startedAt = Date.now();

    try {
      const result = await deliverByChannel(channel, record);
      record.lastLatencyMs = Date.now() - startedAt;

      if (result.success) {
        record.status = "sent";
        record.response = result.response || "accepted";
        record.lastError = null;
        record.sentAt = nowIso();
        record.nextRetryAt = null;
        summary.sent += 1;
      } else if (record.attempts < Number(record.maxAttempts || MAX_ATTEMPTS)) {
        const delaySeconds = getRetryDelaySeconds(record.attempts);
        record.status = "queued";
        record.lastError = result.error || "delivery_failed";
        record.response = `retry_in_${delaySeconds}s`;
        record.nextRetryAt = new Date(Date.now() + delaySeconds * 1_000).toISOString();
        summary.retried += 1;
      } else {
        record.status = "failed";
        record.lastError = result.error || "delivery_failed";
        record.response = result.response || "delivery_failed";
        record.nextRetryAt = null;
        summary.failed += 1;
      }
    } catch (error) {
      record.lastLatencyMs = Date.now() - startedAt;
      if (record.attempts < Number(record.maxAttempts || MAX_ATTEMPTS)) {
        const delaySeconds = getRetryDelaySeconds(record.attempts);
        record.status = "queued";
        record.lastError = String(error?.message || "delivery_exception");
        record.response = `retry_in_${delaySeconds}s`;
        record.nextRetryAt = new Date(Date.now() + delaySeconds * 1_000).toISOString();
        summary.retried += 1;
      } else {
        record.status = "failed";
        record.lastError = String(error?.message || "delivery_exception");
        record.response = "delivery_exception";
        record.nextRetryAt = null;
        summary.failed += 1;
      }
    }

    summary.processed += 1;
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return summary;
};




