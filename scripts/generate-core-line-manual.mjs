/**
 * @file scripts/generate-core-line-manual.mjs
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
 * 符号：docDir（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const docDir = path.join(root, "..", "doc");

/**
 * 符号：targets（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const targets = [
  {
    id: "server-app",
    file: "server/app.js",
    title: "server/app.js 逐行代码讲解",
    output: "core-line-manual-server-app.md",
    outputAlias: "核心文件逐行讲解-server-app.md",
  },
  {
    id: "rule-engine",
    file: "server/rule-engine.js",
    title: "server/rule-engine.js 逐行代码讲解",
    output: "core-line-manual-rule-engine.md",
    outputAlias: "核心文件逐行讲解-rule-engine.md",
  },
  {
    id: "rules-page",
    file: "src/app/pages/RulesPage.tsx",
    title: "src/app/pages/RulesPage.tsx 逐行代码讲解",
    output: "core-line-manual-rules-page.md",
    outputAlias: "核心文件逐行讲解-rules-page.md",
  },
];

/**
 * 符号：CHUNK_SIZE（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const CHUNK_SIZE = 120;

/**
 * 符号：readLines（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const readLines = (relPath) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const abs = path.join(root, relPath);
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const text = fs.readFileSync(abs, "utf8");
  return text.split(/\r?\n/);
};

/**
 * 符号：escapeInline（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const escapeInline = (text) => String(text).replace(/`/g, "\\`").replace(/\|/g, "\\|");

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
        const m = line.match(pattern.regex);
        if (m) {
          symbols.push({
            name: m[1],
            kind: pattern.kind,
            line: idx + 1,
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
 * 符号：extractImports（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const extractImports = (lines) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const imports = [];
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const patterns = [
    /import\s+[^"'`]*?from\s*["'`]([^"'`]+)["'`]/,
    /import\s*["'`]([^"'`]+)["'`]/,
  ];
  lines.forEach((line, idx) => {
    for (const pattern of patterns) {
      const m = line.match(pattern);
      if (m) imports.push({ spec: m[1], line: idx + 1 });
    }
  });
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return imports;
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
  const literalRegex = /app\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\2/;
  const regexRegex = /app\.(get|post|put|patch|delete)\(\s*(\/.+\/)/;
  lines.forEach((line, idx) => {
    let m = line.match(literalRegex);
    if (m) {
      routes.push({
        method: m[1].toUpperCase(),
        path: m[3],
        line: idx + 1,
      });
      return;
    }
    m = line.match(regexRegex);
    if (m) {
      routes.push({
        method: m[1].toUpperCase(),
        path: m[2],
        line: idx + 1,
      });
    }
  });
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return routes;
};

/**
 * 符号：explainLine（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const explainLine = (line, lineNo, ctx) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const raw = line;
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const trimmed = raw.trim();

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!trimmed) return "空行：用于分隔逻辑块，提升可读性。";
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (trimmed.startsWith("import ")) return "导入依赖：把当前文件需要的模块绑定到本地作用域。";
  if (trimmed.startsWith("export ")) return "导出符号：把当前声明暴露给其它模块使用。";
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^const\s+[A-Z0-9_]+\s*=/.test(trimmed)) return "常量定义：集中配置阈值、枚举或全局参数，避免魔法值散落。";
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^const\s+[A-Za-z_]\w*\s*=\s*\([^)]*\)\s*=>/.test(trimmed)) return "箭头函数定义：封装可复用逻辑，通常用于辅助计算或处理流程。";
  if (/^function\s+[A-Za-z_]\w*\s*\(/.test(trimmed) || /^async function\s+[A-Za-z_]\w*\s*\(/.test(trimmed)) {
    return "函数定义：声明一个可复用的处理单元，后续通过入参驱动行为。";
  }
  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^interface\s+[A-Za-z_]\w*/.test(trimmed)) return "类型接口定义：约束对象结构，防止字段错漏。";
  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^type\s+[A-Za-z_]\w*/.test(trimmed)) return "类型别名定义：把复杂类型抽象成可复用命名。";
  if (/^if\s*\(/.test(trimmed)) return "条件分支：先检查前置条件，再决定是否继续主流程。";
  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^else if\s*\(/.test(trimmed)) return "分支延续：当前条件不满足时，进入下一个条件判断。";
  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^else\b/.test(trimmed)) return "兜底分支：前置条件都不满足时执行。";
  if (/^for\s*\(/.test(trimmed) || /^for\s+\(/.test(trimmed)) return "循环处理：对集合进行逐项处理或扫描。";
  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^while\s*\(/.test(trimmed)) return "循环处理：在条件满足时重复执行。";
  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^try\s*{/.test(trimmed)) return "异常保护开始：把可能失败的语句放入 try 块。";
  if (/^catch\s*\(/.test(trimmed) || /^}\s*catch\s*\(/.test(trimmed)) return "异常分支：捕获并处理 try 中抛出的异常。";
  // 步骤 7：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^finally\b/.test(trimmed)) return "清理分支：不论成功或失败都会执行，适合释放资源。";
  // 步骤 7：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^return\b/.test(trimmed)) return "返回语句：输出函数结果或提前结束当前流程。";
  if (/^throw\b/.test(trimmed)) return "抛出异常：把错误向上层传播，由调用方决定处理方式。";
  // 步骤 8：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/^await\b/.test(trimmed) || /\sawait\s/.test(trimmed)) return "异步等待：暂停当前协程直到 Promise 完成。";
  // 步骤 8：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/app\.(get|post|put|patch|delete)\(/.test(trimmed)) {
    return "注册路由：把 HTTP 方法与路径绑定到处理器。";
  }
  // 步骤 9：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/mutateState\s*\(/.test(trimmed)) return "状态写事务：进入统一状态修改入口，确保写入和持久化一致。";
  // 步骤 9：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/getState\s*\(/.test(trimmed)) return "状态读取：从全局状态容器获取当前快照。";
  if (/res\.status\s*\(/.test(trimmed)) return "设置响应状态码：明确此次请求的处理结果类别。";
  // 步骤 10：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/res\.json\s*\(/.test(trimmed)) return "返回 JSON 响应：把处理结果序列化返回前端。";
  // 步骤 10：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (/Promise\.all\s*\(/.test(trimmed)) return "并发执行：多个异步任务并行等待，缩短总耗时。";
  if (/setState\s*\(/.test(trimmed)) return "更新组件状态：触发 React 重新渲染。";
  if (/useEffect\s*\(/.test(trimmed)) return "副作用钩子：在组件生命周期中执行请求或订阅逻辑。";
  if (/useMemo\s*\(/.test(trimmed)) return "记忆化计算：缓存衍生值，减少重复计算。";
  if (/useCallback\s*\(/.test(trimmed)) return "记忆化函数：稳定函数引用，避免子组件无效重渲染。";
  if (/^\s*}\s*$/.test(raw)) return "代码块结束：结束上一层作用域。";
  if (/^\s*]\s*,?\s*$/.test(raw)) return "数组字面量结束：完成当前数组定义。";
  if (/^\s*}\s*,?\s*$/.test(raw)) return "对象字面量结束：完成当前对象定义。";

  if (ctx.file.endsWith("server/app.js")) {
    if (/validate|sanitize|normalize/.test(trimmed)) return "输入标准化/校验逻辑：统一格式并提前拦截非法值。";
    if (/withRouteCache/.test(trimmed)) return "路由缓存逻辑：减少高频聚合接口重复计算。";
    if (/addAuditLog/.test(trimmed)) return "审计日志写入：记录谁对什么资源做了什么操作。";
  }

  if (ctx.file.endsWith("server/rule-engine.js")) {
    if (/evaluate/.test(trimmed)) return "规则评估逻辑：根据窗口指标和阈值计算是否命中。";
    if (/createAlert|appendAlertEvent/.test(trimmed)) return "告警生命周期逻辑：创建告警并记录事件轨迹。";
    if (/cooldown|noise|dedup/.test(trimmed)) return "告警降噪逻辑：避免短时间重复触发。";
  }

  if (ctx.file.endsWith("RulesPage.tsx")) {
    if (/dsl/i.test(trimmed)) return "DSL 相关逻辑：处理文本规则和结构化表单的双向转换。";
    if (/set[A-Z]/.test(trimmed)) return "状态更新调用：驱动页面交互和渲染同步。";
    if (/apiClient\./.test(trimmed)) return "后端接口调用：拉取或提交规则相关数据。";
  }

  if (/=\s*{/.test(trimmed)) return "对象初始化：构造结构化数据用于后续流程。";
  if (/=\s*\[/.test(trimmed)) return "数组初始化：定义集合用于遍历、筛选或映射。";
  if (/=\s*new\s+/.test(trimmed)) return "对象实例化：创建类实例或容器对象。";
  if (trimmed.endsWith(";")) return "普通语句：执行当前步骤并推进流程。";

  return "代码语句：在当前上下文中推进业务处理。";
};

/**
 * 符号：buildManualForTarget（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const buildManualForTarget = (target) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const lines = readLines(target.file);
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  const imports = extractImports(lines);
  const routes = extractRoutes(lines);
  const symbols = extractTopLevelSymbols(lines);

  let md = "";
  md += `# ${target.title}\n\n`;
  md += `- 文件路径：\`${target.file}\`\n`;
  md += `- 总行数：${lines.length}\n`;
  md += `- 导入数量：${imports.length}\n`;
  md += `- 顶层符号数量：${symbols.length}\n`;
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (target.file === "server/app.js") {
    md += `- 路由数量：${routes.length}\n`;
  }
  md += "\n";
  md += "## 1. 使用说明\n\n";
  md += "1. 答辩时优先讲“顶层符号目录”，再按行号定位到“逐行讲解区”。\n";
  md += "2. 每一行都可按“它做了什么 -> 为什么这样写 -> 对后续有什么影响”解释。\n";
  md += "3. 讲解函数时，先看起止行，再看该函数内部条件分支与返回路径。\n\n";

  md += "## 2. 顶层符号目录\n\n";
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!symbols.length) {
    md += "- 无可识别顶层符号。\n\n";
  } else {
    for (const symbol of symbols) {
      md += `- L${symbol.line}-L${symbol.endLine} \`${symbol.name}\`（${symbol.kind}）\n`;
      md += `  - 声明：\`${escapeInline(symbol.signature)}\`\n`;
      md += "  - 讲解建议：先说明入参与返回，再说明是否有状态副作用。\n";
    }
    md += "\n";
  }

  md += "## 3. 导入目录\n\n";
  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!imports.length) {
    md += "- 无导入。\n\n";
  } else {
    for (const item of imports) {
      md += `- L${item.line} \`${item.spec}\`\n`;
    }
    md += "\n";
  }

  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (target.file === "server/app.js") {
    md += "## 4. 路由目录（server/app.js）\n\n";
    if (!routes.length) {
      md += "- 未检测到路由。\n\n";
    } else {
      for (const route of routes) {
        md += `- L${route.line} \`${route.method} ${route.path}\`\n`;
      }
      md += "\n";
    }
  }

  md += `## ${target.file === "server/app.js" ? "5" : "4"}. 逐行讲解（全量）\n\n`;
  md += `说明：以下覆盖 \`${target.file}\` 的每一行（含空行），可按行号直接定位源码。\n\n`;

  // 步骤 6：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (let start = 1; start <= lines.length; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, lines.length);
    md += `### L${start}-L${end}\n\n`;
    for (let lineNo = start; lineNo <= end; lineNo += 1) {
      const code = lines[lineNo - 1];
      const explanation = explainLine(code, lineNo, target);
      md += `- L${lineNo}: \`${escapeInline(code)}\`\n`;
      md += `  - 解释：${explanation}\n`;
    }
    md += "\n";
  }

  // 步骤 7：返回当前结果并结束函数，明确本路径的输出语义。
  return md;
};

/**
 * 符号：buildIndex（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const buildIndex = (results) => {
  // 步骤 1：执行当前业务子步骤，推进主流程到下一阶段。
  let md = "";
  md += "# 核心文件逐行讲解总览\n\n";
  md += "本文档用于索引三个核心文件的逐行讲解稿。\n\n";
  md += "## 1. 文档列表\n\n";
  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const item of results) {
    md += `- \`${item.output}\`：${item.title}（${item.lines} 行源码，${item.docLines} 行讲解文档）\n`;
    md += `  - 中文别名：\`${item.outputAlias}\`\n`;
  }
  md += "\n";
  md += "## 2. 如何用于答辩\n\n";
  md += "1. 先讲 `server/app.js`：控制面、路由设计、状态写入、前端回退。\n";
  md += "2. 再讲 `server/rule-engine.js`：指标窗口、规则命中、降噪、告警生命周期。\n";
  md += "3. 最后讲 `RulesPage.tsx`：DSL 与表单、批量管理、页面状态组织。\n";
  md += "4. 老师追问某行代码时，直接按行号在对应文档检索 `Lxxxx`。\n\n";
  md += "## 3. 重新生成\n\n";
  md += "在项目根目录执行：`npm run docs:line-manual`\n";
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return md;
};

if (!fs.existsSync(docDir)) {
  fs.mkdirSync(docDir, { recursive: true });
}

/**
 * 符号：results（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const results = [];
for (const target of targets) {
  const manual = buildManualForTarget(target);
  const outputPath = path.join(docDir, target.output);
  fs.writeFileSync(outputPath, manual, "utf8");
  const aliasPath = path.join(docDir, target.outputAlias);
  fs.writeFileSync(aliasPath, manual, "utf8");
  results.push({
    ...target,
    lines: readLines(target.file).length,
    docLines: manual.split(/\r?\n/).length,
  });
}

/**
 * 符号：indexText（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const indexText = buildIndex(results);
/**
 * 符号：indexPath（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const indexPath = path.join(docDir, "core-line-manual-index.md");
fs.writeFileSync(indexPath, indexText, "utf8");
/**
 * 符号：indexAliasPath（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：由 npm scripts 触发执行，用于离线生成资产或文档。
 */
const indexAliasPath = path.join(docDir, "核心文件逐行讲解-总览.md");
fs.writeFileSync(indexAliasPath, indexText, "utf8");

console.log("generated:");
for (const item of results) {
  console.log(`- ${path.join(docDir, item.output)} (${item.docLines} lines)`);
  console.log(`- ${path.join(docDir, item.outputAlias)} (${item.docLines} lines)`);
}
console.log(`- ${indexPath}`);
console.log(`- ${indexAliasPath}`);




