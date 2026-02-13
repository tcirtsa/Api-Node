/**
 * @file server/utils.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import crypto from "node:crypto";

/**
 * 符号：nowIso（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const nowIso = () => new Date().toISOString();

/**
 * 符号：uid（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const uid = (prefix) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return `${prefix}_${token}`;
};

/**
 * 符号：clamp（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * 符号：round（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const round = (value, digits = 2) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const pow = 10 ** digits;
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return Math.round(value * pow) / pow;
};

/**
 * 符号：avg（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const avg = (values) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!values.length) return 0;
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return values.reduce((sum, current) => sum + current, 0) / values.length;
};

/**
 * 符号：sum（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const sum = (values) => values.reduce((total, current) => total + current, 0);

/**
 * 符号：compareByOperator（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：存在多个 return 分支，采用 guard clause 提前结束无效路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const compareByOperator = (left, operator, right) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  switch (operator) {
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    default:
      return false;
  }
};

/**
 * 符号：minutesAgoIso（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const minutesAgoIso = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

/**
 * 符号：toNumber（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const toNumber = (value, fallback = 0) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const parsed = Number(value);
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * 符号：pick（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const pick = (items) => items[Math.floor(Math.random() * items.length)];

/**
 * 符号：safeSortByTimeDesc（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const safeSortByTimeDesc = (items, getter = (item) => item.timestamp) =>
  [...items].sort((a, b) => new Date(getter(b)).getTime() - new Date(getter(a)).getTime());




