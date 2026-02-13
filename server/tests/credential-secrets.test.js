/**
 * @file server/tests/credential-secrets.test.js
 * 文件作用：后端单元测试文件，验证规则引擎、通知策略与迁移逻辑的正确性。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveCredentialSecrets,
  sanitizeCredentialConfigForStorage,
  validateCredentialConfig,
} from "../credential-secrets.js";

test("credential secrets should resolve bearer token by secretRef", () => {
  process.env.API_ALERT_SECRET_demo_ref = "secret-token";
  const credential = {
    type: "bearer",
    config: sanitizeCredentialConfigForStorage("bearer", { tokenRef: "demo_ref" }),
  };

  const error = validateCredentialConfig("bearer", credential.config);
  assert.equal(error, null);

  const resolved = resolveCredentialSecrets(credential);
  assert.equal(resolved.token, "secret-token");
});

test("credential validation should reject invalid api_key config", () => {
  const config = sanitizeCredentialConfigForStorage("api_key", { key: "", in: "header" });
  const error = validateCredentialConfig("api_key", config);
  assert.ok(error);
});



