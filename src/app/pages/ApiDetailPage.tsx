/**
 * @file src/app/pages/ApiDetailPage.tsx
 * 文件作用：前端业务页面，负责状态管理、接口调用与交互渲染。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, LineChartIcon, ShieldAlert, Trash2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { apiClient } from "../lib/api";
import { startVisibilityAwarePolling } from "../lib/polling";
import type { AlertItem, ApiItem, MetricSample, RuleItem } from "../lib/types";
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
 * 符号：ApiDetailPayload（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
interface ApiDetailPayload {
  item: ApiItem;
  metrics: MetricSample[];
  alerts: AlertItem[];
  ruleHits: Array<{
    id: string;
    ruleId: string;
    apiId: string;
    metric: string;
    aggregation: string;
    operator: string;
    threshold: number;
    value: number;
    matched: boolean;
    evaluatedAt: string;
  }>;
  rules: RuleItem[];
}

/**
 * 符号：ApiDetailPage（function）
 * 作用说明：该组件是页面级入口，负责拼装子组件与组织页面状态。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
export function ApiDetailPage() {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const { id } = useParams();
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const navigate = useNavigate();
  const [data, setData] = useState<ApiDetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      const result = await apiClient.getApiDetail(id);
      setData(result);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
    return startVisibilityAwarePolling(loadData, POLLING_MS);
  }, [loadData]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.metrics.map((item) => ({
      ...item,
      timeLabel: new Date(item.timestamp).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  }, [data]);

  const handleCheckNow = async () => {
    if (!data || data.item.monitor?.mode !== "pull") return;

    try {
      await apiClient.runApiCheckNow(data.item.id, localStorage.getItem("api_alert_user") || "admin");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "探测失败");
    }
  };

  const handleDeleteApi = async () => {
    if (!data) return;

    if (!window.confirm(`确认删除 API ${data.item.path} ?`)) {
      return;
    }

    const cascade = window.confirm("是否级联删除关联指标和告警？");

    try {
      await apiClient.deleteApi(data.item.id, {
        cascade,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      navigate("/api-monitor", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "删除失败");
    }
  };

  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (loading) {
    return <p className="text-sm text-slate-500">正在加载 API 详情...</p>;
  }

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!id || !data || error) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-600">加载失败：{error || "未找到 API"}</p>
        <Button className="mt-4" variant="outline" asChild>
          <Link to="/api-monitor">返回监控列表</Link>
        </Button>
      </Card>
    );
  }

  const latest = data.item.latestMetrics;

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" className="gap-2">
          <Link to="/api-monitor">
            <ArrowLeft className="h-4 w-4" />
            返回 API 列表
          </Link>
        </Button>

        <div className="flex gap-2">
          {data.item.monitor?.mode === "pull" && (
            <Button variant="outline" onClick={handleCheckNow}>
              立即探测
            </Button>
          )}
          <Button variant="outline" className="text-red-600" onClick={handleDeleteApi}>
            <Trash2 className="mr-1 h-4 w-4" />
            删除 API
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-2xl font-semibold">{data.item.name}</h2>
              <span className={`rounded px-2 py-1 text-xs font-medium ${getApiStatusClass(data.item.status)}`}>
                {getApiStatusText(data.item.status)}
              </span>
            </div>
            <p className="font-mono text-sm text-slate-500">{data.item.path}</p>
            <p className="mt-2 text-sm text-slate-600">
              服务：{data.item.service} ｜负责人：{data.item.owner} ｜活动告警：{data.item.activeAlertCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              监控模式：{data.item.monitor?.mode || "push"}
              {data.item.monitor?.mode === "pull" && data.item.monitor?.checkConfig?.url
                ? ` ｜目标：${data.item.monitor.checkConfig.url}`
                : ""}
            </p>
            <p className="text-xs text-slate-500">
              环境：{data.item.environment}
              {data.item.monitor?.mode === "pull" && data.item.monitor?.checkConfig
                ? ` ｜写探测策略：${data.item.monitor.checkConfig.safetyMode}`
                : ""}
            </p>
            <p className="text-xs text-slate-500">
              上次探测/上报：{formatDateTime(data.item.monitor?.lastCheckedAt || latest?.timestamp)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm lg:w-[460px]">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-500">QPS</p>
              <p className="mt-1 text-lg font-semibold">{formatNumber(latest?.qps, 0)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-500">错误率</p>
              <p className="mt-1 text-lg font-semibold text-red-600">{formatPercent(latest?.errorRate, 2)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-500">95 分位延迟（P95）</p>
              <p className="mt-1 text-lg font-semibold">{formatNumber(latest?.latencyP95, 0)} ms</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-slate-500">可用性</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">{formatPercent(latest?.availability, 2)}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <LineChartIcon className="h-4 w-4" />
            指标趋势（最近 {chartData.length} 点）
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="timeLabel" minTickGap={25} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                labelFormatter={(value) => `时间 ${value}`}
                formatter={(value: number, name) => {
                  if (name === "qps") return [formatNumber(value, 0), "QPS"];
                  if (name === "errorRate") return [formatPercent(value, 2), "错误率"];
                  return [value, name];
                }}
              />
              <Line yAxisId="left" type="monotone" dataKey="qps" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <ShieldAlert className="h-4 w-4" />
            延迟与可用性
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="timeLabel" minTickGap={25} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                labelFormatter={(value) => `时间 ${value}`}
                formatter={(value: number, name) => {
                  if (name === "availability") return [formatPercent(value, 2), "可用性"];
                  return [formatNumber(value, 0), name === "latencyP95" ? "95 分位延迟（P95）" : name];
                }}
              />
              <Line yAxisId="left" type="monotone" dataKey="latencyP95" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="availability" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold">最近规则命中</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>指标</TableHead>
                <TableHead>聚合</TableHead>
                <TableHead>结果</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.ruleHits.slice(0, 10).map((hit) => (
                <TableRow key={hit.id}>
                  <TableCell>
                    {hit.metric} {hit.operator} {hit.threshold}
                  </TableCell>
                  <TableCell>{hit.aggregation}</TableCell>
                  <TableCell className={hit.matched ? "text-red-600" : "text-emerald-600"}>
                    {hit.value}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDateTime(hit.evaluatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-base font-semibold">最近告警事件</h3>
          <div className="space-y-3">
            {data.alerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${getLevelBadgeClass(alert.level)}`}>
                      {alert.level}
                    </span>
                    <span className="text-sm font-medium">{alert.title}</span>
                  </div>
                  <span className={`rounded border px-2 py-0.5 text-xs ${getAlertStatusClass(alert.status)}`}>
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




