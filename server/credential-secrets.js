/**
 * @file server/credential-secrets.js
 * 文件作用：后端业务模块，参与 API 接入、规则评估、告警流转与通知链路。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

/**
 * 符号：DEFAULT_SECRET_PREFIX（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const DEFAULT_SECRET_PREFIX = "API_ALERT_SECRET_";

/**
 * 符号：getSecretPrefix（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const getSecretPrefix = () =>
  String(process.env.CREDENTIAL_SECRET_PREFIX || DEFAULT_SECRET_PREFIX);

/**
 * 符号：getSecretValue（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const getSecretValue = (ref) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const key = String(ref || "").trim();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!key) return null;

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (process.env[key]) {
    return process.env[key];
  }

  const prefixedKey = `${getSecretPrefix()}${key}`;
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (process.env[prefixedKey]) {
    return process.env[prefixedKey];
  }

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return null;
};

/**
 * 符号：toObject（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
const toObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

/**
 * 符号：sanitizeCredentialConfigForStorage（arrow-function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const sanitizeCredentialConfigForStorage = (typeInput, configInput) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const type = String(typeInput || "custom");
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const config = toObject(configInput);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "bearer") {
    return {
      tokenRef: String(config.tokenRef || ""),
    };
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "api_key") {
    return {
      key: String(config.key || ""),
      in: String(config.in || "header"),
      valueRef: String(config.valueRef || ""),
    };
  }

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "basic") {
    return {
      username: String(config.username || ""),
      passwordRef: String(config.passwordRef || ""),
    };
  }

  const headerRefs = toObject(config.headerRefs);
  // 步骤 5：返回当前结果并结束函数，明确本路径的输出语义。
  return {
    headerRefs: Object.fromEntries(
      Object.entries(headerRefs).map(([headerName, ref]) => [String(headerName), String(ref || "")]),
    ),
  };
};

/**
 * 符号：validateCredentialConfig（arrow-function）
 * 作用说明：该函数用于前置校验，尽早拦截非法输入并缩短错误路径。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const validateCredentialConfig = (typeInput, configInput) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const type = String(typeInput || "custom");
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const config = sanitizeCredentialConfigForStorage(type, configInput);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "bearer") {
    if (!config.tokenRef) {
      return "bearer credential requires config.tokenRef";
    }
    return null;
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "api_key") {
    if (!config.key) return "api_key credential requires config.key";
    if (!["header", "query"].includes(config.in)) return "api_key config.in must be header or query";
    if (!config.valueRef) return "api_key credential requires config.valueRef";
    return null;
  }

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "basic") {
    if (!config.username) return "basic credential requires config.username";
    if (!config.passwordRef) return "basic credential requires config.passwordRef";
    return null;
  }

  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "custom") {
    const entries = Object.entries(config.headerRefs || {});
    if (!entries.length) return "custom credential requires config.headerRefs";
    if (entries.some(([headerName, ref]) => !headerName || !String(ref || "").trim())) {
      return "custom credential headerRefs must provide headerName -> secretRef";
    }
    return null;
  }

  // 步骤 6：返回当前结果并结束函数，明确本路径的输出语义。
  return `unsupported credential type: ${type}`;
};

/**
 * 符号：resolveCredentialSecrets（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const resolveCredentialSecrets = (credential) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!credential) return null;
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const type = String(credential.type || "custom");
  const config = sanitizeCredentialConfigForStorage(type, credential.config);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "bearer") {
    const token = getSecretValue(config.tokenRef);
    if (!token) throw new Error(`secret_not_found:${config.tokenRef}`);
    return { token };
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "api_key") {
    const value = getSecretValue(config.valueRef);
    if (!value) throw new Error(`secret_not_found:${config.valueRef}`);
    return {
      key: config.key,
      in: config.in,
      value,
    };
  }

  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "basic") {
    const password = getSecretValue(config.passwordRef);
    if (!password) throw new Error(`secret_not_found:${config.passwordRef}`);
    return {
      username: config.username,
      password,
    };
  }

  const headerRefs = toObject(config.headerRefs);
  const headers = {};
  // 步骤 5：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const [headerName, ref] of Object.entries(headerRefs)) {
    const value = getSecretValue(ref);
    if (!value) throw new Error(`secret_not_found:${ref}`);
    headers[headerName] = value;
  }
  // 步骤 6：返回当前结果并结束函数，明确本路径的输出语义。
  return { headers };
};

/**
 * 符号：resolveSecretRefStatus（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const resolveSecretRefStatus = (ref) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const key = String(ref || "").trim();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!key) return false;
  return Boolean(getSecretValue(key));
};

/**
 * 符号：getSecretEnvName（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const getSecretEnvName = (ref) => {
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const key = String(ref || "").trim();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!key) return "";
  return `${getSecretPrefix()}${key}`;
};

/**
 * 符号：collectCredentialSecretRefs（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与 store、rule-engine、notifications 等后端模块协作，构成告警闭环。
 */
export const collectCredentialSecretRefs = (credential) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!credential) return [];
  // 步骤 1：执行当前后端业务子步骤，推进规则评估或告警处理主流程。
  const type = String(credential.type || "custom");
  const config = sanitizeCredentialConfigForStorage(type, credential.config);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "bearer") return config.tokenRef ? [config.tokenRef] : [];
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (type === "api_key") return config.valueRef ? [config.valueRef] : [];
  if (type === "basic") return config.passwordRef ? [config.passwordRef] : [];

  const headerRefs =
    config.headerRefs && typeof config.headerRefs === "object" ? config.headerRefs : {};
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return Object.values(headerRefs).map((item) => String(item || "")).filter(Boolean);
};




