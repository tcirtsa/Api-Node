/**
 * @file src/app/components/dashboard/DashboardCharts.tsx
 * 文件作用：前端业务组件文件，用于页面内可复用的展示或交互模块。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { Timer, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "../ui/card";
import type { TrendPoint } from "../../lib/types";
import { formatDateTime, formatNumber, formatPercent } from "../../lib/format";

/**
 * 符号：DashboardChartsProps（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
interface DashboardChartsProps {
  series: TrendPoint[];
}

/**
 * 符号：DashboardCharts（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export function DashboardCharts({ series }: DashboardChartsProps) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
          <TrendingUp className="h-4 w-4" />
          24 小时流量与告警趋势
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={series}>
            <defs>
              <linearGradient id="qpsArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) =>
                new Date(value).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
              minTickGap={28}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              labelFormatter={(value) => formatDateTime(String(value))}
              formatter={(value: number, name) => {
                if (name === "qps") return [formatNumber(value, 0), "平均 QPS"];
                if (name === "alerts") return [value, "告警数"];
                return [value, name];
              }}
            />
            <Area yAxisId="left" type="monotone" dataKey="qps" stroke="#2563eb" fill="url(#qpsArea)" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="alerts" stroke="#f97316" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Timer className="h-4 w-4" />
          质量指标趋势（含 95 分位延迟）
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) =>
                new Date(value).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
              minTickGap={28}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => formatDateTime(String(value))}
              formatter={(value: number, name) => {
                if (name === "errorRate") return [formatPercent(value, 2), "错误率"];
                if (name === "availability") return [formatPercent(value, 2), "可用性"];
                if (name === "latencyP95") return [formatNumber(value, 0), "95 分位延迟（P95）ms"];
                return [value, name];
              }}
            />
            <Line type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="availability" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="latencyP95" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}



