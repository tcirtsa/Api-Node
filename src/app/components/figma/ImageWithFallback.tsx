/**
 * @file src/app/components/figma/ImageWithFallback.tsx
 * 文件作用：前端业务组件文件，用于页面内可复用的展示或交互模块。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import React, { useState } from 'react'

/**
 * 符号：ERROR_IMG_SRC（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

/**
 * 符号：ImageWithFallback（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [didError, setDidError] = useState(false)

  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const handleError = () => {
    setDidError(true)
  }

  // 步骤 2：执行当前前端业务子步骤，推进页面状态和交互流程。
  const { src, alt, style, className, ...rest } = props

  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
      </div>
    </div>
  ) : (
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  )
}




