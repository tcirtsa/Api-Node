/**
 * @file scripts/demo-e2e.mjs
 * 文件作用：工程自动化脚本，用于生成文档、导出数据或演示流程。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../server/app.js";

/**
 * 符号：__filename（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const __filename = fileURLToPath(import.meta.url);
/**
 * 符号：__dirname（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const __dirname = path.dirname(__filename);
/**
 * 符号：ROOT_DIR（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const ROOT_DIR = path.resolve(__dirname, "..");
/**
 * 符号：OUTPUT_DIR（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const OUTPUT_DIR = path.join(ROOT_DIR, "demo-output");
/**
 * 符号：PORT（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const PORT = Number(process.env.DEMO_E2E_PORT || 8799);
/**
 * 符号：BASE_URL（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

/**
 * 符号：api（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const api = async (pathname, options = {}) => {
  // 步骤 1：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // 步骤 2：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  const payload = await response.json();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!response.ok) {
    throw new Error(`${response.status} ${pathname}: ${payload?.error || payload?.message || "request_failed"}`);
  }
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return payload;
};

/**
 * 符号：withServer（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含 try/catch，说明该路径显式处理异常。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const withServer = async (runner) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const app = createApp();
  // 步骤 1：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  const server = await new Promise((resolve) => {
    const instance = app.listen(PORT, () => resolve(instance));
  });

  // 步骤 2：对可能失败的操作进行异常保护，避免单点错误中断整体流程。
  try {
    return await runner();
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

/**
 * 符号：markAlertFeedback（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含异步等待，调用方需要关注超时、重试和并发控制。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const markAlertFeedback = async () => {
  // 步骤 1：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  const alerts = await api("/alerts?limit=1000");
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const sorted = [...alerts.items].sort(
    (left, right) => new Date(left.triggeredAt).getTime() - new Date(right.triggeredAt).getTime(),
  );

  const picked = sorted.slice(0, 80);
  const labels = ["false_positive", "noise", "true_positive", "unknown"];
  let updated = 0;

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (let index = 0; index < picked.length; index += 1) {
    const alert = picked[index];
    const label = labels[index % labels.length];
    await api(`/alerts/${alert.id}/feedback`, {
      method: "PATCH",
      body: {
        label,
        note: `e2e-auto-${label}`,
        actor: "e2e-script",
      },
    });
    updated += 1;
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return { totalAlerts: alerts.total, updatedFeedbackAlerts: updated };
};

/**
 * 符号：run（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含异步等待，调用方需要关注超时、重试和并发控制。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const run = async () => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const seed = process.env.DEMO_E2E_SEED || "graduation-defense-2026";
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const now = Date.now();
  const phase1Start = new Date(now - 5 * 60 * 60 * 1000).toISOString();
  // 步骤 2：执行当前业务子步骤，推进主流程到下一阶段。
  const phase2Start = new Date(now + 5 * 60 * 1000).toISOString();

  // 步骤 2：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  const result = await withServer(async () => {
    await api("/demo/reset", { method: "POST" });

    const phase1 = await api("/demo/simulate", {
      method: "POST",
      body: {
        minutes: 180,
        stepSeconds: 30,
        seed,
        startTime: phase1Start,
        actor: "e2e-script",
      },
    });

    const feedbackSummary = await markAlertFeedback();
    const marker = await api("/reports/markers", {
      method: "POST",
      body: {
        name: "e2e-before-tuning",
        note: "baseline marker from e2e script",
        actor: "e2e-script",
      },
    });

    const suggestions = await api("/reports/rule-tuning-suggestions?days=14");
    await api("/reports/rule-drafts/from-suggestions", {
      method: "POST",
      body: { days: 14, actor: "e2e-script" },
    });
    const drafts = await api("/rule-drafts");

    const impactEstimates = [];
    for (const draft of drafts.items.slice(0, 3)) {
      const estimate = await api(`/rule-drafts/${draft.id}/impact-estimate?days=14`);
      impactEstimates.push(estimate);
    }

    const appliedDraftIds = [];
    for (const draft of drafts.items.slice(0, 2)) {
      await api(`/rule-drafts/${draft.id}/apply`, {
        method: "POST",
        body: { actor: "e2e-script" },
      });
      appliedDraftIds.push(draft.id);
    }

    const phase2 = await api("/demo/simulate", {
      method: "POST",
      body: {
        minutes: 120,
        stepSeconds: 30,
        seed,
        startTime: phase2Start,
        actor: "e2e-script",
      },
    });

    const quality = await api("/reports/alert-quality?days=30");
    const compare = await api("/reports/alert-quality-compare?days=14");
    const conclusion = await api("/reports/alert-quality-conclusion?days=14");
    const markerCompare = await api(
      `/reports/alert-quality-marker-compare?markerId=${encodeURIComponent(marker.item.id)}&daysBefore=14&daysAfter=14`,
    );

    return {
      generatedAt: new Date().toISOString(),
      seed,
      phase1,
      phase2,
      feedbackSummary,
      marker: marker.item,
      suggestionsCount: suggestions.suggestions.length,
      draftsTotal: drafts.total,
      appliedDraftIds,
      impactEstimates,
      reports: {
        quality,
        compare,
        conclusion: conclusion.text,
        markerCompare,
      },
    };
  });

  // 步骤 3：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  await mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, "e2e-demo-report.json");
  // 步骤 3：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  await writeFile(outputPath, JSON.stringify(result, null, 2), "utf8");

  console.log("[demo:e2e] completed");
  console.log(`[demo:e2e] output: ${outputPath}`);
  console.log(
    `[demo:e2e] alerts=${result.reports.quality.totals.alerts}, duplicateRate=${result.reports.quality.quality.duplicateRate}%, falsePositiveRate=${result.reports.quality.quality.falsePositiveRate}%`,
  );
};

run().catch((error) => {
  console.error("[demo:e2e] failed", error);
  process.exit(1);
});




