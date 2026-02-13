/**
 * @file src/app/pages/NotFoundPage.tsx
 * 文件作用：前端业务页面，负责状态管理、接口调用与交互渲染。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import { Link } from "react-router";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "../components/ui/button";

/**
 * 符号：NotFoundPage（function）
 * 作用说明：该组件是页面级入口，负责拼装子组件与组织页面状态。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
export function NotFoundPage() {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md space-y-5 text-center">
        <p className="text-7xl font-bold text-blue-600">404</p>
        <h1 className="text-2xl font-semibold text-slate-900">页面不存在</h1>
        <p className="text-sm text-slate-500">你访问的页面不存在，可能已被移动或删除。</p>
        <div className="flex justify-center gap-3">
          <Button asChild>
            <Link to="/" className="gap-2">
              <Home className="h-4 w-4" />
              返回首页
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回上页
          </Button>
        </div>
      </div>
    </div>
  );
}



