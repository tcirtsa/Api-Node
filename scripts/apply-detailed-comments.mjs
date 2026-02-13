/**
 * @file scripts/apply-detailed-comments.mjs
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
const excludeDirs = new Set(["node_modules", "dist", "demo-output", ".git", "doc"]);
/**
 * 符号：extensions（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const extensions = new Set([".js", ".mjs", ".ts", ".tsx"]);

/**
 * 符号：files（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const files = [];
const GENERATED_INTERNAL_COMMENT_RE = /^\s*\/\/\s*步骤\s*\d+\s*：/;

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
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!extensions.has(ext)) continue;
    files.push(rel);
  }
};

walk("");
files.sort((a, b) => a.localeCompare(b));

/**
 * 符号：stripLineComment（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const stripLineComment = (line) => {
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
  const safe = stripLineComment(line);
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
 * 符号：symbolPatterns（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const symbolPatterns = [
  { kind: "function", regex: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(/ },
  { kind: "arrow-function", regex: /^\s*(?:export\s+)?const\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/ },
  { kind: "function-expression", regex: /^\s*(?:export\s+)?const\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?function\s*\(/ },
  { kind: "class", regex: /^\s*(?:export\s+)?class\s+([A-Za-z_]\w*)\b/ },
  { kind: "const", regex: /^\s*(?:export\s+)?const\s+([A-Za-z_]\w*)\s*=/ },
  { kind: "type", regex: /^\s*(?:export\s+)?type\s+([A-Za-z_]\w*)\b/ },
  { kind: "interface", regex: /^\s*(?:export\s+)?interface\s+([A-Za-z_]\w*)\b/ },
];

/**
 * 符号：extractTopLevelSymbols（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const extractTopLevelSymbols = (lines) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const symbols = [];
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  let depth = 0;
  lines.forEach((line, idx) => {
    if (depth === 0) {
      for (const pattern of symbolPatterns) {
        const match = line.match(pattern.regex);
        if (match) {
          symbols.push({
            kind: pattern.kind,
            name: match[1],
            line: idx + 1,
            signature: line.trim(),
            indent: line.match(/^\s*/)?.[0] || "",
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
  const returnCount = (body.match(/\breturn\b/g) || []).length;
  return {
    hasIf: /\bif\s*\(/.test(body),
    hasTry: /\btry\s*{/.test(body),
    hasAwait: /\bawait\b/.test(body),
    hasStateMutation: /state\.[A-Za-z0-9_.]+\s*=/.test(body),
    hasArrayOps: /\.(map|filter|reduce|flatMap)\s*\(/.test(body),
    returnCount,
  };
};

const describeFile = (rel) => {
  if (rel.startsWith("server/tests/")) return "后端单元测试文件，验证规则引擎、通知策略与迁移逻辑的正确性。";
  if (rel.startsWith("server/")) return "后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。";
  if (rel.startsWith("src/app/pages/")) return "前端业务页面，负责状态管理、接口调用与交互渲染。";
  if (rel.startsWith("src/app/layouts/")) return "前端布局文件，负责页面骨架、导航结构与容器组织。";
  if (rel.startsWith("src/app/lib/")) return "前端基础库文件，封装 API 客户端、轮询、格式化和类型约束。";
  if (rel.startsWith("src/app/components/ui/")) return "前端通用 UI 组件封装，提供一致的交互行为与视觉样式。";
  if (rel.startsWith("src/app/components/")) return "前端业务组件文件，用于页面内可复用的展示或交互模块。";
  if (rel.startsWith("src/styles/")) return "样式层文件，用于全局主题变量与基础样式定义。";
  if (rel.startsWith("scripts/")) return "工程自动化脚本，用于生成文档、导出数据或演示流程。";
  if (rel.startsWith(".github/")) return "CI 自动化配置，定义构建和测试流水线。";
  if (rel.endsWith("vite.config.ts")) return "Vite 构建配置文件，定义开发服务器与构建行为。";
  if (rel.endsWith("postcss.config.mjs")) return "PostCSS 配置文件，定义样式处理链。";
  return "工程源码文件，参与项目运行或构建流程。";
};

const symbolRoleHint = (symbol) => {
  const name = symbol.name;
  if (/^[A-Z0-9_]+$/.test(name)) return "该常量用于集中管理配置值或枚举项，避免魔法值散落。";
  if (/^(parse|normalize|sanitize|strip)/i.test(name)) return "该函数用于输入标准化，先把不稳定入参转为稳定结构。";
  if (/^(validate|ensure|assert)/i.test(name)) return "该函数用于前置校验，尽早拦截非法输入并缩短错误路径。";
  if (/^(build|create|make)/i.test(name)) return "该函数用于构造对象或派生数据，保证字段完整和默认值统一。";
  if (/^(compute|get|find|list|collect|resolve)/i.test(name)) return "该函数偏查询/计算职责，重点在读取数据并输出结果。";
  if (/^(dispatch|process|run|ingest|apply|update|append|remove)/i.test(name)) return "该函数偏流程编排职责，通常伴随状态更新或副作用。";
  if (/Page$/.test(name)) return "该组件是页面级入口，负责拼装子组件与组织页面状态。";
  if (/^use[A-Z]/.test(name)) return "该符号是 Hook 风格逻辑，负责复用状态或副作用。";
  if (symbol.kind === "interface" || symbol.kind === "type") return "该类型声明用于约束数据形状，提高可读性和类型安全。";
  if (symbol.kind === "class") return "该类封装了一组状态与方法，适合组织具备生命周期的逻辑。";
  return "该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。";
};

const symbolImplHint = (analysis) => {
  const hints = [];
  if (analysis.hasIf) hints.push("实现中包含条件分支，用于按业务场景走不同处理路径。");
  if (analysis.hasTry) hints.push("实现中包含 try/catch，说明该路径显式处理异常。");
  if (analysis.hasAwait) hints.push("实现中包含异步等待，调用方需要关注超时、重试和并发控制。");
  if (analysis.hasStateMutation) hints.push("实现中存在状态写入，属于有副作用函数，测试时应关注前后状态变化。");
  if (analysis.hasArrayOps) hints.push("实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。");
  if (analysis.returnCount > 1) hints.push("存在多个 return 分支，采用 guard clause 提前结束无效路径。");
  if (!hints.length) hints.push("实现路径较直线，主要按顺序执行语句并返回结果。");
  return hints[0];
};

const symbolIoHint = (symbol, analysis) => {
  if (symbol.kind === "interface" || symbol.kind === "type") {
    return "输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。";
  }
  if (analysis.hasStateMutation) {
    return "输入输出：接收入参后会写入状态或外部资源，输出通常是更新后的对象、状态码或副作用结果。";
  }
  return "输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。";
};

const symbolRelationHint = (rel) => {
  if (rel.startsWith("server/")) return "关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。";
  if (rel.startsWith("src/app/pages/")) return "关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。";
  if (rel.startsWith("src/app/components/ui/")) return "关联关系：被多个页面复用，提供统一交互语义和样式能力。";
  if (rel.startsWith("scripts/")) return "关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。";
  return "关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。";
};

const hasOurFileHeader = (lines) => {
  const firstBlock = lines.slice(0, 12).join("\n");
  return firstBlock.includes("@file") && firstBlock.includes("文件作用");
};

const hasImmediateCommentAbove = (lines, lineNo) => {
  let i = lineNo - 2;
  while (i >= 0 && lines[i].trim() === "") i -= 1;
  if (i < 0) return false;
  const t = lines[i].trim();
  if (t.startsWith("//")) return true;
  if (t.endsWith("*/")) return true;
  return false;
};

const hasSymbolCommentAbove = (lines, symbol) => {
  const start = Math.max(0, symbol.line - 10);
  const block = lines.slice(start, symbol.line - 1).join("\n");
  return block.includes(`符号：${symbol.name}`);
};

const buildFileHeader = (rel) => {
  const desc = describeFile(rel);
  return [
    "/**",
    ` * @file ${rel}`,
    ` * 文件作用：${desc}`,
    " * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。",
    " */",
    "",
  ];
};

const buildSymbolComment = (symbol, rel, analysis) => {
  const role = symbolRoleHint(symbol);
  const impl = symbolImplHint(analysis);
  const io = symbolIoHint(symbol, analysis);
  const relation = symbolRelationHint(rel);
  const indent = symbol.indent || "";
  return [
    `${indent}/**`,
    `${indent} * 符号：${symbol.name}（${symbol.kind}）`,
    `${indent} * 作用说明：${role}`,
    `${indent} * 实现说明：${impl}`,
    `${indent} * ${io}`,
    `${indent} * ${relation}`,
    `${indent} */`,
  ];
};

// 步骤 2：执行当前业务子步骤，推进主流程到下一阶段。
const FUNCTION_LIKE_KINDS = new Set(["function", "arrow-function", "function-expression"]);

const findFunctionBodyStartLine = (lines, symbol) => {
  for (let lineNo = symbol.line; lineNo <= symbol.endLine; lineNo += 1) {
    const line = stripLineComment(lines[lineNo - 1] || "");
    if (line.includes("{")) {
      return lineNo;
    }
  }
  return null;
};

const isOnlyBraceLike = (trimmed) => {
  if (!trimmed) return true;
  return /^[()[\]{};,]+$/.test(trimmed);
};

const isInternalSegmentCandidate = (trimmed, stepIndex) => {
  if (!trimmed) return false;
  if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("*/")) {
    return false;
  }
  if (isOnlyBraceLike(trimmed)) return false;

  if (/^if\s*\(|^else if\s*\(|^switch\s*\(|^for\s*\(|^while\s*\(|^try\b|^catch\b|^finally\b|^return\b/.test(trimmed)) {
    return true;
  }
  if (/\bawait\b|Promise\.all\s*\(|mutateState\s*\(|getState\s*\(|res\.status\s*\(|res\.json\s*\(|apiClient\./.test(trimmed)) {
    return true;
  }
  if (/^set[A-Z]\w*\(/.test(trimmed)) return true;

  // 对变量初始化只做“段级”注释：函数开头第一步和关键调用。
  if (/^(const|let)\s+/.test(trimmed)) {
    if (stepIndex === 1) return true;
    if (/\b(req|res|state|props|payload|options)\b|new\s+|\.map\(|\.filter\(|\.reduce\(|= await\b/.test(trimmed)) {
      return true;
    }
  }

  return false;
};

const buildInternalSegmentText = (trimmed, rel) => {
  if (/^(const|let)\s+/.test(trimmed) && /\breq\./.test(trimmed)) {
    return "提取请求参数并做本地变量收敛，避免后续重复读取。";
  }
  if (/^(const|let)\s+/.test(trimmed) && /\bgetState\s*\(/.test(trimmed)) {
    return "先读取当前状态快照，后续逻辑都基于同一份数据计算。";
  }
  if (/\bPromise\.all\s*\(/.test(trimmed)) {
    return "并发请求依赖数据，降低总耗时。";
  }
  if (/^if\s*\(|^else if\s*\(|^switch\s*\(/.test(trimmed)) {
    return "分支判断：根据当前条件走不同处理路径。";
  }
  if (/^for\s*\(|^while\s*\(/.test(trimmed)) {
    return "遍历集合并逐项处理。";
  }
  if (/^try\b|^catch\b|^finally\b/.test(trimmed)) {
    return "异常保护：避免局部失败影响主流程。";
  }
  if (/mutateState\s*\(/.test(trimmed)) {
    return "统一走状态写事务，保证更新和持久化一致。";
  }
  if (/res\.status\s*\(|res\.json\s*\(/.test(trimmed)) {
    return "返回接口响应，显式告知调用方处理结果。";
  }
  if (/apiClient\./.test(trimmed)) {
    return "调用后端接口并回填结果到当前状态。";
  }
  if (/^set[A-Z]\w*\(/.test(trimmed) || /\bsetState\s*\(/.test(trimmed)) {
    return "更新前端状态，触发视图同步。";
  }
  if (/\bawait\b/.test(trimmed)) {
    return "等待异步结果后再继续后续逻辑。";
  }
  if (/^return\b/.test(trimmed)) {
    return "提前返回：当前分支到此结束。";
  }
  if (rel.startsWith("server/")) {
    return "执行后端业务步骤，推进当前处理流程。";
  }
  if (rel.startsWith("src/")) {
    return "执行前端业务步骤，推进页面状态流转。";
  }
  return "执行当前业务步骤。";
};

const buildInternalSegmentComments = (lines, symbol, rel) => {
  if (!FUNCTION_LIKE_KINDS.has(symbol.kind)) return [];
  if (symbol.endLine - symbol.line < 6) return [];

  const bodyStartLine = findFunctionBodyStartLine(lines, symbol);
  if (!bodyStartLine) return [];

  let depth = 0;
  for (let lineNo = symbol.line; lineNo <= bodyStartLine; lineNo += 1) {
    depth += countBraceDelta(lines[lineNo - 1] || "");
  }
  if (depth <= 0) return [];

  const comments = [];
  let stepIndex = 1;
  let lastInsertLine = 0;
  const minGap = 4;
  const maxCommentsPerFunction = 6;

  for (let lineNo = bodyStartLine + 1; lineNo <= symbol.endLine; lineNo += 1) {
    const line = lines[lineNo - 1] || "";
    const trimmed = line.trim();

    if (depth === 1) {
      const shouldInsert =
        isInternalSegmentCandidate(trimmed, stepIndex) &&
        lineNo - lastInsertLine >= minGap &&
        !hasImmediateCommentAbove(lines, lineNo);

      if (shouldInsert) {
        const indent = line.match(/^\s*/)?.[0] || "";
        comments.push({
          line: lineNo,
          lines: [`${indent}// ${buildInternalSegmentText(trimmed, rel)}`],
        });
        stepIndex += 1;
        lastInsertLine = lineNo;
      }
    }

    depth += countBraceDelta(line);
    if (depth <= 0) break;
    if (comments.length >= maxCommentsPerFunction) break;
  }

  return comments;
};

let updatedFiles = 0;
let insertedFileHeaders = 0;
let insertedSymbolComments = 0;
let insertedInternalSegmentComments = 0;

// 步骤 3：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
for (const rel of files) {
  const abs = path.join(root, rel);
  const original = fs.readFileSync(abs, "utf8");
  const rawLines = original.split(/\r?\n/);
  const lines = rawLines.filter((line) => !GENERATED_INTERNAL_COMMENT_RE.test(line));
  const eol = original.includes("\r\n") ? "\r\n" : "\n";

  const symbols = extractTopLevelSymbols(lines);
  const insertionMap = new Map();

  const appendInsertion = (lineNo, commentLines) => {
    if (!insertionMap.has(lineNo)) {
      insertionMap.set(lineNo, []);
    }
    const existing = insertionMap.get(lineNo);
    existing.push(...commentLines);
  };

  for (const symbol of symbols) {
    if (hasImmediateCommentAbove(lines, symbol.line) || hasSymbolCommentAbove(lines, symbol)) {
      // 即使顶层注释已存在，也继续尝试补充函数内部分段注释。
    } else {
      const analysis = analyzeBody(lines, symbol.line, symbol.endLine);
      const comments = buildSymbolComment(symbol, rel, analysis);
      appendInsertion(symbol.line, comments);
      insertedSymbolComments += comments.length;
    }

    const internalComments = buildInternalSegmentComments(lines, symbol, rel);
    for (const item of internalComments) {
      if (hasImmediateCommentAbove(lines, item.line)) continue;
      appendInsertion(item.line, item.lines);
      insertedInternalSegmentComments += item.lines.length;
    }
  }

  const needFileHeader = !hasOurFileHeader(lines);
  if (!needFileHeader && insertionMap.size === 0) {
    continue;
  }

  const nextLines = [];
  if (needFileHeader) {
    nextLines.push(...buildFileHeader(rel));
    insertedFileHeaders += 1;
  }

  for (let lineNo = 1; lineNo <= lines.length; lineNo += 1) {
    if (insertionMap.has(lineNo)) {
      nextLines.push(...insertionMap.get(lineNo));
      insertedSymbolComments += insertionMap.get(lineNo).length;
    }
    nextLines.push(lines[lineNo - 1]);
  }

  const next = `${nextLines.join(eol)}${eol}`;
  if (next !== original) {
    fs.writeFileSync(abs, next, "utf8");
    updatedFiles += 1;
  }
}

console.log(`files_scanned=${files.length}`);
console.log(`files_updated=${updatedFiles}`);
console.log(`file_headers_inserted=${insertedFileHeaders}`);
console.log(`symbol_comment_lines_inserted=${insertedSymbolComments}`);
console.log(`internal_segment_comment_lines_inserted=${insertedInternalSegmentComments}`);
