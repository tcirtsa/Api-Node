/**
 * @file server/migrations.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { nowIso } from "./utils.js";

/**
 * 符号：CURRENT_SCHEMA_VERSION（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const CURRENT_SCHEMA_VERSION = 4;

/**
 * 符号：ensureMeta（arrow-function）
 * 作用说明：该函数用于前置校验，尽早拦截非法输入并缩短错误路径。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const ensureMeta = (state) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!state.meta || typeof state.meta !== "object") {
    state.meta = { version: 1, createdAt: nowIso(), updatedAt: nowIso() };
  }
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return state.meta;
};

/**
 * 符号：migrateV1ToV2（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const migrateV1ToV2 = (state) => {
  // 步骤 1：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const alert of state.alerts || []) {
    if (!Array.isArray(alert.events)) {
      alert.events = [];
    }
    if (!Array.isArray(alert.notifications)) {
      alert.notifications = [];
    }
  }

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const notification of state.notifications || []) {
    if (!notification.eventType) {
      notification.eventType = notification.alertId ? "trigger" : "test";
    }
  }
};

/**
 * 符号：migrateV2ToV3（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const migrateV2ToV3 = (state) => {
  // 步骤 1：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const alert of state.alerts || []) {
    if (!("feedback" in alert)) {
      alert.feedback = null;
    }
  }
};

/**
 * 符号：migrateV3ToV4（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const migrateV3ToV4 = (state) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Array.isArray(state.ruleDrafts)) {
    state.ruleDrafts = [];
  }
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Array.isArray(state.qualityMarkers)) {
    state.qualityMarkers = [];
  }
};

/**
 * 符号：applyMigrations（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const applyMigrations = (state) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const meta = ensureMeta(state);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  let schemaVersion = Number(meta.schemaVersion || 1);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (schemaVersion < 2) {
    migrateV1ToV2(state);
    schemaVersion = 2;
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (schemaVersion < 3) {
    migrateV2ToV3(state);
    schemaVersion = 3;
  }

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (schemaVersion < 4) {
    migrateV3ToV4(state);
    schemaVersion = 4;
  }

  meta.schemaVersion = schemaVersion;
  // 步骤 5：返回当前结果并结束函数，明确本路径的输出语义。
  return state;
};




