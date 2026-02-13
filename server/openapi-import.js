/**
 * @file server/openapi-import.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { createPushMonitor, normalizeMonitorConfig } from "./pull-monitor.js";
import { uid } from "./utils.js";

/**
 * 符号：HTTP_METHODS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];
/**
 * 符号：WRITE_METHODS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * 符号：parseMaybeYaml（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含 try/catch，说明该路径显式处理异常。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const parseMaybeYaml = async (text) => {
  // 步骤 1：对可能失败的操作进行异常保护，避免单点错误中断整体流程。
  try {
    return JSON.parse(text);
  } catch {
    try {
      const yamlModule = await import("yaml");
      return yamlModule.parse(text);
    } catch {
      throw new Error("OpenAPI payload must be valid JSON (or YAML with `yaml` dependency available).");
    }
  }
};

/**
 * 符号：buildPathFromServerAndRoute（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildPathFromServerAndRoute = (serverUrl, routePath) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!serverUrl) return routePath;

  // 步骤 1：对可能失败的操作进行异常保护，避免单点错误中断整体流程。
  try {
    const url = new URL(serverUrl);
    const basePath = url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
    return `${basePath}${routePath}`;
  } catch {
    return routePath;
  }
};

/**
 * 符号：sanitizeServiceName（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const sanitizeServiceName = (input, fallback = "imported-service") => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const text = String(input || fallback).trim().toLowerCase();
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return text.replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
};

/**
 * 符号：inferOperationSummary（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const inferOperationSummary = (method, routePath, operation) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (operation?.summary) return String(operation.summary);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (operation?.operationId) return String(operation.operationId);
  return `${method} ${routePath}`;
};

/**
 * 符号：buildPullMonitorForMethod（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildPullMonitorForMethod = (method, targetUrl, defaults) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const safeMethod = method.toUpperCase();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const isWriteMethod = WRITE_METHODS.has(safeMethod);

  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return normalizeMonitorConfig(
    {
      mode: "pull",
      enabled: true,
      source: "openapi-import",
      checkConfig: {
        url: targetUrl,
        method: safeMethod,
        timeoutMs: defaults.timeoutMs,
        intervalSeconds: defaults.intervalSeconds,
        expectedStatusCodes: defaults.expectedStatusCodes,
        headers: defaults.headers || {},
        body: defaults.body || "",
        safetyMode: isWriteMethod ? defaults.writeSafetyMode : defaults.readSafetyMode,
        dryRunParamKey: defaults.dryRunParamKey,
        dryRunParamValue: defaults.dryRunParamValue,
        allowInProduction: defaults.allowWriteInProduction,
        credentialId: defaults.credentialId || null,
      },
    },
    createPushMonitor({ source: "openapi-import" }),
  );
};

/**
 * 符号：parseOpenApiDocument（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const parseOpenApiDocument = async (input) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const sourceType = String(input?.sourceType || "text");

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (sourceType === "url") {
    const url = String(input?.url || "").trim();
    if (!url) {
      throw new Error("url is required when sourceType=url.");
    }

    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI document: HTTP ${response.status}`);
    }
    const text = await response.text();
    return parseMaybeYaml(text);
  }

  const text = String(input?.text || "").trim();
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!text) {
    throw new Error("text is required when sourceType=text.");
  }
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return parseMaybeYaml(text);
};

/**
 * 符号：buildOpenApiImportPreview（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const buildOpenApiImportPreview = (doc, defaults = {}) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!doc || typeof doc !== "object") {
    throw new Error("OpenAPI document is invalid.");
  }

  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const paths = doc.paths;
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!paths || typeof paths !== "object") {
    throw new Error("OpenAPI document has no paths.");
  }

  const serverUrl = Array.isArray(doc.servers) ? doc.servers[0]?.url : "";
  const includeMethods = Array.isArray(defaults.includeMethods)
    ? defaults.includeMethods.map((item) => String(item).toUpperCase())
    : [];

  const importDefaults = {
    owner: String(defaults.owner || "Imported Team"),
    environment: ["production", "staging", "test"].includes(String(defaults.environment))
      ? String(defaults.environment)
      : "test",
    service: sanitizeServiceName(defaults.service, "imported-service"),
    tags: Array.isArray(defaults.tags) ? defaults.tags.map(String) : [],
    intervalSeconds: Math.max(Number(defaults.intervalSeconds || 120), 10),
    timeoutMs: Math.max(Number(defaults.timeoutMs || 5000), 500),
    expectedStatusCodes: Array.isArray(defaults.expectedStatusCodes)
      ? defaults.expectedStatusCodes.map(Number).filter(Number.isFinite)
      : [200, 204],
    headers: defaults.headers && typeof defaults.headers === "object" ? defaults.headers : {},
    body: typeof defaults.body === "string" ? defaults.body : "",
    readSafetyMode: "readonly",
    writeSafetyMode: String(defaults.writeSafetyMode || "dry_run"),
    dryRunParamKey: String(defaults.dryRunParamKey || "dryRun"),
    dryRunParamValue: String(defaults.dryRunParamValue || "true"),
    allowWriteInProduction: Boolean(defaults.allowWriteInProduction),
    credentialId: defaults.credentialId ? String(defaults.credentialId) : null,
  };

  const records = [];

  // 步骤 3：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const [routePath, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== "object") {
        continue;
      }

      const methodUpper = method.toUpperCase();
      if (includeMethods.length && !includeMethods.includes(methodUpper)) {
        continue;
      }

      const endpointPath = buildPathFromServerAndRoute(serverUrl, routePath);
      const serviceFromTag = Array.isArray(operation.tags) && operation.tags.length
        ? sanitizeServiceName(operation.tags[0], importDefaults.service)
        : importDefaults.service;
      const mergedTags = [
        ...importDefaults.tags,
        ...(Array.isArray(operation.tags) ? operation.tags.map(String) : []),
      ];

      records.push({
        method: methodUpper,
        path: endpointPath,
        name: inferOperationSummary(methodUpper, routePath, operation),
        service: serviceFromTag,
        tags: [...new Set(mergedTags)],
        owner: importDefaults.owner,
        environment: importDefaults.environment,
        monitor: buildPullMonitorForMethod(
          methodUpper,
          (() => {
            try {
              return new URL(routePath, serverUrl).toString();
            } catch {
              return routePath;
            }
          })(),
          importDefaults,
        ),
      });
    }
  }

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return records;
};

/**
 * 符号：createApiFromOpenApiRecord（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const createApiFromOpenApiRecord = (record) => ({
  id: uid("api"),
  method: record.method,
  name: String(record.name),
  path: String(record.path),
  owner: String(record.owner),
  service: String(record.service),
  environment: String(record.environment),
  tags: Array.isArray(record.tags) ? record.tags.map(String) : [],
  baseline: {
    qps: 100,
    errorRate: 1,
    latencyP95: 300,
    latencyP99: 500,
    availability: 99.9,
  },
  monitor: record.monitor,
  status: "unknown",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});




