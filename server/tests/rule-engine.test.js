/**
 * @file server/tests/rule-engine.test.js
 * 文件作用：后端单元测试文件，验证规则引擎、通知策略与迁移逻辑的正确性。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { ingestMetric } from "../rule-engine.js";

/**
 * 符号：baseState（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中存在状态写入，属于有副作用函数，测试时应关注前后状态变化。
 * 输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const baseState = () => ({
  apis: [
    {
      id: "api_test",
      name: "Test",
      path: "/t",
      method: "GET",
      service: "svc",
      owner: "owner",
      environment: "test",
      baseline: { qps: 10, errorRate: 1, latencyP95: 100, latencyP99: 150, availability: 99.9 },
      monitor: { mode: "push", enabled: true, source: "test", checkConfig: null },
      status: "healthy",
      updatedAt: new Date().toISOString(),
    },
  ],
  rules: [
    {
      id: "rule_err",
      ruleType: "threshold",
      name: "Error high",
      enabled: true,
      priority: "P1",
      scope: { type: "global" },
      metric: "errorRate",
      operator: ">",
      threshold: 10,
      aggregation: "latest",
      windowMinutes: 5,
      minSamples: 1,
      cooldownMinutes: 0,
      actions: ["email"],
      lastTriggeredByApi: {},
    },
  ],
  metrics: [],
  alerts: [],
  ruleHits: [],
  notifications: [],
  alertPolicy: { enabled: true, dedupWindowSeconds: 0, suppressWindowSeconds: 0 },
  alertNoiseState: { byFingerprint: {} },
});

test("rule engine should create and auto resolve alert", () => {
  const state = baseState();
  const created = ingestMetric(state, {
    apiId: "api_test",
    timestamp: new Date().toISOString(),
    qps: 1,
    errorRate: 30,
    latencyP95: 100,
    latencyP99: 120,
    availability: 99,
    statusCode5xx: 1,
  });
  assert.equal(created.createdAlerts.length, 1);
  assert.equal(state.alerts[0].status, "open");

  const resolved = ingestMetric(state, {
    apiId: "api_test",
    timestamp: new Date(Date.now() + 60_000).toISOString(),
    qps: 1,
    errorRate: 0,
    latencyP95: 90,
    latencyP99: 100,
    availability: 100,
    statusCode5xx: 0,
  });
  assert.equal(resolved.resolvedAlerts.length, 1);
  assert.equal(state.alerts[0].status, "resolved");
});

test("rule engine should evaluate composite threshold conditions", () => {
  const state = baseState();
  state.rules = [
    {
      id: "rule_composite",
      ruleType: "threshold",
      name: "Composite rule",
      enabled: true,
      priority: "P2",
      scope: { type: "global" },
      metric: "errorRate",
      operator: ">",
      threshold: 5,
      aggregation: "latest",
      windowMinutes: 5,
      minSamples: 1,
      cooldownMinutes: 0,
      conditionLogic: "all",
      conditions: [
        { metric: "errorRate", operator: ">", threshold: 5 },
        { metric: "latencyP95", operator: ">", threshold: 200 },
      ],
      actions: ["email"],
      lastTriggeredByApi: {},
    },
  ];

  const created = ingestMetric(state, {
    apiId: "api_test",
    timestamp: new Date().toISOString(),
    qps: 1,
    errorRate: 10,
    latencyP95: 250,
    latencyP99: 300,
    availability: 99,
    statusCode5xx: 1,
  });
  assert.equal(created.createdAlerts.length, 1);

  const resolved = ingestMetric(state, {
    apiId: "api_test",
    timestamp: new Date(Date.now() + 60_000).toISOString(),
    qps: 1,
    errorRate: 2,
    latencyP95: 150,
    latencyP99: 200,
    availability: 100,
    statusCode5xx: 0,
  });
  assert.equal(resolved.resolvedAlerts.length, 1);
});


