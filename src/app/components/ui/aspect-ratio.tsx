/**
 * @file src/app/components/ui/aspect-ratio.tsx
 * 文件作用：前端通用 UI 组件封装，提供一致的交互行为与视觉样式。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

"use client";

import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

/**
 * 符号：AspectRatio（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };



