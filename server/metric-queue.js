/**
 * @file server/metric-queue.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

/**
 * 符号：MAX_QUEUE_SIZE（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const MAX_QUEUE_SIZE = Math.max(1_000, Number(process.env.METRIC_QUEUE_MAX || 50_000));

let queue = [];

/**
 * 符号：enqueueMetrics（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const enqueueMetrics = (items) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!Array.isArray(items) || items.length === 0) return { queued: 0, dropped: 0 };
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const free = Math.max(0, MAX_QUEUE_SIZE - queue.length);
  const accepted = items.slice(0, free);
  const dropped = items.length - accepted.length;
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (accepted.length) {
    queue = queue.concat(accepted);
  }
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return { queued: accepted.length, dropped };
};

/**
 * 符号：drainMetricQueue（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const drainMetricQueue = (limit) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const size = Math.max(1, Math.min(Number(limit || 1000), MAX_QUEUE_SIZE));
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const batch = queue.slice(0, size);
  queue = queue.slice(batch.length);
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return batch;
};

/**
 * 符号：getMetricQueueSize（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const getMetricQueueSize = () => queue.length;




