/**
 * @file src/app/components/ui/use-mobile.ts
 * 文件作用：前端通用 UI 组件封装，提供一致的交互行为与视觉样式。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import * as React from "react";

/**
 * 符号：MOBILE_BREAKPOINT（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
const MOBILE_BREAKPOINT = 768;

/**
 * 符号：useIsMobile（function）
 * 作用说明：该符号是 Hook 风格逻辑，负责复用状态或副作用。
 * 实现说明：存在多个 return 分支，采用 guard clause 提前结束无效路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
export function useIsMobile() {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return !!isMobile;
}



