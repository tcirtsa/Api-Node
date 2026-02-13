/**
 * @file server/tests/notifications.test.js
 * 文件作用：后端单元测试文件，验证规则引擎、通知策略与迁移逻辑的正确性。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  dispatchAlertNotifications,
  processNotificationQueueTick,
} from "../notifications.js";

/**
 * 符号：buildState（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含异步等待，调用方需要关注超时、重试和并发控制。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const buildState = () => ({
  channels: [
    {
      id: "channel_email",
      type: "email",
      name: "Email",
      enabled: true,
      config: { recipients: ["ops@example.com"], deliveryMode: "mock" },
    },
    {
      id: "channel_webhook",
      type: "webhook",
      name: "Webhook",
      enabled: true,
      config: { url: "https://example.com/hook", deliveryMode: "mock" },
    },
  ],
  notifications: [],
  alertPolicy: {
    enabled: false,
    dedupWindowSeconds: 0,
    suppressWindowSeconds: 0,
    flapWindowMinutes: 20,
    flapThreshold: 3,
    autoSilenceMinutes: 30,
    sendRecovery: true,
  },
  alertNoiseState: { byFingerprint: {} },
});

// 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
const alert = {
  id: "alert_1",
  ruleId: "rule_1",
  apiId: "api_1",
  title: "High Error",
  message: "Error high",
  level: "P1",
  status: "open",
  notifications: [],
};

// 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
const rule = {
  id: "rule_1",
  actions: ["email", "webhook"],
};

const api = {
  id: "api_1",
  method: "POST",
  path: "/api/order/create",
};

test("dispatch should enqueue notifications for matched channels", () => {
  const state = buildState();
  const records = dispatchAlertNotifications(state, { ...alert }, rule, api);
  assert.equal(records.length, 2);
  assert.equal(records.every((item) => item.status === "queued"), true);
  assert.equal(state.notifications.length, 2);
});

test("notification worker should process queued notifications in mock mode", async () => {
  const state = buildState();
  dispatchAlertNotifications(state, { ...alert }, rule, api);
  const summary = await processNotificationQueueTick(state, { limit: 10 });
  assert.equal(summary.processed, 2);
  assert.equal(summary.sent, 2);
  assert.equal(state.notifications.every((item) => item.status === "sent"), true);
});

test("invalid channel config should fail immediately", () => {
  const state = buildState();
  state.channels[0].config.recipients = [];
  const records = dispatchAlertNotifications(state, { ...alert }, { ...rule, actions: ["email"] }, api);
  assert.equal(records.length, 1);
  assert.equal(records[0].status, "failed");
  assert.equal(records[0].response, "invalid_email_recipients");
});





