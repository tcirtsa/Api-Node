/**
 * @file scripts/export-defense-data.mjs
 * 文件作用：工程自动化脚本，用于生成文档、导出数据或演示流程。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
 * 符号：REPORT_PATH（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const REPORT_PATH = process.env.DEMO_E2E_REPORT || path.join(ROOT_DIR, "demo-output", "e2e-demo-report.json");
/**
 * 符号：OUTPUT_DIR（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const OUTPUT_DIR = path.join(ROOT_DIR, "demo-output", "defense");

/**
 * 符号：csvEscape（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const csvEscape = (value) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const text = value === null || value === undefined ? "" : String(value);
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return `"${text.replace(/"/g, '""')}"`;
};

/**
 * 符号：toCsv（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const toCsv = (rows) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!rows.length) {
    return "";
  }
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const headers = Object.keys(rows[0]);
  // 步骤 2：执行当前业务子步骤，推进主流程到下一阶段。
  const lines = [headers.map(csvEscape).join(",")];
  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return `${lines.join("\n")}\n`;
};

/**
 * 符号：readJson（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含异步等待，调用方需要关注超时、重试和并发控制。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const readJson = async (filePath) => {
  // 步骤 1：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  const raw = await readFile(filePath, "utf8");
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return JSON.parse(raw);
};

/**
 * 符号：run（arrow-function）
 * 作用说明：该函数偏流程编排职责，通常伴随状态更新或副作用。
 * 实现说明：实现中包含异步等待，调用方需要关注超时、重试和并发控制。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const run = async () => {
  // 步骤 1：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  const report = await readJson(REPORT_PATH);

  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const markerCompare = report?.reports?.markerCompare || {};
  const before = markerCompare.before || {};
  const after = markerCompare.after || {};
  const delta = markerCompare.delta || {};

  const summary = {
    generatedAt: report.generatedAt || null,
    seed: report.seed || null,
    phase1: report.phase1 || {},
    phase2: report.phase2 || {},
    marker: markerCompare.marker || null,
    beforeTotals: before.totals || {},
    beforeQuality: before.quality || {},
    afterTotals: after.totals || {},
    afterQuality: after.quality || {},
    delta,
  };

  const phaseRows = [
    {
      stage: "phase1",
      minutes: report?.phase1?.minutes ?? null,
      stepSeconds: report?.phase1?.stepSeconds ?? null,
      ticks: report?.phase1?.ticks ?? null,
      metricsIngested: report?.phase1?.metricsIngested ?? null,
      createdAlerts: report?.phase1?.createdAlerts ?? null,
      resolvedAlerts: report?.phase1?.resolvedAlerts ?? null,
    },
    {
      stage: "phase2",
      minutes: report?.phase2?.minutes ?? null,
      stepSeconds: report?.phase2?.stepSeconds ?? null,
      ticks: report?.phase2?.ticks ?? null,
      metricsIngested: report?.phase2?.metricsIngested ?? null,
      createdAlerts: report?.phase2?.createdAlerts ?? null,
      resolvedAlerts: report?.phase2?.resolvedAlerts ?? null,
    },
  ];

  const qualityRows = [
    {
      metric: "alerts",
      before: before?.totals?.alerts ?? null,
      after: after?.totals?.alerts ?? null,
      delta: delta?.alerts ?? null,
    },
    {
      metric: "activeAlerts",
      before: before?.totals?.activeAlerts ?? null,
      after: after?.totals?.activeAlerts ?? null,
      delta:
        before?.totals?.activeAlerts !== undefined && after?.totals?.activeAlerts !== undefined
          ? after.totals.activeAlerts - before.totals.activeAlerts
          : null,
    },
    {
      metric: "falsePositiveRate",
      before: before?.quality?.falsePositiveRate ?? null,
      after: after?.quality?.falsePositiveRate ?? null,
      delta: delta?.falsePositiveRate ?? null,
    },
    {
      metric: "duplicateRate",
      before: before?.quality?.duplicateRate ?? null,
      after: after?.quality?.duplicateRate ?? null,
      delta: delta?.duplicateRate ?? null,
    },
    {
      metric: "notificationFailureRate",
      before: before?.quality?.notificationFailureRate ?? null,
      after: after?.quality?.notificationFailureRate ?? null,
      delta: delta?.notificationFailureRate ?? null,
    },
    {
      metric: "mttrMinutes",
      before: before?.quality?.mttrMinutes ?? null,
      after: after?.quality?.mttrMinutes ?? null,
      delta: delta?.mttrMinutes ?? null,
    },
  ];

  const topRuleRows = [];
  const topBefore = before?.topNoisyRules || [];
  const topAfter = after?.topNoisyRules || [];
  const size = Math.max(topBefore.length, topAfter.length);
  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (let index = 0; index < size; index += 1) {
    const b = topBefore[index] || {};
    const a = topAfter[index] || {};
    topRuleRows.push({
      rank: index + 1,
      beforeRule: b.ruleName || "",
      beforeCount: b.count ?? "",
      afterRule: a.ruleName || "",
      afterCount: a.count ?? "",
    });
  }

  // 步骤 3：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  await mkdir(OUTPUT_DIR, { recursive: true });
  // 步骤 2：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  await writeFile(path.join(OUTPUT_DIR, "defense-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  await writeFile(path.join(OUTPUT_DIR, "phase-table.csv"), toCsv(phaseRows), "utf8");
  // 步骤 4：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  await writeFile(path.join(OUTPUT_DIR, "quality-compare.csv"), toCsv(qualityRows), "utf8");
  // 步骤 3：等待异步步骤完成，确保后续逻辑基于最新结果继续执行。
  await writeFile(path.join(OUTPUT_DIR, "top-noisy-rules.csv"), toCsv(topRuleRows), "utf8");

  console.log("[demo:export-defense] completed");
  console.log(`[demo:export-defense] report: ${REPORT_PATH}`);
  console.log(`[demo:export-defense] output dir: ${OUTPUT_DIR}`);
};

run().catch((error) => {
  console.error("[demo:export-defense] failed", error);
  process.exit(1);
});




