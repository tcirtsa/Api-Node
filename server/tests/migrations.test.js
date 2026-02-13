/**
 * @file server/tests/migrations.test.js
 * 文件作用：后端单元测试文件，验证规则引擎、通知策略与迁移逻辑的正确性。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { applyMigrations, CURRENT_SCHEMA_VERSION } from "../migrations.js";

test("migrations should upgrade schema and normalize notifications", () => {
  const input = {
    meta: { version: 1, schemaVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    alerts: [{ id: "a1", triggeredAt: new Date().toISOString() }],
    notifications: [{ id: "n1", alertId: null, createdAt: new Date().toISOString() }],
  };

  const migrated = applyMigrations(input);
  assert.equal(migrated.meta.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(Array.isArray(migrated.alerts[0].events), true);
  assert.equal(migrated.notifications[0].eventType, "test");
});



