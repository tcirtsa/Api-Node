/**
 * @file server/tests/simulator.test.js
 * 文件作用：后端单元测试文件，验证规则引擎、通知策略与迁移逻辑的正确性。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createSeededRandom, runHistoricalSimulation } from "../simulator.js";

/**
 * 符号：buildState（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildState = () => ({
  apis: [
    {
      id: "api_demo",
      method: "GET",
      name: "Demo API",
      path: "/demo",
      owner: "demo",
      service: "demo",
      environment: "test",
      tags: [],
      baseline: { qps: 120, errorRate: 1.2, latencyP95: 150, latencyP99: 220, availability: 99.9 },
      monitor: { mode: "push", enabled: true, source: "test", checkConfig: null },
      status: "healthy",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  rules: [],
  metrics: [],
  alerts: [],
  ruleHits: [],
  notifications: [],
  alertPolicy: { enabled: true, dedupWindowSeconds: 0, suppressWindowSeconds: 0 },
  alertNoiseState: { byFingerprint: {} },
  simulator: { enabled: true, intervalSeconds: 15, lastTickAt: null },
});

test("historical simulation should be reproducible with same seed", () => {
  const startTimeMs = Date.UTC(2026, 1, 1, 0, 0, 0);
  const stateA = buildState();
  const stateB = buildState();

  runHistoricalSimulation(stateA, 30, 30, {
    startTimeMs,
    randomFn: createSeededRandom("seed-a"),
  });
  runHistoricalSimulation(stateB, 30, 30, {
    startTimeMs,
    randomFn: createSeededRandom("seed-a"),
  });

  const seriesA = stateA.metrics.map((item) => [item.timestamp, item.qps, item.errorRate, item.latencyP95]);
  const seriesB = stateB.metrics.map((item) => [item.timestamp, item.qps, item.errorRate, item.latencyP95]);
  assert.deepEqual(seriesA, seriesB);
});



