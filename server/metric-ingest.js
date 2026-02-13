/**
 * @file server/metric-ingest.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { nowIso } from "./utils.js";
import { ingestMetric } from "./rule-engine.js";
import { createPushMonitor, normalizeMonitorConfig } from "./pull-monitor.js";

/**
 * 符号：ingestMetricsBatch（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const ingestMetricsBatch = (state, items, options = {}) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const source = options.source || "api";
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const onAlertCreated = options.onAlertCreated;
  const onAlertResolved = options.onAlertResolved;

  const summary = {
    ingested: 0,
    createdAlerts: 0,
    resolvedAlerts: 0,
    errors: [],
  };

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const item of items) {
    if (!item?.apiId) {
      summary.errors.push("Missing apiId in one metric item.");
      continue;
    }

    try {
      const result = ingestMetric(state, item, {
        source,
        onAlertCreated,
        onAlertResolved,
      });

      const targetApi = state.apis.find((api) => api.id === item.apiId);
      if (targetApi) {
        targetApi.monitor = normalizeMonitorConfig(
          targetApi.monitor,
          createPushMonitor({ source: "metrics" }),
        );
        if (targetApi.monitor.mode !== "pull") {
          targetApi.monitor.lastCheckedAt = item.timestamp || nowIso();
          targetApi.monitor.lastStatusCode = null;
          targetApi.monitor.lastLatencyMs = item.latencyP95 ?? null;
          targetApi.monitor.lastError = null;
          targetApi.monitor.lastSuccess = true;
          targetApi.monitor.lastResponseSnippet = null;
        }
      }

      summary.ingested += 1;
      summary.createdAlerts += result.createdAlerts.length;
      summary.resolvedAlerts += result.resolvedAlerts.length;
    } catch (error) {
      summary.errors.push(error.message);
    }
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return summary;
};




