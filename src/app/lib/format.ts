/**
 * @file src/app/lib/format.ts
 * 文件作用：前端基础库文件，封装 API 客户端、轮询、格式化和类型约束。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿/**
﻿ * 符号：formatDateTime（arrow-function）
﻿ * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
﻿ * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
﻿ * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
﻿ * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
﻿ */
﻿export const formatDateTime = (value?: string | null) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!value) return "-";

  // 步骤 1：对可能失败的操作进行异常保护，避免单点错误中断整体流程。
  try {
    return new Date(value).toLocaleString("zh-CN", {
      hour12: false,
    });
  } catch {
    return value;
  }
};

/**
 * 符号：formatPercent（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export const formatPercent = (value?: number | null, digits = 2) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return `${value.toFixed(digits)}%`;
};

/**
 * 符号：formatNumber（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export const formatNumber = (value?: number | null, digits = 0) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return value.toLocaleString("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
};

/**
 * 符号：getLevelBadgeClass（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export const getLevelBadgeClass = (level?: string | null) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (level === "P1") return "bg-red-100 text-red-700";
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (level === "P2") return "bg-orange-100 text-orange-700";
  if (level === "P3") return "bg-yellow-100 text-yellow-700";
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return "bg-gray-100 text-gray-700";
};

/**
 * 符号：getAlertStatusText（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export const getAlertStatusText = (status: string) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (status === "open") return "待处理";
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (status === "acknowledged") return "处理中";
  if (status === "resolved") return "已恢复";
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (status === "closed") return "已关闭";
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return status;
};

/**
 * 符号：getAlertStatusClass（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export const getAlertStatusClass = (status: string) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (status === "open") return "bg-red-50 text-red-700 border-red-200";
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (status === "acknowledged") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "resolved") return "bg-green-50 text-green-700 border-green-200";
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (status === "closed") return "bg-gray-50 text-gray-700 border-gray-200";
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return "bg-gray-50 text-gray-700 border-gray-200";
};

/**
 * 符号：getApiStatusText（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export const getApiStatusText = (status: string) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (status === "healthy") return "正常";
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (status === "warning") return "告警";
  if (status === "critical") return "严重";
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return "未知";
};

/**
 * 符号：getApiStatusClass（arrow-function）
 * 作用说明：该函数偏查询/计算职责，重点在读取数据并输出结果。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export const getApiStatusClass = (status: string) => {
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (status === "healthy") return "bg-green-100 text-green-700";
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (status === "warning") return "bg-orange-100 text-orange-700";
  if (status === "critical") return "bg-red-100 text-red-700";
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return "bg-gray-100 text-gray-700";
};




