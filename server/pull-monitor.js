/**
 * @file server/pull-monitor.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import { round, toNumber } from "./utils.js";

/**
 * 符号：DEFAULT_EXPECTED_STATUS_CODES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const DEFAULT_EXPECTED_STATUS_CODES = [200, 201, 202, 204];
/**
 * 符号：WRITE_METHODS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * 符号：toObjectRecord（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const toObjectRecord = (value) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return value;
};

/**
 * 符号：normalizeHeaders（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeHeaders = (headers) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const record = toObjectRecord(headers);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const normalized = {};

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const [key, value] of Object.entries(record)) {
    if (!key) continue;
    normalized[String(key)] = String(value);
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return normalized;
};

/**
 * 符号：normalizeExpectedStatusCodes（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeExpectedStatusCodes = (value) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (Array.isArray(value)) {
    const numbers = value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 100 && item <= 599);
    return numbers.length ? [...new Set(numbers)] : DEFAULT_EXPECTED_STATUS_CODES;
  }

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (typeof value === "string") {
    const numbers = value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item >= 100 && item <= 599);

    return numbers.length ? [...new Set(numbers)] : DEFAULT_EXPECTED_STATUS_CODES;
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return DEFAULT_EXPECTED_STATUS_CODES;
};

/**
 * 符号：normalizeCheckConfig（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const normalizeCheckConfig = (input, fallback = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const source = toObjectRecord(input);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const previous = toObjectRecord(fallback);

  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    url: String(source.url ?? previous.url ?? "").trim(),
    method: String(source.method ?? previous.method ?? "GET").toUpperCase(),
    headers: normalizeHeaders(source.headers ?? previous.headers ?? {}),
    body:
      source.body === undefined
        ? previous.body ?? ""
        : typeof source.body === "string"
        ? source.body
        : JSON.stringify(source.body),
    timeoutMs: Math.max(500, Math.min(toNumber(source.timeoutMs, previous.timeoutMs ?? 5_000), 120_000)),
    intervalSeconds: Math.max(
      5,
      Math.min(toNumber(source.intervalSeconds, previous.intervalSeconds ?? 60), 3_600),
    ),
    expectedStatusCodes: normalizeExpectedStatusCodes(
      source.expectedStatusCodes ?? previous.expectedStatusCodes,
    ),
    followRedirect: source.followRedirect ?? previous.followRedirect ?? true,
    safetyMode: ["readonly", "dry_run", "sandbox"].includes(
      String(source.safetyMode ?? previous.safetyMode ?? "readonly"),
    )
      ? String(source.safetyMode ?? previous.safetyMode ?? "readonly")
      : "readonly",
    dryRunParamKey: String(source.dryRunParamKey ?? previous.dryRunParamKey ?? "dryRun"),
    dryRunParamValue: String(source.dryRunParamValue ?? previous.dryRunParamValue ?? "true"),
    allowInProduction: Boolean(source.allowInProduction ?? previous.allowInProduction ?? false),
    credentialId:
      source.credentialId === undefined
        ? previous.credentialId ?? null
        : source.credentialId
        ? String(source.credentialId)
        : null,
  };
};

/**
 * 符号：encodeBasic（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const encodeBasic = (text) => Buffer.from(text).toString("base64");

/**
 * 符号：applyCredential（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const applyCredential = (urlInput, headersInput, credential, resolvedSecrets = null) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const headers = { ...headersInput };
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  let url = urlInput;

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!credential) {
    return { url, headers };
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (credential.enabled === false) {
    throw new Error("credential_disabled");
  }

  const config =
    resolvedSecrets && typeof resolvedSecrets === "object"
      ? resolvedSecrets
      : credential.config && typeof credential.config === "object"
      ? credential.config
      : {};
  const type = String(credential.type || "custom");

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "bearer") {
    const token = String(config.token || "").trim();
    if (!token) throw new Error("credential_missing_token");
    headers.Authorization = `Bearer ${token}`;
    return { url, headers };
  }

  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "basic") {
    const username = String(config.username || "");
    const password = String(config.password || "");
    if (!username && !password) throw new Error("credential_missing_basic_auth");
    headers.Authorization = `Basic ${encodeBasic(`${username}:${password}`)}`;
    return { url, headers };
  }

  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "api_key") {
    const key = String(config.key || "").trim();
    const value = String(config.value || "").trim();
    const location = String(config.in || "header");
    if (!key || !value) throw new Error("credential_missing_api_key");

    if (location === "query") {
      try {
        const urlObj = new URL(url);
        urlObj.searchParams.set(key, value);
        url = urlObj.toString();
      } catch {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }
    } else {
      headers[key] = value;
    }

    return { url, headers };
  }

  // 步骤 7：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "custom") {
    const customHeaders =
      config.headers && typeof config.headers === "object" && !Array.isArray(config.headers)
        ? config.headers
        : {};
    for (const [key, value] of Object.entries(customHeaders)) {
      if (!key) continue;
      headers[String(key)] = String(value);
    }
    return { url, headers };
  }

  // 步骤 8：返回当前结果并结束函数，明确本路径的输出语义。
  return { url, headers };
};

/**
 * 符号：createPushMonitor（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const createPushMonitor = (fallback = {}) => ({
  mode: "push",
  enabled: fallback.enabled ?? true,
  source: fallback.source ?? "metrics",
  checkConfig: null,
  lastCheckedAt: fallback.lastCheckedAt ?? null,
  lastStatusCode: fallback.lastStatusCode ?? null,
  lastLatencyMs: fallback.lastLatencyMs ?? null,
  lastError: fallback.lastError ?? null,
  lastSuccess: fallback.lastSuccess ?? null,
  lastResponseSnippet: fallback.lastResponseSnippet ?? null,
});

/**
 * 符号：createPullMonitor（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const createPullMonitor = (payload, fallback = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const checkConfig = normalizeCheckConfig(payload?.checkConfig ?? payload, fallback.checkConfig ?? {});

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!checkConfig.url) {
    throw new Error("pull monitor requires checkConfig.url");
  }

  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    mode: "pull",
    enabled: payload?.enabled ?? fallback.enabled ?? true,
    source: "http-check",
    checkConfig,
    lastCheckedAt: fallback.lastCheckedAt ?? null,
    lastStatusCode: fallback.lastStatusCode ?? null,
    lastLatencyMs: fallback.lastLatencyMs ?? null,
    lastError: fallback.lastError ?? null,
    lastSuccess: fallback.lastSuccess ?? null,
    lastResponseSnippet: fallback.lastResponseSnippet ?? null,
  };
};

/**
 * 符号：normalizeMonitorConfig（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const normalizeMonitorConfig = (payload, fallback = null) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const previous = fallback && typeof fallback === "object" ? fallback : createPushMonitor();

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!payload || typeof payload !== "object") {
    return previous.mode === "pull" ? createPullMonitor(previous, previous) : createPushMonitor(previous);
  }

  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const mode = String(payload.mode ?? previous.mode ?? "push");

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (mode === "pull") {
    return createPullMonitor(payload, previous);
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return createPushMonitor({
    ...previous,
    enabled: payload.enabled ?? previous.enabled,
    source: payload.source ?? previous.source,
  });
};

/**
 * 符号：isPullMonitorEnabled（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const isPullMonitorEnabled = (api) => {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return Boolean(
    api?.monitor &&
      api.monitor.mode === "pull" &&
      api.monitor.enabled !== false &&
      api.monitor.checkConfig?.url,
  );
};

/**
 * 符号：isPushModeApi（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const isPushModeApi = (api) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!api?.monitor) return true;
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return api.monitor.mode !== "pull";
};

/**
 * 符号：getPullIntervalMs（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const getPullIntervalMs = (api) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const seconds = Math.max(5, toNumber(api?.monitor?.checkConfig?.intervalSeconds, 60));
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return seconds * 1_000;
};

/**
 * 符号：listDuePullApis（const）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const listDuePullApis = (state, nowMs = Date.now()) => {
  const candidates = state.apis.filter((api) => isPullMonitorEnabled(api));

  return candidates
    .filter((api) => {
      const lastCheckedMs = api.monitor?.lastCheckedAt
        ? new Date(api.monitor.lastCheckedAt).getTime()
        : 0;

      return nowMs - lastCheckedMs >= getPullIntervalMs(api);
    })
    .sort((left, right) => {
      const leftMs = left.monitor?.lastCheckedAt ? new Date(left.monitor.lastCheckedAt).getTime() : 0;
      const rightMs = right.monitor?.lastCheckedAt ? new Date(right.monitor.lastCheckedAt).getTime() : 0;
      return leftMs - rightMs;
    });
};

/**
 * 符号：runHttpCheck（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const runHttpCheck = async (api, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const startedAtMs = Date.now();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const checkedAt = new Date(startedAtMs).toISOString();

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!isPullMonitorEnabled(api)) {
    return {
      success: false,
      checkedAt,
      statusCode: null,
      latencyMs: 0,
      error: "pull_monitor_not_enabled",
      responseSnippet: null,
    };
  }

  const config = api.monitor.checkConfig;
  const method = String(config.method || "GET").toUpperCase();
  const isWriteMethod = WRITE_METHODS.has(method);
  const environment = String(api.environment || "production").toLowerCase();

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (isWriteMethod && config.safetyMode === "readonly") {
    return {
      success: false,
      checkedAt,
      statusCode: null,
      latencyMs: 0,
      error: "write_method_blocked_readonly_mode",
      responseSnippet: null,
    };
  }

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (
    isWriteMethod &&
    config.safetyMode === "sandbox" &&
    environment === "production" &&
    !config.allowInProduction
  ) {
    return {
      success: false,
      checkedAt,
      statusCode: null,
      latencyMs: 0,
      error: "write_method_blocked_in_production",
      responseSnippet: null,
    };
  }

  const timeoutMs = Math.max(500, Math.min(toNumber(config.timeoutMs, 5_000), 120_000));

  // 步骤 5：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let finalUrl = config.url;
  const finalHeaders = { ...config.headers };
  let finalBody = config.body;

  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (config.credentialId) {
    const credential = options.credential || null;
    if (!credential) {
      return {
        success: false,
        checkedAt,
        statusCode: null,
        latencyMs: 0,
        error: `credential_not_found:${config.credentialId}`,
        responseSnippet: null,
      };
    }

    try {
      const injected = applyCredential(
        finalUrl,
        finalHeaders,
        credential,
        options.resolvedCredentialSecrets || null,
      );
      finalUrl = injected.url;
      Object.assign(finalHeaders, injected.headers);
    } catch (error) {
      return {
        success: false,
        checkedAt,
        statusCode: null,
        latencyMs: 0,
        error: String(error?.message || "credential_injection_failed"),
        responseSnippet: null,
      };
    }
  }

  // 步骤 7：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (isWriteMethod && config.safetyMode === "dry_run") {
    try {
      const url = new URL(finalUrl);
      url.searchParams.set(config.dryRunParamKey || "dryRun", config.dryRunParamValue || "true");
      finalUrl = url.toString();
    } catch {
      const separator = finalUrl.includes("?") ? "&" : "?";
      finalUrl = `${finalUrl}${separator}${encodeURIComponent(
        config.dryRunParamKey || "dryRun",
      )}=${encodeURIComponent(config.dryRunParamValue || "true")}`;
    }

    finalHeaders["x-monitor-dry-run"] = "true";
  }

  // 步骤 8：对可能失败的操作进行异常保护，避免单点错误中断整体流程。
  try {
    const response = await fetch(finalUrl, {
      method,
      headers: finalHeaders,
      body:
        finalBody && WRITE_METHODS.has(method)
          ? finalBody
          : undefined,
      redirect: config.followRedirect === false ? "manual" : "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    let responseSnippet = null;
    if (options.readBody !== false) {
      try {
        const text = await response.text();
        responseSnippet = text.slice(0, 240);
      } catch {
        responseSnippet = null;
      }
    }

    const statusCode = response.status;
    const expectedStatusCodes = normalizeExpectedStatusCodes(config.expectedStatusCodes);
    const success = expectedStatusCodes.includes(statusCode);

    return {
      success,
      checkedAt,
      statusCode,
      latencyMs: Date.now() - startedAtMs,
      error: success ? null : `unexpected_status_${statusCode}`,
      responseSnippet,
    };
  } catch (error) {
    clearTimeout(timeout);

    const isTimeout = error?.name === "AbortError";

    return {
      success: false,
      checkedAt,
      statusCode: null,
      latencyMs: Date.now() - startedAtMs,
      error: isTimeout ? `timeout_${timeoutMs}ms` : String(error?.message || "request_failed"),
      responseSnippet: null,
    };
  }
};

/**
 * 符号：applyCheckResultToApi（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const applyCheckResultToApi = (api, checkResult) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!api.monitor || typeof api.monitor !== "object") {
    api.monitor = createPushMonitor();
  }

  api.monitor.lastCheckedAt = checkResult.checkedAt;
  api.monitor.lastStatusCode = checkResult.statusCode;
  api.monitor.lastLatencyMs = checkResult.latencyMs;
  api.monitor.lastError = checkResult.error;
  api.monitor.lastSuccess = checkResult.success;
  api.monitor.lastResponseSnippet = checkResult.responseSnippet ?? null;
};

/**
 * 符号：buildMetricFromPullCheck（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const buildMetricFromPullCheck = (api, checkResult) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const baseline = api.baseline || {};
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const latency = Math.max(1, toNumber(checkResult.latencyMs, baseline.latencyP95 ?? 300));
  const is5xx = checkResult.statusCode !== null && checkResult.statusCode >= 500;

  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    apiId: api.id,
    timestamp: checkResult.checkedAt,
    qps: 0,
    errorRate: checkResult.success ? 0 : 100,
    latencyP95: round(latency, 0),
    latencyP99: round(Math.max(latency * 1.12, latency + 12), 0),
    availability: checkResult.success ? 100 : 0,
    statusCode5xx: is5xx ? 1 : 0,
  };
};




