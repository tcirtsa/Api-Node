/**
 * @file src/app/pages/DashboardPage.tsx
 * 文件作用：前端业务页面，负责状态管理、接口调用与交互渲染。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Bell, ShieldAlert } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { apiClient } from "../lib/api";
import { startVisibilityAwarePolling } from "../lib/polling";
import type { DashboardSummary, TrendPoint } from "../lib/types";
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  getAlertStatusClass,
  getAlertStatusText,
  getApiStatusClass,
  getApiStatusText,
  getLevelBadgeClass,
} from "../lib/format";

/**
 * 符号：POLLING_MS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const POLLING_MS = 15_000;
/**
 * 符号：DashboardCharts（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含异步等待，调用方需要关注超时、重试和并发控制。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const DashboardCharts = lazy(async () => {
  const module = await import("../components/dashboard/DashboardCharts");
  return { default: module.DashboardCharts };
});

/**
 * 符号：DashboardPage（function）
 * 作用说明：该组件是页面级入口，负责拼装子组件与组织页面状态。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
export function DashboardPage() {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [series, setSeries] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [summaryResult, trendResult] = await Promise.all([
        apiClient.getDashboardSummary(),
        apiClient.getDashboardTrends({ hours: 24, bucketMinutes: 30 }),
      ]);

      setSummary(summaryResult);
      setSeries(trendResult.series);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return startVisibilityAwarePolling(loadData, POLLING_MS);
  }, [loadData]);

  const kpis = useMemo(() => {
    if (!summary) return [];

    return [
      {
        label: "监控 API",
        value: summary.kpis.apiTotal,
        note: `${summary.kpis.apiWarning} 告警 / ${summary.kpis.apiCritical} 严重`,
        icon: Activity,
      },
      {
        label: "活动告警",
        value: summary.kpis.alertActive,
        note: `P1 ${summary.kpis.alertP1Active}`,
        icon: AlertTriangle,
      },
      {
        label: "启用规则",
        value: summary.kpis.ruleEnabled,
        note: `共 ${summary.kpis.ruleTotal} 条`,
        icon: ShieldAlert,
      },
      {
        label: "今日通知",
        value: summary.kpis.notificationsToday,
        note: "多渠道投递",
        icon: Bell,
      },
    ];
  }, [summary]);

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (loading) {
    return <p className="text-sm text-slate-500">正在加载仪表盘...</p>;
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (error || !summary) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-600">仪表盘加载失败：{error || "未知错误"}</p>
        <Button className="mt-4" onClick={loadData}>
          重新加载
        </Button>
      </Card>
    );
  }

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <div className="space-y-6">
      <Card className="border-blue-100 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-bold">规则引擎 API 预警总览</h2>
            <p className="mt-2 text-sm text-blue-100">
              实时运行状态：每秒请求量 {formatNumber(summary.runtime.qpsAvg, 0)}，错误率 {formatPercent(summary.runtime.errorRateAvg, 2)}，95 分位延迟（P95） {formatNumber(summary.runtime.latencyP95Avg, 0)} ms
            </p>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-3 text-sm">
            <p className="text-blue-100">最后刷新</p>
            <p className="mt-1 font-semibold text-white">{formatDateTime(summary.meta.generatedAt)}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <Card key={item.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
                <p className="mt-1 text-xs text-slate-500">{item.note}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Suspense fallback={<Card className="p-5 text-sm text-slate-500">图表模块加载中...</Card>}>
        <DashboardCharts series={series} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-base font-semibold">风险 API Top 5</h3>
          <div className="space-y-3">
            {summary.topRiskApis.map((api) => (
              <div key={api.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{api.name}</p>
                    <p className="text-xs text-slate-500">{api.path}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded px-2 py-1 text-xs font-medium ${getApiStatusClass(api.status)}`}>
                      {getApiStatusText(api.status)}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">活动告警 {api.activeAlertCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-base font-semibold">最近告警</h3>
          <div className="space-y-3">
            {summary.recentAlerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${getLevelBadgeClass(alert.level)}`}>
                      {alert.level}
                    </span>
                    <span className="text-sm font-medium">{alert.apiPath || alert.apiName}</span>
                  </div>
                  <span
                    className={`rounded border px-2 py-0.5 text-xs font-medium ${getAlertStatusClass(alert.status)}`}
                  >
                    {getAlertStatusText(alert.status)}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{alert.message}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(alert.triggeredAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}




