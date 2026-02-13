/**
 * @file server/index.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import { createApp } from "./app.js";
import {
  dispatchAlertNotifications,
  dispatchAlertRecoveryNotifications,
  processEscalationTick,
  processNotificationQueueTick,
} from "./notifications.js";
import { resolveCredentialSecrets } from "./credential-secrets.js";
import { ingestMetric, refreshAllApiStatuses, runRuleEvaluationSweep } from "./rule-engine.js";
import { getState, mutateState, forcePersist } from "./store.js";
import { runSimulationTick } from "./simulator.js";
import { drainMetricQueue, enqueueMetrics, getMetricQueueSize } from "./metric-queue.js";
import { ingestMetricsBatch } from "./metric-ingest.js";
import { startMetricStreamConsumer } from "./metric-stream.js";
import {
  applyCheckResultToApi,
  buildMetricFromPullCheck,
  listDuePullApis,
  runHttpCheck,
} from "./pull-monitor.js";

/**
 * 符号：port（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const port = Number(process.env.API_PORT || 8787);
/**
 * 符号：host（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const host = process.env.API_HOST || "0.0.0.0";
/**
 * 符号：app（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const app = createApp();

refreshAllApiStatuses(getState());

/**
 * 符号：server（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const server = app.listen(port, host, () => {
  console.log(`[server] API alert engine listening on http://${host}:${port}`);
  if (host === "0.0.0.0") {
    console.log(`[server] local access: http://127.0.0.1:${port} or http://localhost:${port}`);
  }
});

server.on("error", (error) => {
  console.error("[server] failed to start", error);
  process.exit(1);
});

/**
 * 符号：simulatorEnabled（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const simulatorEnabled = process.env.SIMULATOR_ENABLED === "true" || process.env.DEMO_MODE === "true";
/**
 * 符号：simulatorIntervalSeconds（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const simulatorIntervalSeconds = Math.max(5, Number(process.env.SIMULATOR_INTERVAL_SECONDS || 15));
/**
 * 符号：pullCheckerEnabled（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const pullCheckerEnabled = process.env.PULL_CHECKER_ENABLED !== "false";
/**
 * 符号：pullCheckerTickSeconds（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const pullCheckerTickSeconds = Math.max(3, Number(process.env.PULL_CHECKER_TICK_SECONDS || 5));
/**
 * 符号：pullCheckerConcurrency（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const pullCheckerConcurrency = Math.max(1, Number(process.env.PULL_CHECKER_CONCURRENCY || 6));
/**
 * 符号：pullCheckerBatchSize（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const pullCheckerBatchSize = Math.max(1, Number(process.env.PULL_CHECKER_BATCH_SIZE || 40));
/**
 * 符号：ruleSweepEnabled（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const ruleSweepEnabled = process.env.RULE_SWEEP_ENABLED !== "false";
/**
 * 符号：ruleSweepTickSeconds（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const ruleSweepTickSeconds = Math.max(5, Number(process.env.RULE_SWEEP_TICK_SECONDS || 15));
/**
 * 符号：notificationWorkerEnabled（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const notificationWorkerEnabled = process.env.NOTIFICATION_WORKER_ENABLED !== "false";
/**
 * 符号：notificationWorkerTickSeconds（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const notificationWorkerTickSeconds = Math.max(
  1,
  Number(process.env.NOTIFICATION_WORKER_TICK_SECONDS || 3),
);
/**
 * 符号：notificationWorkerBatchSize（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const notificationWorkerBatchSize = Math.max(
  1,
  Number(process.env.NOTIFICATION_WORKER_BATCH_SIZE || 20),
);
/**
 * 符号：metricQueueWorkerEnabled（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const metricQueueWorkerEnabled = process.env.METRIC_QUEUE_WORKER_ENABLED !== "false";
/**
 * 符号：metricQueueWorkerTickSeconds（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const metricQueueWorkerTickSeconds = Math.max(
  1,
  Number(process.env.METRIC_QUEUE_WORKER_TICK_SECONDS || 2),
);
/**
 * 符号：metricQueueWorkerBatchSize（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const metricQueueWorkerBatchSize = Math.max(
  1,
  Number(process.env.METRIC_QUEUE_WORKER_BATCH_SIZE || 500),
);
/**
 * 符号：escalationWorkerEnabled（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const escalationWorkerEnabled = process.env.ESCALATION_WORKER_ENABLED !== "false";
/**
 * 符号：escalationWorkerTickSeconds（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const escalationWorkerTickSeconds = Math.max(
  5,
  Number(process.env.ESCALATION_WORKER_TICK_SECONDS || 30),
);

let simulatorIntervalHandle = null;
let pullCheckerIntervalHandle = null;
let ruleSweepIntervalHandle = null;
let notificationWorkerIntervalHandle = null;
let escalationWorkerIntervalHandle = null;
let metricQueueWorkerIntervalHandle = null;
let metricStreamStopper = null;
let pullCheckerRunning = false;
let notificationWorkerRunning = false;
let escalationWorkerRunning = false;
let metricQueueWorkerRunning = false;

/**
 * 符号：runWithConcurrency（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const runWithConcurrency = async (items, limit, worker) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!items.length) return;

  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      await worker(items[currentIndex]);
    }
  });

  // 步骤 2：并发执行多个异步任务，缩短总等待时间并提升页面响应速度。
  await Promise.all(workers);
};

/**
 * 符号：runPullChecks（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const runPullChecks = async () => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (pullCheckerRunning) {
    return;
  }

  pullCheckerRunning = true;

  // 步骤 2：对可能失败的操作进行异常保护，避免单点错误中断整体流程。
  try {
    const snapshot = getState();
    const dueApis = listDuePullApis(snapshot, Date.now()).slice(0, pullCheckerBatchSize);

    if (!dueApis.length) {
      return;
    }

    await runWithConcurrency(dueApis, pullCheckerConcurrency, async (api) => {
      const credential = snapshot.credentials.find(
        (item) => item.id === api.monitor?.checkConfig?.credentialId,
      );
      let resolvedCredentialSecrets = null;
      if (credential) {
        try {
          resolvedCredentialSecrets = resolveCredentialSecrets(credential);
        } catch (error) {
          const checkResult = {
            success: false,
            checkedAt: new Date().toISOString(),
            statusCode: null,
            latencyMs: 0,
            error: String(error?.message || "resolve_credential_failed"),
            responseSnippet: null,
          };

          mutateState((state) => {
            const targetApi = state.apis.find((item) => item.id === api.id);
            if (!targetApi) return;
            applyCheckResultToApi(targetApi, checkResult);
          });
          return;
        }
      }

      const checkResult = await runHttpCheck(api, { credential, resolvedCredentialSecrets });

      mutateState((state) => {
        const targetApi = state.apis.find((item) => item.id === api.id);
        if (!targetApi) return;

        applyCheckResultToApi(targetApi, checkResult);

        const metric = buildMetricFromPullCheck(targetApi, checkResult);
        const result = ingestMetric(state, metric, {
          source: "pull-check",
          onAlertCreated: (alert, rule, apiItem) => {
            dispatchAlertNotifications(state, alert, rule, apiItem);
          },
          onAlertResolved: (alert, rule, apiItem) => {
            dispatchAlertRecoveryNotifications(state, alert, rule, apiItem);
          },
        });

        if (!checkResult.success || result.createdAlerts.length || result.resolvedAlerts.length) {
          console.log(
            `[pull-check] api=${targetApi.path} success=${checkResult.success} status=${checkResult.statusCode ?? "n/a"} latency=${checkResult.latencyMs}ms created=${result.createdAlerts.length} resolved=${result.resolvedAlerts.length}`,
          );
        }
      });
    });
  } catch (error) {
    console.error("[pull-check] tick failed", error);
  } finally {
    pullCheckerRunning = false;
  }
};

/**
 * 符号：runNotificationWorkerTick（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const runNotificationWorkerTick = async () => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (notificationWorkerRunning) {
    return;
  }

  notificationWorkerRunning = true;
  // 步骤 2：对可能失败的操作进行异常保护，避免单点错误中断整体流程。
  try {
    const state = getState();
    const summary = await processNotificationQueueTick(state, {
      limit: notificationWorkerBatchSize,
    });
    if (summary.processed > 0) {
      mutateState(() => {});
      console.log(
        `[notify-worker] processed=${summary.processed} sent=${summary.sent} retried=${summary.retried} failed=${summary.failed}`,
      );
    }
  } catch (error) {
    console.error("[notify-worker] tick failed", error);
  } finally {
    notificationWorkerRunning = false;
  }
};

/**
 * 符号：runMetricQueueWorkerTick（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const runMetricQueueWorkerTick = async () => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (metricQueueWorkerRunning) {
    return;
  }

  metricQueueWorkerRunning = true;
  // 步骤 2：对可能失败的操作进行异常保护，避免单点错误中断整体流程。
  try {
    const batch = drainMetricQueue(metricQueueWorkerBatchSize);
    if (!batch.length) {
      return;
    }

    mutateState((state) => {
      ingestMetricsBatch(state, batch, {
        source: "queue",
        onAlertCreated: (alert, rule, apiItem) => {
          dispatchAlertNotifications(state, alert, rule, apiItem);
        },
        onAlertResolved: (alert, rule, apiItem) => {
          dispatchAlertRecoveryNotifications(state, alert, rule, apiItem);
        },
      });
    });

    const remaining = getMetricQueueSize();
    console.log(
      `[metric-queue] processed=${batch.length} remaining=${remaining}`,
    );
  } catch (error) {
    console.error("[metric-queue] tick failed", error);
  } finally {
    metricQueueWorkerRunning = false;
  }
};

/**
 * 符号：runEscalationWorkerTick（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const runEscalationWorkerTick = async () => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (escalationWorkerRunning) {
    return;
  }
  escalationWorkerRunning = true;
  // 步骤 2：对可能失败的操作进行异常保护，避免单点错误中断整体流程。
  try {
    mutateState((state) => {
      const summary = processEscalationTick(state);
      if (summary.sent > 0) {
        console.log(
          `[escalation-worker] processed=${summary.processed} sent=${summary.sent}`,
        );
      }
    });
  } catch (error) {
    console.error("[escalation-worker] tick failed", error);
  } finally {
    escalationWorkerRunning = false;
  }
};

if (simulatorEnabled) {
  simulatorIntervalHandle = setInterval(() => {
    mutateState((state) => {
      const result = runSimulationTick(state, {
        source: "simulator",
        onAlertCreated: (alert, rule, api) => {
          dispatchAlertNotifications(state, alert, rule, api);
        },
        onAlertResolved: (alert, rule, api) => {
          dispatchAlertRecoveryNotifications(state, alert, rule, api);
        },
      });

      if (result.createdAlerts > 0 || result.resolvedAlerts > 0) {
        console.log(
          `[simulator] tick ${result.timestamp} metrics=${result.metricsIngested} created=${result.createdAlerts} resolved=${result.resolvedAlerts}`,
        );
      }
    });
  }, simulatorIntervalSeconds * 1_000);

  console.log(`[simulator] running every ${simulatorIntervalSeconds}s`);
}

if (pullCheckerEnabled) {
  pullCheckerIntervalHandle = setInterval(() => {
    void runPullChecks();
  }, pullCheckerTickSeconds * 1_000);

  void runPullChecks();
  console.log(
    `[pull-check] running every ${pullCheckerTickSeconds}s (concurrency=${pullCheckerConcurrency}, batch=${pullCheckerBatchSize})`,
  );
}

if (ruleSweepEnabled) {
  ruleSweepIntervalHandle = setInterval(() => {
    mutateState((state) => {
      const result = runRuleEvaluationSweep(state, {
        source: "rule-sweep",
        onAlertCreated: (alert, rule, api) => {
          dispatchAlertNotifications(state, alert, rule, api);
        },
        onAlertResolved: (alert, rule, api) => {
          dispatchAlertRecoveryNotifications(state, alert, rule, api);
        },
      });

      if (result.createdAlerts.length || result.resolvedAlerts.length) {
        console.log(
          `[rule-sweep] ${result.timestamp} apis=${result.evaluatedApis} rules=${result.evaluatedRules} created=${result.createdAlerts.length} resolved=${result.resolvedAlerts.length}`,
        );
      }
    });
  }, ruleSweepTickSeconds * 1_000);

  console.log(`[rule-sweep] running every ${ruleSweepTickSeconds}s`);
}

if (notificationWorkerEnabled) {
  notificationWorkerIntervalHandle = setInterval(() => {
    void runNotificationWorkerTick();
  }, notificationWorkerTickSeconds * 1_000);
  void runNotificationWorkerTick();
  console.log(
    `[notify-worker] running every ${notificationWorkerTickSeconds}s (batch=${notificationWorkerBatchSize})`,
  );
}

if (metricQueueWorkerEnabled) {
  metricQueueWorkerIntervalHandle = setInterval(() => {
    void runMetricQueueWorkerTick();
  }, metricQueueWorkerTickSeconds * 1_000);
  void runMetricQueueWorkerTick();
  console.log(
    `[metric-queue] running every ${metricQueueWorkerTickSeconds}s (batch=${metricQueueWorkerBatchSize})`,
  );
}

startMetricStreamConsumer({
  onMetrics: (items) => {
    const result = enqueueMetrics(items);
    if (result.dropped > 0) {
      console.warn(`[metric-stream] dropped=${result.dropped} queue_full`);
    }
  },
}).then((handler) => {
  metricStreamStopper = handler?.stop || null;
});

if (escalationWorkerEnabled) {
  escalationWorkerIntervalHandle = setInterval(() => {
    void runEscalationWorkerTick();
  }, escalationWorkerTickSeconds * 1_000);
  void runEscalationWorkerTick();
  console.log(`[escalation-worker] running every ${escalationWorkerTickSeconds}s`);
}

/**
 * 符号：gracefulShutdown（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const gracefulShutdown = (signal) => {
  console.log(`[server] received ${signal}, shutting down...`);

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (simulatorIntervalHandle) {
    clearInterval(simulatorIntervalHandle);
    simulatorIntervalHandle = null;
  }

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (pullCheckerIntervalHandle) {
    clearInterval(pullCheckerIntervalHandle);
    pullCheckerIntervalHandle = null;
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (ruleSweepIntervalHandle) {
    clearInterval(ruleSweepIntervalHandle);
    ruleSweepIntervalHandle = null;
  }

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (notificationWorkerIntervalHandle) {
    clearInterval(notificationWorkerIntervalHandle);
    notificationWorkerIntervalHandle = null;
  }

  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (escalationWorkerIntervalHandle) {
    clearInterval(escalationWorkerIntervalHandle);
    escalationWorkerIntervalHandle = null;
  }

  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (metricQueueWorkerIntervalHandle) {
    clearInterval(metricQueueWorkerIntervalHandle);
    metricQueueWorkerIntervalHandle = null;
  }

  // 步骤 7：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (metricStreamStopper) {
    Promise.resolve(metricStreamStopper())
      .catch((error) => console.error("[metric-stream] stop failed", error))
      .finally(() => {
        metricStreamStopper = null;
      });
  }

  forcePersist();

  server.close(() => {
    console.log("[server] closed");
    process.exit(0);
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));




