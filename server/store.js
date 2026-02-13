/**
 * @file server/store.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDefaultState } from "./default-data.js";
import {
  createDefaultAlertNoiseState,
  createDefaultAlertPolicy,
  normalizeAlertNoiseState,
  normalizeAlertPolicy,
} from "./alert-policy.js";
import { sanitizeCredentialConfigForStorage } from "./credential-secrets.js";
import { applyMigrations, CURRENT_SCHEMA_VERSION } from "./migrations.js";
import { createPushMonitor, normalizeMonitorConfig } from "./pull-monitor.js";
import { nowIso } from "./utils.js";

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
 * 符号：DATA_DIR（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const DATA_DIR = path.join(__dirname, "data");
/**
 * 符号：STORE_FILE（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const STORE_FILE = path.join(DATA_DIR, "store.json");

/**
 * 符号：SAVE_DELAY_MS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const SAVE_DELAY_MS = Math.max(200, Number(process.env.STORE_SAVE_DELAY_MS || 900));
/**
 * 符号：STORE_PRETTY_PRINT（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const STORE_PRETTY_PRINT = process.env.STORE_PRETTY_PRINT === "true";
/**
 * 符号：STORE_TMP_FILE（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const STORE_TMP_FILE = `${STORE_FILE}.tmp`;

let state = null;
let pendingSave = null;
let persistInFlight = false;
let persistQueued = false;

/**
 * 符号：ensureDirectory（arrow-function）
 * 作用说明：该函数用于前置校验，尽早拦截非法输入并缩短错误路径。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const ensureDirectory = () => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

/**
 * 符号：serializeState（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const serializeState = () => (
  STORE_PRETTY_PRINT
    ? JSON.stringify(state, null, 2)
    : JSON.stringify(state)
);

/**
 * 符号：createPersistSnapshot（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const createPersistSnapshot = () => ({
  payload: serializeState(),
  updatedAt: state?.meta?.updatedAt || "",
});

/**
 * 符号：persistNowSync（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const persistNowSync = () => {
  ensureDirectory();
  fs.writeFileSync(STORE_FILE, serializeState(), "utf8");
};

/**
 * 符号：persistNowAsync（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const persistNowAsync = async (snapshot) => {
  ensureDirectory();
  // 步骤 1：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  await fs.promises.writeFile(STORE_TMP_FILE, snapshot.payload, "utf8");
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if ((state?.meta?.updatedAt || "") !== snapshot.updatedAt) {
    await fs.promises.rm(STORE_TMP_FILE, { force: true });
    return;
  }
  // 步骤 2：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  await fs.promises.rename(STORE_TMP_FILE, STORE_FILE);
};

/**
 * 符号：migrateStateShape（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含 try/catch，说明该路径显式处理异常。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const migrateStateShape = (parsed) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const migrated = {
    ...parsed,
    users: Array.isArray(parsed.users) ? parsed.users : [],
    apis: Array.isArray(parsed.apis) ? parsed.apis : [],
    rules: Array.isArray(parsed.rules) ? parsed.rules : [],
    metrics: Array.isArray(parsed.metrics) ? parsed.metrics : [],
    alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
    ruleHits: Array.isArray(parsed.ruleHits) ? parsed.ruleHits : [],
    channels: Array.isArray(parsed.channels) ? parsed.channels : [],
    credentials: Array.isArray(parsed.credentials) ? parsed.credentials : [],
    ruleDrafts: Array.isArray(parsed.ruleDrafts) ? parsed.ruleDrafts : [],
    qualityMarkers: Array.isArray(parsed.qualityMarkers) ? parsed.qualityMarkers : [],
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    simulator:
      parsed.simulator && typeof parsed.simulator === "object"
        ? parsed.simulator
        : { enabled: true, intervalSeconds: 15, lastTickAt: null },
    meta:
      parsed.meta && typeof parsed.meta === "object"
        ? parsed.meta
        : { version: 1, schemaVersion: CURRENT_SCHEMA_VERSION, createdAt: nowIso(), updatedAt: nowIso() },
    alertPolicy: normalizeAlertPolicy(parsed.alertPolicy, createDefaultAlertPolicy()),
    alertNoiseState: normalizeAlertNoiseState(
      parsed.alertNoiseState || createDefaultAlertNoiseState(),
    ),
  };

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const api of migrated.apis) {
    api.method = String(api.method || api.monitor?.checkConfig?.method || "GET").toUpperCase();
    api.environment = ["production", "staging", "test"].includes(String(api.environment))
      ? String(api.environment)
      : "production";
    try {
      api.monitor = normalizeMonitorConfig(api.monitor, createPushMonitor({ source: "legacy" }));
    } catch {
      api.monitor = createPushMonitor({ source: "legacy" });
    }
  }

  // 步骤 3：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const credential of migrated.credentials) {
    credential.type = String(credential.type || "custom");
    credential.name = String(credential.name || credential.id || "credential");
    credential.enabled = credential.enabled ?? true;
    credential.config = sanitizeCredentialConfigForStorage(credential.type, credential.config);
    credential.createdAt = credential.createdAt || nowIso();
    credential.updatedAt = credential.updatedAt || nowIso();
  }

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return applyMigrations(migrated);
};

/**
 * 符号：loadFromDisk（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const loadFromDisk = () => {
  ensureDirectory();

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!fs.existsSync(STORE_FILE)) {
    state = createDefaultState();
    persistNowSync();
    return;
  }

  // 步骤 2：对可能失败的操作进行异常保护，避免单点错误中断整体流程。
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.apis)) {
      throw new Error("Invalid store format.");
    }

    state = migrateStateShape(parsed);
  } catch (error) {
    console.error("Failed to load store.json, falling back to default data.", error);
    state = createDefaultState();
    persistNowSync();
  }
};

loadFromDisk();

/**
 * 符号：schedulePersist（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const schedulePersist = () => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (pendingSave) {
    return;
  }

  pendingSave = setTimeout(() => {
    pendingSave = null;
    if (persistInFlight) {
      persistQueued = true;
      return;
    }

    persistInFlight = true;
    const snapshot = createPersistSnapshot();

    persistNowAsync(snapshot)
      .catch((error) => {
        console.error("Failed to persist store state.", error);
      })
      .finally(() => {
        persistInFlight = false;
        if (persistQueued) {
          persistQueued = false;
          schedulePersist();
        }
      });
  }, SAVE_DELAY_MS);
};

/**
 * 符号：getState（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const getState = () => state;

/**
 * 符号：mutateState（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const mutateState = (mutator, options = {}) => {
  mutator(state);

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!options.skipTimestamp && state?.meta) {
    state.meta.updatedAt = nowIso();
  }

  schedulePersist();
};

/**
 * 符号：forcePersist（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const forcePersist = () => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (pendingSave) {
    clearTimeout(pendingSave);
    pendingSave = null;
  }
  persistQueued = false;
  persistNowSync();
};

/**
 * 符号：resetState（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const resetState = () => {
  state = createDefaultState();
  persistNowSync();
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return state;
};




