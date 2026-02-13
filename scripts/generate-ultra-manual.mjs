/**
 * @file scripts/generate-ultra-manual.mjs
 * 文件作用：工程自动化脚本，用于生成文档、导出数据或演示流程。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import fs from "node:fs";
import path from "node:path";

/**
 * 符号：root（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const root = process.cwd();
/**
 * 符号：excludeDirs（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const excludeDirs = new Set(["node_modules", "dist", "demo-output", ".git"]);
/**
 * 符号：files（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const files = [];

/**
 * 符号：walk（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const walk = (dirRel = "") => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const abs = path.join(root, dirRel);
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  for (const entry of entries) {
    const rel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (excludeDirs.has(entry.name)) continue;
      walk(rel);
    } else {
      files.push(rel);
    }
  }
};

walk("");
files.sort((a, b) => a.localeCompare(b));

/**
 * 符号：fileSet（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const fileSet = new Set(files);
/**
 * 符号：importExtCandidates（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const importExtCandidates = [".ts", ".tsx", ".js", ".mjs", ".json", ".css"];

/**
 * 符号：contentMap（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const contentMap = new Map();
/**
 * 符号：lineMap（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const lineMap = new Map();
for (const rel of files) {
  const raw = fs.readFileSync(path.join(root, rel), "utf8");
  contentMap.set(rel, raw);
  lineMap.set(rel, raw.split(/\r?\n/));
}

/**
 * 符号：classify（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const classify = (rel) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith("server/tests/")) return "后端测试";
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith("server/data/")) return "后端运行数据";
  if (rel.startsWith("server/")) return "后端业务";
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith("src/app/pages/")) return "前端页面";
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith("src/app/layouts/")) return "前端布局";
  if (rel.startsWith("src/app/lib/")) return "前端基础库";
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith("src/app/components/ui/")) return "前端UI组件";
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith("src/app/components/dashboard/")) return "前端图表组件";
  if (rel.startsWith("src/app/components/figma/")) return "前端Figma兼容组件";
  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith("src/app/")) return "前端应用模块";
  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith("src/styles/")) return "前端样式";
  if (rel.startsWith("scripts/")) return "工程脚本";
  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith(".github/")) return "CI配置";
  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith("guidelines/")) return "规范文档";
  if (rel.endsWith(".md")) return "文档";
  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.endsWith(".json")) return "JSON配置或数据";
  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.endsWith(".yml") || rel.endsWith(".yaml")) return "YAML配置";
  return "工程配置";
};

/**
 * 符号：purposeMap（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const purposeMap = {
  "server/app.js": "后端控制平面。集中定义 REST 路由、参数校验、状态变更、审计日志和前端静态资源回退。",
  "server/index.js": "后端启动器。负责启动 HTTP 服务并拉起模拟器、规则扫描、通知 worker、pull 检测等任务。",
  "server/rule-engine.js": "规则引擎核心。负责指标入库、规则评估、告警触发/恢复、API 健康态计算。",
  "server/notifications.js": "通知中心。负责告警去重、抑制、升级策略和多渠道投递重试。",
  "server/pull-monitor.js": "主动探测模块。负责 pull 模式 API 的 HTTP 检测、鉴权注入、结果转指标。",
  "server/openapi-import.js": "OpenAPI 导入模块。负责解析文档并生成 API 监控对象预览与落库结构。",
  "server/rule-dsl.js": "规则 DSL 解析器。负责 DSL 字符串与结构化规则互转。",
  "server/store.js": "状态存储适配层。负责 store.json 的读写与迁移。",
  "src/app/pages/RulesPage.tsx": "规则引擎管理页面。负责规则列表、新建编辑、DSL、智能生成、批量操作。",
  "src/app/pages/ApiMonitorPage.tsx": "API 监控页面。负责筛选、列表、批量管理、列显示偏好与分页。",
  "src/app/lib/api.ts": "前端 API 客户端。统一封装请求、错误处理和业务接口调用。",
  "src/app/layouts/DashboardLayout.tsx": "系统主布局。负责侧栏、导航、页面容器、折叠状态。",
};

/**
 * 符号：autoPurpose（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const autoPurpose = (rel) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (purposeMap[rel]) return purposeMap[rel];
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith("src/app/components/ui/")) return "UI 基础组件封装。业务页面直接复用，保证交互和视觉一致。";
  if (rel.startsWith("src/app/pages/")) return "业务页面模块。维护页面状态并调用后端接口。";
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith("server/tests/")) return "模块单元测试。验证关键逻辑与边界条件。";
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.startsWith("scripts/")) return "自动化脚本。用于演示数据生成或导出。";
  if (rel.endsWith(".css")) return "样式定义文件。承载全局样式或主题变量。";
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (rel.endsWith(".md")) return "项目文档文件。用于说明设计或流程。";
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return "项目中的组成文件。参与构建、运行或说明流程。";
};

/**
 * 符号：extractImports（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const extractImports = (rel, lines) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!/\.(js|mjs|ts|tsx)$/.test(rel)) return [];
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const result = [];
  const patterns = [
    /import\s+[^"'`]*?from\s*["'`]([^"'`]+)["'`]/,
    /import\s*["'`]([^"'`]+)["'`]/,
    /require\(\s*["'`]([^"'`]+)["'`]\s*\)/,
  ];
  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      const m = line.match(pattern);
      if (m) {
        result.push({
          spec: m[1],
          line: index + 1,
        });
      }
    }
  });
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return result;
};

/**
 * 符号：resolveLocal（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const resolveLocal = (fromRel, spec) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!spec.startsWith(".")) return null;
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const fromDir = path.posix.dirname(fromRel);
  const joined = path.posix.normalize(path.posix.join(fromDir, spec));
  const tries = [joined];
  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const ext of importExtCandidates) tries.push(`${joined}${ext}`);
  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const ext of importExtCandidates) tries.push(path.posix.join(joined, `index${ext}`));
  for (const candidate of tries) {
    if (fileSet.has(candidate)) return candidate;
  }
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return null;
};

/**
 * 符号：uniq（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const uniq = (arr) => [...new Set(arr)].sort((a, b) => a.localeCompare(b));

/**
 * 符号：extractExports（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const extractExports = (rel, lines) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!/\.(js|mjs|ts|tsx)$/.test(rel)) return [];
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const exports = [];
  lines.forEach((line, index) => {
    const idx = index + 1;
    let m = line.match(/^\s*export\s+default\s+function\s+([A-Za-z_]\w*)/);
    if (m) exports.push({ name: m[1], line: idx, kind: "default-function-export" });

    m = line.match(/^\s*export\s+(?:async\s+)?function\s+([A-Za-z_]\w*)/);
    if (m) exports.push({ name: m[1], line: idx, kind: "function-export" });

    m = line.match(/^\s*export\s+const\s+([A-Za-z_]\w*)\s*=/);
    if (m) exports.push({ name: m[1], line: idx, kind: "const-export" });

    m = line.match(/^\s*export\s+class\s+([A-Za-z_]\w*)/);
    if (m) exports.push({ name: m[1], line: idx, kind: "class-export" });

    m = line.match(/^\s*export\s+type\s+([A-Za-z_]\w*)/);
    if (m) exports.push({ name: m[1], line: idx, kind: "type-export" });

    m = line.match(/^\s*export\s+interface\s+([A-Za-z_]\w*)/);
    if (m) exports.push({ name: m[1], line: idx, kind: "interface-export" });

    m = line.match(/^\s*export\s*{([^}]+)}/);
    // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
    if (m) {
      m[1]
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => {
          const name = item.split(/\s+as\s+/)[0].trim();
          exports.push({ name, line: idx, kind: "named-export-block" });
        });
    }
  });
  return exports;
};

/**
 * 符号：symbolPatterns（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const symbolPatterns = [
  {
    kind: "function",
    regex: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(/,
  },
  {
    kind: "arrow-function",
    regex: /^\s*(?:export\s+)?const\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,
  },
  {
    kind: "function-expression",
    regex: /^\s*(?:export\s+)?const\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?function\s*\(/,
  },
  {
    kind: "const",
    regex: /^\s*(?:export\s+)?const\s+([A-Za-z_]\w*)\s*=/,
  },
  {
    kind: "class",
    regex: /^\s*(?:export\s+)?class\s+([A-Za-z_]\w*)\b/,
  },
  {
    kind: "type",
    regex: /^\s*(?:export\s+)?type\s+([A-Za-z_]\w*)\b/,
  },
  {
    kind: "interface",
    regex: /^\s*(?:export\s+)?interface\s+([A-Za-z_]\w*)\b/,
  },
];

/**
 * 符号：stripLineComments（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const stripLineComments = (line) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const idx = line.indexOf("//");
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (idx === -1) return line;
  return line.slice(0, idx);
};

/**
 * 符号：countBraceDelta（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const countBraceDelta = (line) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const safe = stripLineComments(line);
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  let open = 0;
  let close = 0;
  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const ch of safe) {
    if (ch === "{") open += 1;
    if (ch === "}") close += 1;
  }
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return open - close;
};

/**
 * 符号：extractSymbols（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const extractSymbols = (rel, lines) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!/\.(js|mjs|ts|tsx)$/.test(rel)) return [];
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const symbols = [];
  let depth = 0;

  lines.forEach((line, index) => {
    if (depth === 0) {
      for (const pattern of symbolPatterns) {
        const m = line.match(pattern.regex);
        if (m) {
          symbols.push({
            name: m[1],
            line: index + 1,
            kind: pattern.kind,
            signature: line.trim(),
          });
          break;
        }
      }
    }

    depth += countBraceDelta(line);
    if (depth < 0) depth = 0;
  });

  symbols.sort((a, b) => a.line - b.line);
  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (let i = 0; i < symbols.length; i += 1) {
    const current = symbols[i];
    const next = symbols[i + 1];
    current.endLine = next ? next.line - 1 : lines.length;
  }
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return symbols;
};

/**
 * 符号：extractRoutes（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const extractRoutes = (lines) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const routes = [];
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const routeRegex = /app\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\2/;
  const regexRouteRegex = /app\.(get|post|put|patch|delete)\(\s*(\/.+\/)/;
  lines.forEach((line, index) => {
    let m = line.match(routeRegex);
    if (m) {
      routes.push({
        method: m[1].toUpperCase(),
        path: m[3],
        line: index + 1,
      });
      return;
    }
    m = line.match(regexRouteRegex);
    if (m) {
      routes.push({
        method: m[1].toUpperCase(),
        path: m[2],
        line: index + 1,
      });
    }
  });
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return routes;
};

/**
 * 符号：functionStyleExplanation（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const functionStyleExplanation = (name, analysis) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const tips = [];

  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^(normalize|sanitize|strip|parse)/i.test(name)) {
    tips.push("采用“输入归一化”写法：先把不稳定入参转成稳定结构，降低后续分支复杂度。");
  }
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^(validate|assert|ensure)/i.test(name)) {
    tips.push("采用“前置校验”写法：尽早失败（early return），避免脏数据进入核心流程。");
  }
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^(build|create|make)/i.test(name)) {
    tips.push("采用“构造器”写法：集中构建对象，保证字段完整性和默认值一致性。");
  }
  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^(compute|get|find|list|collect|resolve)/i.test(name)) {
    tips.push("采用“查询/计算”写法：函数职责聚焦在读取和计算，尽量减少副作用。");
  }
  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^(dispatch|process|run|ingest|apply|update|append|remove)/i.test(name)) {
    tips.push("采用“流程驱动”写法：按步骤推进状态变化，通常伴随副作用（写状态、发通知、落日志）。");
  }

  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (analysis.hasTry) tips.push("内部使用了 try/catch，说明该逻辑显式处理了异常路径。");
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (analysis.hasAwait) tips.push("内部使用了 await，属于异步 I/O 路径，调用方需要考虑超时与重试。");
  if (analysis.usesStateMutation) {
    tips.push("检测到对 state 的写操作，说明该函数会改变系统状态，不是纯函数。");
  } else if (analysis.hasReturn) {
    tips.push("以 return 输出结果为主，适合作为可复用的纯逻辑单元。");
  }
  // 步骤 7：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (analysis.hasEarlyReturn) tips.push("存在多个 return 分支，体现了 guard clause（守卫式返回）写法。");
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (analysis.usesArrayOps) tips.push("使用 map/filter/reduce 进行数据变换，代码表达力强且便于单元测试。");

  // 步骤 8：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!tips.length) {
    tips.push("采用单一职责写法，建议答辩时说明其输入、处理和输出三段结构。");
  }

  // 步骤 9：返回当前结果并结束函数，明确本路径的输出语义。
  return tips;
};

/**
 * 符号：analyzeBody（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const analyzeBody = (lines, startLine, endLine) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const body = lines.slice(startLine - 1, endLine).join("\n");
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const returnMatches = body.match(/\breturn\b/g) || [];
  return {
    hasIf: /\bif\s*\(/.test(body),
    hasTry: /\btry\s*{/.test(body),
    hasAwait: /\bawait\b/.test(body),
    hasReturn: returnMatches.length > 0,
    hasEarlyReturn: returnMatches.length > 1,
    usesStateMutation: /state\.[A-Za-z0-9_.]+\s*=/.test(body),
    usesArrayOps: /\.(map|filter|reduce|flatMap)\s*\(/.test(body),
    hasThrow: /\bthrow\b/.test(body),
  };
};

const groupRoutes = (routes) => {
  const groups = new Map();
  for (const route of routes) {
    let key = "其他";
    if (route.path.startsWith("/api/")) {
      const parts = route.path.split("/").filter(Boolean);
      if (parts.length >= 2) {
        key = `/${parts[0]}/${parts[1]}`;
      } else if (parts.length === 1) {
        key = `/${parts[0]}`;
      }
    } else if (route.path.startsWith("/.")) {
      key = "前端回退路由";
    } else if (route.path.startsWith("/")) {
      const parts = route.path.split("/").filter(Boolean);
      key = parts.length ? `/${parts[0]}` : "/";
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(route);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};

// 步骤 2：执行当前业务子步骤，推进主流程到下一阶段。
const importGraph = new Map();
// 步骤 2：执行当前业务子步骤，推进主流程到下一阶段。
const externalImports = new Map();
const symbolMap = new Map();
// 步骤 3：执行当前业务子步骤，推进主流程到下一阶段。
const exportMap = new Map();

// 步骤 3：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
for (const rel of files) {
  const lines = lineMap.get(rel);
  const imports = extractImports(rel, lines);
  const local = [];
  const external = [];
  for (const item of imports) {
    const resolved = resolveLocal(rel, item.spec);
    if (resolved) {
      local.push(resolved);
    } else {
      external.push(item.spec);
    }
  }
  importGraph.set(rel, uniq(local));
  externalImports.set(rel, uniq(external));
  symbolMap.set(rel, extractSymbols(rel, lines));
  exportMap.set(rel, extractExports(rel, lines));
}

// 步骤 4：执行当前业务子步骤，推进主流程到下一阶段。
const reverseGraph = new Map(files.map((file) => [file, []]));
// 步骤 4：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
for (const [from, list] of importGraph.entries()) {
  for (const target of list) {
    reverseGraph.get(target)?.push(from);
  }
}
// 步骤 5：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
for (const file of files) {
  reverseGraph.set(file, uniq(reverseGraph.get(file) || []));
}

// 步骤 6：执行当前业务子步骤，推进主流程到下一阶段。
const totalLines = files.reduce((sum, file) => sum + lineMap.get(file).length, 0);
// 步骤 5：执行当前业务子步骤，推进主流程到下一阶段。
const categoryCounter = new Map();
for (const file of files) {
  const c = classify(file);
  categoryCounter.set(c, (categoryCounter.get(c) || 0) + 1);
}

const coreFiles = [
  "server/index.js",
  "server/app.js",
  "server/rule-engine.js",
  "server/notifications.js",
  "server/pull-monitor.js",
  "server/openapi-import.js",
  "server/rule-dsl.js",
  "server/store.js",
  "src/app/lib/api.ts",
  "src/app/layouts/DashboardLayout.tsx",
  "src/app/pages/RulesPage.tsx",
  "src/app/pages/ApiMonitorPage.tsx",
];

let md = "";
md += "# API-main 极致代码级讲解手册\n\n";
md += "这份手册目标是：让你能在答辩中把代码讲到“实现层”。\n";
md += "讲解粒度覆盖：模块级、函数级、路由级、状态变更级、依赖关系级。\n\n";
md += "文档生成方式：在项目根目录执行 `npm run docs:ultra-manual`。\n\n";
md += "---\n\n";
md += "## 1. 阅读方式\n\n";
md += "1. 先看第 2 章（核心文件深度拆解），掌握主干代码。\n";
md += "2. 再看第 3 章（全文件代码卡片），逐文件准备讲解话术。\n";
md += "3. 每个函数按“输入 -> 校验 -> 处理 -> 输出/副作用”去讲。\n\n";
md += "---\n\n";
md += "## 2. 核心文件深度拆解\n\n";
md += `- 项目文件总数：${files.length}\n`;
md += `- 总行数（含文档配置）：${totalLines}\n`;
md += "- 类型分布：\n";
// 步骤 7：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
for (const [k, v] of [...categoryCounter.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  md += `  - ${k}：${v}\n`;
}
md += "\n";

// 步骤 8：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
for (const file of coreFiles) {
  const lines = lineMap.get(file);
  if (!lines) continue;
  const symbols = symbolMap.get(file) || [];
  const exports = exportMap.get(file) || [];
  const importsLocal = importGraph.get(file) || [];
  const importsExt = externalImports.get(file) || [];
  const usedBy = reverseGraph.get(file) || [];

  md += `### 2.${coreFiles.indexOf(file) + 1} \`${file}\`\n\n`;
  md += `- 代码定位：${autoPurpose(file)}\n`;
  md += `- 行数：${lines.length}\n`;
  md += `- 直接依赖（项目内）：${importsLocal.length ? importsLocal.map((x) => `\`${x}\``).join("、") : "无"}\n`;
  md += `- 直接依赖（第三方/Node）：${importsExt.length ? importsExt.map((x) => `\`${x}\``).join("、") : "无"}\n`;
  md += `- 被引用：${usedBy.length ? usedBy.map((x) => `\`${x}\``).join("、") : "无"}\n`;
  md += `- 对外导出：${exports.length ? exports.map((x) => `\`${x.name}\`(L${x.line})`).join("、") : "无显式导出"}\n\n`;

  if (file === "server/app.js") {
    const routes = extractRoutes(lines);
    const grouped = groupRoutes(routes);
    md += "#### 路由分组（按域）\n\n";
    for (const [groupKey, list] of grouped) {
      md += `- ${groupKey}：${list.length} 个接口\n`;
      for (const route of list) {
        md += `  - L${route.line} \`${route.method} ${route.path}\`\n`;
      }
    }
    md += "\n";
    md += "#### 写法解剖（为什么这样写）\n\n";
    md += "1. 把常量枚举（优先级、运算符、方法、类型）集中在文件开头，避免“魔法字符串”散落。\n";
    md += "2. 先写一批纯辅助函数（如 `validateRulePayload`、`buildApiListItem`），再写路由处理器，降低每个 handler 体积。\n";
    md += "3. 通过 `withRouteCache` 对高频读接口做短 TTL 缓存，减少重复计算，提高页面加载速度。\n";
    md += "4. 每个写操作接口都经过 `mutateState`，统一落盘和更新时间，保证一致性。\n";
    md += "5. 末尾用前端静态资源回退路由兜底，解决刷新 404 问题（只对 HTML 页面导航回退）。\n\n";
  }

  if (file === "server/rule-engine.js") {
    md += "#### 引擎写法解剖\n\n";
    md += "1. 规则评估函数按规则类型拆分（threshold / composite / consecutive / missing_data / burn_rate），避免巨型 if-else。\n";
    md += "2. `evaluateRuleForApi` 只做编排，不做具体判断细节；细节下沉到子函数，便于单测。\n";
    md += "3. 通过 `shouldSkipNewAlertByNoise` 与 `shouldSkipByCooldown` 做降噪，减少重复告警。\n";
    md += "4. `ingestMetric` 把“入库 + 触发评估”串成单事务感流程，保证指标和告警状态同步。\n";
    md += "5. `refreshAllApiStatuses` 单独存在，便于启动时和批量变更后快速重算健康态。\n\n";
  }

  if (file === "server/notifications.js") {
    md += "#### 通知写法解剖\n\n";
    md += "1. 先计算策略（dedup/suppress/flap/silence/escalation），再决定是否下发，降低无效通知。\n";
    md += "2. 通知记录先入队（queued），再由 worker 异步投递，避免接口阻塞。\n";
    md += "3. `MAX_ATTEMPTS + RETRY_DELAYS_SECONDS` 是明确的重试曲线，便于解释“为什么会重试多久”。\n";
    md += "4. 渠道发送支持 mock/http 两种模式，便于答辩演示和真实落地切换。\n";
    md += "5. 指纹维度（ruleId:apiId）做去重和恢复通知控制，防止同一问题轰炸。\n\n";
  }

  if (file === "src/app/pages/RulesPage.tsx") {
    md += "#### 页面写法解剖\n\n";
    md += "1. 表单结构 `RuleForm` 先类型化，再由 `DEFAULT_FORM` 初始化，保证字段稳定。\n";
    md += "2. DSL 与表单双向同步：`buildDslFromForm` / 解析接口返回映射，兼顾易用和高级能力。\n";
    md += "3. 弹窗状态和数据状态分离（isCreateOpen/isEditOpen/...），降低交互互相污染。\n";
    md += "4. 列表与详情通过 `selectedRuleId` 绑定，保证编辑对象明确。\n";
    md += "5. 通过 `Promise.all` 并发加载规则、API、渠道，减少页面首次加载等待。\n\n";
  }

  if (file === "src/app/pages/ApiMonitorPage.tsx") {
    md += "#### 页面写法解剖\n\n";
    md += "1. 列显隐、固定关键列、分页行数都落本地存储，刷新后保留用户偏好。\n";
    md += "2. 筛选参数在前端收敛后再请求，避免后端无效压力。\n";
    md += "3. 批量选择与批量删除分离状态，避免误删。\n";
    md += "4. 采用轮询刷新 + 手动刷新组合，提高实时性同时保留控制权。\n";
    md += "5. 表格列配置抽象为常量数组，后续扩展列成本很低。\n\n";
  }

  md += "#### 顶层符号逐项讲解\n\n";
  if (!symbols.length) {
    md += "- 无可分析符号。\n\n";
  } else {
    for (const symbol of symbols.slice(0, 120)) {
      const analysis = analyzeBody(lines, symbol.line, symbol.endLine);
      md += `- L${symbol.line}-L${symbol.endLine} \`${symbol.name}\`（${symbol.kind}）\n`;
      md += `  - 代码声明：\`${symbol.signature.replace(/`/g, "\\`")}\`\n`;
      const tips = functionStyleExplanation(symbol.name, analysis);
      for (const tip of tips.slice(0, 4)) {
        md += `  - 写法说明：${tip}\n`;
      }
    }
    md += "\n";
  }
}

md += "---\n\n";
md += "## 3. 全量逐文件代码卡片（每个文件都可讲）\n\n";
md += "说明：这一章覆盖全部文件。你可以按路径搜索定位。\n\n";

let sectionIndex = 0;
// 步骤 9：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
for (const rel of files) {
  sectionIndex += 1;
  const lines = lineMap.get(rel);
  const symbols = symbolMap.get(rel) || [];
  const exports = exportMap.get(rel) || [];
  const importsLocal = importGraph.get(rel) || [];
  const importsExt = externalImports.get(rel) || [];
  const usedBy = reverseGraph.get(rel) || [];

  md += `### 3.${sectionIndex} \`${rel}\`\n\n`;
  md += `- 类型：${classify(rel)}\n`;
  md += `- 行数：${lines.length}\n`;
  md += `- 职责：${autoPurpose(rel)}\n`;
  md += `- 依赖（项目内）：${importsLocal.length ? importsLocal.map((x) => `\`${x}\``).join("、") : "无"}\n`;
  md += `- 依赖（第三方/Node）：${importsExt.length ? importsExt.map((x) => `\`${x}\``).join("、") : "无"}\n`;
  md += `- 被引用：${usedBy.length ? usedBy.map((x) => `\`${x}\``).join("、") : "无"}\n`;
  md += `- 导出符号：${exports.length ? exports.map((x) => `\`${x.name}\`(L${x.line})`).join("、") : "无"}\n`;

  if (rel === "server/app.js") {
    const routes = extractRoutes(lines);
    md += `- 路由数量：${routes.length}\n`;
  }

  if (symbols.length) {
    md += "- 代码级符号：\n";
    for (const symbol of symbols.slice(0, 80)) {
      const analysis = analyzeBody(lines, symbol.line, symbol.endLine);
      md += `  - L${symbol.line}-L${symbol.endLine} \`${symbol.name}\`（${symbol.kind}）\n`;
      const tips = functionStyleExplanation(symbol.name, analysis);
      for (const tip of tips.slice(0, 2)) {
        md += `    - ${tip}\n`;
      }
    }
  } else {
    md += "- 代码级符号：无（配置/数据/文档类文件）。\n";
  }

  md += "\n";
}

md += "---\n\n";
md += "## 4. 你向导师讲“代码怎么写”的固定模板\n\n";
md += "1. 先讲输入：这个函数/接口接收什么参数，来源是哪里。\n";
md += "2. 再讲校验：如何过滤非法输入，失败时如何返回。\n";
md += "3. 再讲处理：核心计算或状态更新步骤。\n";
md += "4. 最后讲输出：返回值、落库字段、通知或日志副作用。\n";
md += "5. 补一句权衡：为什么拆成当前函数边界（可测性/可维护性/性能）。\n\n";

const outputs = [
  path.join(root, "..", "doc", "项目全量代码讲解手册.md"),
  path.join(root, "..", "doc", "project-file-deep-dive.md"),
];

// 步骤 10：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
for (const out of outputs) {
  fs.writeFileSync(out, md, "utf8");
}

console.log("generated manuals:");
// 步骤 6：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
for (const out of outputs) {
  console.log(`- ${out}`);
}
console.log(`files=${files.length}, lines=${md.split(/\r?\n/).length}`);




