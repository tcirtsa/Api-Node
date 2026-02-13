/**
 * @file server/simulator.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import { round } from "./utils.js";
import { ingestMetric } from "./rule-engine.js";
import { isPushModeApi } from "./pull-monitor.js";

/**
 * 符号：hashSeed（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const hashSeed = (text) =>
  text.split("").reduce((total, current, index) => total + current.charCodeAt(0) * (index + 1), 0);

/**
 * 符号：createSeededRandom（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const createSeededRandom = (seedInput = 1) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const source = String(seedInput);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  let seed = source.split("").reduce((total, current, index) => {
    return (total + current.charCodeAt(0) * (index + 1)) >>> 0;
  }, 0);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (seed === 0) {
    seed = 1;
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
};

/**
 * 符号：computeIncidentMultiplier（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const computeIncidentMultiplier = (api, epochMinute) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (api.service === "payment" && epochMinute % 20 < 4) {
    return { qps: 0.86, error: 7.2, latency: 1.8, availability: -1.9 };
  }

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (api.service === "user" && epochMinute % 28 >= 12 && epochMinute % 28 < 16) {
    return { qps: 1.12, error: 2.1, latency: 1.55, availability: -0.7 };
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (api.service === "search" && epochMinute % 18 >= 6 && epochMinute % 18 < 9) {
    return { qps: 1.42, error: 0.8, latency: 1.2, availability: -0.25 };
  }

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (api.service === "inventory" && epochMinute % 33 >= 20 && epochMinute % 33 < 24) {
    return { qps: 0.92, error: 2.8, latency: 1.35, availability: -1.4 };
  }

  // 步骤 5：返回当前结果并结束函数，明确本路径的输出语义。
  return null;
};

/**
 * 符号：buildLiveMetric（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildLiveMetric = (api, timestamp, randomFn = Math.random) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const epochMinute = Math.floor(new Date(timestamp).getTime() / 60_000);
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const seed = hashSeed(api.id);

  const wave = Math.sin((epochMinute + seed) / 7) * 0.14;
  const miniWave = Math.cos((epochMinute + seed) / 3) * 0.06;
  const randomJitter = (randomFn() - 0.5) * 0.08;

  let qps = api.baseline.qps * (1 + wave + miniWave + randomJitter);
  let errorRate = api.baseline.errorRate * (1 + Math.abs(miniWave) * 2.4 + randomFn() * 0.35);
  let latencyP95 = api.baseline.latencyP95 * (1 + Math.abs(wave) * 0.7 + randomFn() * 0.08);
  let latencyP99 = api.baseline.latencyP99 * (1 + Math.abs(wave) * 0.82 + randomFn() * 0.08);
  let availability = api.baseline.availability - Math.abs(miniWave) * 0.2;

  const incident = computeIncidentMultiplier(api, epochMinute);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (incident) {
    qps *= incident.qps;
    errorRate += incident.error;
    latencyP95 *= incident.latency;
    latencyP99 *= incident.latency;
    availability += incident.availability;
  }

  qps = round(Math.max(qps, 1), 0);
  errorRate = round(Math.max(errorRate, 0), 3);
  latencyP95 = round(Math.max(latencyP95, 1), 0);
  latencyP99 = round(Math.max(latencyP99, latencyP95 + 30), 0);
  availability = round(Math.min(Math.max(availability, 90), 100), 3);

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    apiId: api.id,
    timestamp,
    qps,
    errorRate,
    latencyP95,
    latencyP99,
    availability,
    statusCode5xx: round((qps * errorRate) / 1000, 0),
  };
};

/**
 * 符号：runSimulationTick（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中存在状态写入，属于有副作用函数，测试时应关注前后状态变化。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const runSimulationTick = (state, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const timestamp = options.timestamp ? new Date(options.timestamp).toISOString() : new Date().toISOString();
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const randomFn = typeof options.randomFn === "function" ? options.randomFn : Math.random;

  const summary = {
    timestamp,
    metricsIngested: 0,
    createdAlerts: 0,
    resolvedAlerts: 0,
  };

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const api of state.apis.filter((item) => isPushModeApi(item))) {
    const metric = buildLiveMetric(api, timestamp, randomFn);
    const result = ingestMetric(state, metric, options);

    summary.metricsIngested += 1;
    summary.createdAlerts += result.createdAlerts.length;
    summary.resolvedAlerts += result.resolvedAlerts.length;
  }

  state.simulator.lastTickAt = timestamp;

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return summary;
};

/**
 * 符号：runHistoricalSimulation（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const runHistoricalSimulation = (state, minutes, stepSeconds, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const safeMinutes = Math.max(1, Math.min(Number(minutes) || 60, 1_440));
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const safeStepSeconds = Math.max(10, Math.min(Number(stepSeconds) || 30, 300));

  const totalTicks = Math.floor((safeMinutes * 60) / safeStepSeconds);
  // 步骤 2：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const startTime = Number.isFinite(options.startTimeMs)
    ? Number(options.startTimeMs)
    : Date.now() - safeMinutes * 60_000;
  // 步骤 3：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const randomFn = typeof options.randomFn === "function" ? options.randomFn : Math.random;

  let createdAlerts = 0;
  let resolvedAlerts = 0;
  let metricsIngested = 0;

  // 步骤 4：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (let tick = 0; tick <= totalTicks; tick += 1) {
    const timestamp = new Date(startTime + tick * safeStepSeconds * 1_000).toISOString();
    const result = runSimulationTick(state, { ...options, timestamp, randomFn });
    createdAlerts += result.createdAlerts;
    resolvedAlerts += result.resolvedAlerts;
    metricsIngested += result.metricsIngested;
  }

  // 步骤 5：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    minutes: safeMinutes,
    stepSeconds: safeStepSeconds,
    ticks: totalTicks + 1,
    metricsIngested,
    createdAlerts,
    resolvedAlerts,
  };
};






