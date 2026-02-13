/**
 * @file src/app/pages/AlertQualityPage.tsx
 * 文件作用：前端业务页面，负责状态管理、接口调用与交互渲染。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { apiClient } from "../lib/api";
import type {
  AlertQualityCompareReport,
  AlertQualityReport,
  AlertQualityTrendReport,
  ApiItem,
  MarkerCompareReport,
  QualityMarkerItem,
  RuleDraftItem,
  RuleDraftImpactEstimate,
  RuleItem,
  RuleTuningSuggestionsReport,
} from "../lib/types";
import { formatDateTime, formatNumber, formatPercent } from "../lib/format";

/**
 * 符号：csvEscape（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const csvEscape = (value: string | number | null | undefined) => {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const text = String(value ?? "");
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `\"${text.replace(/\"/g, '""')}\"`;
  }
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return text;
};

/**
 * 符号：AlertQualityPage（function）
 * 作用说明：该组件是页面级入口，负责拼装子组件与组织页面状态。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
export function AlertQualityPage() {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [days, setDays] = useState(7);
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [serviceFilter, setServiceFilter] = useState("all");
  const [apiIdFilter, setApiIdFilter] = useState("all");
  const [ruleIdFilter, setRuleIdFilter] = useState("all");

  const [data, setData] = useState<AlertQualityReport | null>(null);
  const [trend, setTrend] = useState<AlertQualityTrendReport | null>(null);
  const [compare, setCompare] = useState<AlertQualityCompareReport | null>(null);
  const [suggestions, setSuggestions] = useState<RuleTuningSuggestionsReport | null>(null);
  const [conclusion, setConclusion] = useState<string>("");
  const [apis, setApis] = useState<ApiItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);

  const [markers, setMarkers] = useState<QualityMarkerItem[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState("all");
  const [markerCompare, setMarkerCompare] = useState<MarkerCompareReport | null>(null);
  const [newMarkerName, setNewMarkerName] = useState("");
  const [newMarkerNote, setNewMarkerNote] = useState("");

  const [drafts, setDrafts] = useState<RuleDraftItem[]>([]);
  const [draftImpact, setDraftImpact] = useState<Record<string, RuleDraftImpactEstimate>>({});
  const [loadingImpactDraftId, setLoadingImpactDraftId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      days,
      service: serviceFilter !== "all" ? serviceFilter : undefined,
      apiId: apiIdFilter !== "all" ? apiIdFilter : undefined,
      ruleId: ruleIdFilter !== "all" ? ruleIdFilter : undefined,
    }),
    [days, serviceFilter, apiIdFilter, ruleIdFilter],
  );

  const loadData = useCallback(async () => {
    try {
      const [
        report,
        trendResult,
        compareResult,
        suggestionResult,
        conclusionResult,
        markerResult,
        draftResult,
        apiResult,
        ruleResult,
      ] = await Promise.all([
        apiClient.getAlertQualityReport(query),
        apiClient.getAlertQualityTrend({ ...query, bucketDays: 1 }),
        apiClient.getAlertQualityCompare(query),
        apiClient.getRuleTuningSuggestions(query),
        apiClient.getAlertQualityConclusion(query),
        apiClient.listQualityMarkers(),
        apiClient.listRuleDrafts(),
        apiClient.listApis(),
        apiClient.listRules(),
      ]);

      setData(report);
      setTrend(trendResult);
      setCompare(compareResult);
      setSuggestions(suggestionResult);
      setConclusion(conclusionResult.text);
      setMarkers(markerResult.items);
      setDrafts(draftResult.items);
      setDraftImpact((previous) => {
        const next: Record<string, RuleDraftImpactEstimate> = {};
        for (const draft of draftResult.items) {
          if (previous[draft.id]) {
            next[draft.id] = previous[draft.id];
          }
        }
        return next;
      });
      setApis(apiResult.items);
      setRules(ruleResult.items);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const run = async () => {
      if (selectedMarkerId === "all") {
        setMarkerCompare(null);
        return;
      }
      try {
        const result = await apiClient.getAlertQualityMarkerCompare({
          markerId: selectedMarkerId,
          daysBefore: days,
          daysAfter: days,
          ...query,
        });
        setMarkerCompare(result);
      } catch {
        setMarkerCompare(null);
      }
    };
    void run();
  }, [selectedMarkerId, days, query]);

  // 步骤 2：执行当前前端业务子步骤，推进页面状态和交互流程。
  const serviceOptions = useMemo(() => [...new Set(apis.map((item) => item.service))].sort(), [apis]);

  const filteredApis = useMemo(() => {
    if (serviceFilter === "all") return apis;
    return apis.filter((item) => item.service === serviceFilter);
  }, [apis, serviceFilter]);

  const topRuleChart = useMemo(
    () =>
      (data?.topNoisyRules || []).map((item) => ({
        rule: (item.ruleName || item.ruleId).slice(0, 16),
        count: item.count,
      })),
    [data],
  );

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["generatedAt", data.generatedAt],
      ["windowDays", data.windowDays],
      ["serviceFilter", data.filters.service || ""],
      ["apiIdFilter", data.filters.apiId || ""],
      ["ruleIdFilter", data.filters.ruleId || ""],
      ["alerts", data.totals.alerts],
      ["duplicateRate", data.quality.duplicateRate],
      ["falsePositiveRate", data.quality.falsePositiveRate],
      ["notificationFailureRate", data.quality.notificationFailureRate],
      ["mttrMinutes", data.quality.mttrMinutes ?? ""],
      ["conclusion", conclusion],
      ["", ""],
      ["topRuleId", "topRuleName", "count"],
      ...data.topNoisyRules.map((item) => [item.ruleId, item.ruleName || "", item.count]),
    ];

    const csv = rows.map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alert-quality-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createMarker = async () => {
    if (!newMarkerName.trim()) return;
    await apiClient.createQualityMarker({
      name: newMarkerName.trim(),
      note: newMarkerNote.trim(),
      actor: localStorage.getItem("api_alert_user") || "admin",
    });
    setNewMarkerName("");
    setNewMarkerNote("");
    await loadData();
  };

  const createDrafts = async () => {
    await apiClient.createRuleDraftsFromSuggestions({
      ...query,
      actor: localStorage.getItem("api_alert_user") || "admin",
    });
    await loadData();
  };

  const estimateDraftImpact = async (draftId: string) => {
    setLoadingImpactDraftId(draftId);
    try {
      const estimate = await apiClient.getRuleDraftImpactEstimate(draftId, {
        days,
        service: serviceFilter !== "all" ? serviceFilter : undefined,
        apiId: apiIdFilter !== "all" ? apiIdFilter : undefined,
      });
      setDraftImpact((previous) => ({ ...previous, [draftId]: estimate }));
      return estimate;
    } finally {
      setLoadingImpactDraftId(null);
    }
  };

  const applyDraft = async (draftId: string) => {
    const estimate = draftImpact[draftId] || (await estimateDraftImpact(draftId));
    const dupC = estimate.explanation.contributions.duplicateRate;
    const fpC = estimate.explanation.contributions.falsePositiveRate;
    const confirmText = [
      "应用该草稿前影响预估：",
      `- 预计重复率变化: ${estimate.delta.duplicateRate >= 0 ? "+" : ""}${formatPercent(estimate.delta.duplicateRate, 2)}`,
      `- 预计误报率变化: ${estimate.delta.falsePositiveRate >= 0 ? "+" : ""}${formatPercent(estimate.delta.falsePositiveRate, 2)}`,
      `- 重复率贡献: minSamples ${dupC.minSamples >= 0 ? "+" : ""}${formatPercent(dupC.minSamples, 2)} / window ${dupC.windowMinutes >= 0 ? "+" : ""}${formatPercent(dupC.windowMinutes, 2)} / cooldown ${dupC.cooldownMinutes >= 0 ? "+" : ""}${formatPercent(dupC.cooldownMinutes, 2)}`,
      `- 误报率贡献: minSamples ${fpC.minSamples >= 0 ? "+" : ""}${formatPercent(fpC.minSamples, 2)} / window ${fpC.windowMinutes >= 0 ? "+" : ""}${formatPercent(fpC.windowMinutes, 2)} / cooldown ${fpC.cooldownMinutes >= 0 ? "+" : ""}${formatPercent(fpC.cooldownMinutes, 2)}`,
      `- 置信度: ${estimate.confidence}（样本 ${estimate.sampleCount}）`,
      "",
      "确认应用该草稿吗？",
    ].join("\n");

    if (!window.confirm(confirmText)) {
      return;
    }

    await apiClient.applyRuleDraft(draftId, localStorage.getItem("api_alert_user") || "admin");
    await loadData();
  };

  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (loading) return <p className="text-sm text-slate-500">加载告警质量报表...</p>;
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (error || !data || !trend || !compare || !suggestions) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-600">报表加载失败：{error || "未知错误"}</p>
        <Button className="mt-3" onClick={loadData}>
          重试
        </Button>
      </Card>
    );
  }

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">告警质量报表</h3>
            <p className="text-xs text-slate-500">生成时间：{formatDateTime(data.generatedAt)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={String(days)} onChange={(event) => setDays(Number(event.target.value))}>
              <option value="3">近 3 天</option><option value="7">近 7 天</option><option value="14">近 14 天</option><option value="30">近 30 天</option>
            </select>
            <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={serviceFilter} onChange={(event) => { setServiceFilter(event.target.value); setApiIdFilter("all"); }}>
              <option value="all">全部服务</option>{serviceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={apiIdFilter} onChange={(event) => setApiIdFilter(event.target.value)}>
              <option value="all">全部 API</option>{filteredApis.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={ruleIdFilter} onChange={(event) => setRuleIdFilter(event.target.value)}>
              <option value="all">全部规则</option>{rules.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <div className="flex gap-2"><Button variant="outline" onClick={loadData}>刷新</Button><Button variant="outline" onClick={exportCsv}>导出 CSV</Button></div>
          </div>
        </div>
      </Card>

      <Card className="p-4"><p className="text-sm text-slate-700">{conclusion || "暂无结论"}</p></Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card className="p-4"><p className="text-xs text-slate-500">告警总数</p><p className="mt-1 text-2xl font-semibold">{formatNumber(data.totals.alerts, 0)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">重复率</p><p className="mt-1 text-2xl font-semibold">{formatPercent(data.quality.duplicateRate, 2)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">误报率</p><p className="mt-1 text-2xl font-semibold">{formatPercent(data.quality.falsePositiveRate, 2)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">通知失败率</p><p className="mt-1 text-2xl font-semibold">{formatPercent(data.quality.notificationFailureRate, 2)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">抖动指纹</p><p className="mt-1 text-2xl font-semibold">{formatNumber(data.quality.flappingFingerprintCount, 0)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">MTTR(分钟)</p><p className="mt-1 text-2xl font-semibold">{data.quality.mttrMinutes ?? "-"}</p></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h4 className="mb-3 text-sm font-semibold">趋势（按天）</h4>
          <ResponsiveContainer width="100%" height={240}><LineChart data={trend.series}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="bucketEnd" tickFormatter={(v) => new Date(v).toLocaleDateString("zh-CN")} /><YAxis /><Tooltip labelFormatter={(v) => formatDateTime(String(v))} /><Line type="monotone" dataKey="alerts" stroke="#2563eb" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="falsePositiveRate" stroke="#ef4444" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h4 className="mb-3 text-sm font-semibold">窗口对比（当前 vs 上一窗口）</h4>
          <div className="space-y-2 text-sm">
            <p>告警数变化: {compare.delta.alerts >= 0 ? "+" : ""}{compare.delta.alerts}</p>
            <p>重复率变化: {compare.delta.duplicateRate >= 0 ? "+" : ""}{formatPercent(compare.delta.duplicateRate, 2)}</p>
            <p>误报率变化: {compare.delta.falsePositiveRate >= 0 ? "+" : ""}{formatPercent(compare.delta.falsePositiveRate, 2)}</p>
            <p>通知失败率变化: {compare.delta.notificationFailureRate >= 0 ? "+" : ""}{formatPercent(compare.delta.notificationFailureRate, 2)}</p>
            <p>MTTR 变化: {compare.delta.mttrMinutes >= 0 ? "+" : ""}{compare.delta.mttrMinutes} 分钟</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h4 className="mb-3 text-sm font-semibold">策略变更标记</h4>
          <div className="flex flex-wrap gap-2">
            <input className="h-10 rounded-md border border-slate-200 px-3 text-sm" placeholder="标记名称" value={newMarkerName} onChange={(e)=>setNewMarkerName(e.target.value)} />
            <input className="h-10 rounded-md border border-slate-200 px-3 text-sm" placeholder="备注" value={newMarkerNote} onChange={(e)=>setNewMarkerNote(e.target.value)} />
            <Button variant="outline" onClick={createMarker}>创建标记</Button>
          </div>
          <div className="mt-3">
            <select className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={selectedMarkerId} onChange={(e)=>setSelectedMarkerId(e.target.value)}>
              <option value="all">不对比标记</option>
              {markers.map((item)=><option key={item.id} value={item.id}>{item.name} ({formatDateTime(item.createdAt)})</option>)}
            </select>
          </div>
          {markerCompare && (
            <div className="mt-3 space-y-1 text-sm">
              <p>标记前告警: {markerCompare.before.totals.alerts}</p>
              <p>标记后告警: {markerCompare.after.totals.alerts}</p>
              <p>误报率变化: {markerCompare.delta.falsePositiveRate >=0?'+':''}{formatPercent(markerCompare.delta.falsePositiveRate,2)}</p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h4 className="mb-3 text-sm font-semibold">Top Noisy Rules</h4>
          <ResponsiveContainer width="100%" height={240}><BarChart data={(data.topNoisyRules||[]).map(i=>({rule:(i.ruleName||i.ruleId).slice(0,16),count:i.count}))}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="rule" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#2563eb" radius={4} /></BarChart></ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold">规则调优建议与草稿</h4>
          <Button variant="outline" onClick={createDrafts}>从建议生成草稿</Button>
        </div>
        {suggestions.suggestions.length === 0 ? <p className="text-sm text-slate-500">当前筛选范围内暂无建议</p> : (
          <div className="space-y-3">
            {suggestions.suggestions.map((item) => (
              <div key={item.ruleId} className="rounded border border-slate-200 p-3 text-sm">
                <p className="font-medium">{item.ruleName}</p>
                <p className="text-xs text-slate-500">severity: {item.severity}</p>
                <p className="mt-1 text-xs text-slate-700">recommend: minSamples→{item.recommendation.increaseMinSamplesTo}, windowMinutes→{item.recommendation.increaseWindowMinutesTo}, cooldownMinutes→{item.recommendation.increaseCooldownMinutesTo}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 space-y-2">
          {drafts.slice(0, 10).map((draft) => (
            <div key={draft.id} className="rounded border border-slate-200 p-2 text-xs">
              <div className="flex items-center justify-between">
                <span>{draft.ruleName} / {draft.status}</span>
                <div className="flex gap-2">
                  {draft.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => estimateDraftImpact(draft.id)}
                      disabled={loadingImpactDraftId === draft.id}
                    >
                      {loadingImpactDraftId === draft.id ? "预估中..." : "预估影响"}
                    </Button>
                  )}
                  {draft.status === "draft" && <Button size="sm" variant="outline" onClick={() => applyDraft(draft.id)}>应用草稿</Button>}
                </div>
              </div>
              {draftImpact[draft.id] && (
                <div className="mt-2 space-y-1 text-slate-600">
                  <p>
                    预计重复率 {draftImpact[draft.id].delta.duplicateRate >= 0 ? "+" : ""}
                    {formatPercent(draftImpact[draft.id].delta.duplicateRate, 2)}，
                    预计误报率 {draftImpact[draft.id].delta.falsePositiveRate >= 0 ? "+" : ""}
                    {formatPercent(draftImpact[draft.id].delta.falsePositiveRate, 2)}，
                    置信度 {draftImpact[draft.id].confidence}（样本 {draftImpact[draft.id].sampleCount}）
                  </p>
                  <p>
                    重复率贡献: minSamples{" "}
                    {draftImpact[draft.id].explanation.contributions.duplicateRate.minSamples >= 0 ? "+" : ""}
                    {formatPercent(draftImpact[draft.id].explanation.contributions.duplicateRate.minSamples, 2)} / window{" "}
                    {draftImpact[draft.id].explanation.contributions.duplicateRate.windowMinutes >= 0 ? "+" : ""}
                    {formatPercent(draftImpact[draft.id].explanation.contributions.duplicateRate.windowMinutes, 2)} / cooldown{" "}
                    {draftImpact[draft.id].explanation.contributions.duplicateRate.cooldownMinutes >= 0 ? "+" : ""}
                    {formatPercent(draftImpact[draft.id].explanation.contributions.duplicateRate.cooldownMinutes, 2)}
                  </p>
                  <p>
                    误报率贡献: minSamples{" "}
                    {draftImpact[draft.id].explanation.contributions.falsePositiveRate.minSamples >= 0 ? "+" : ""}
                    {formatPercent(draftImpact[draft.id].explanation.contributions.falsePositiveRate.minSamples, 2)} / window{" "}
                    {draftImpact[draft.id].explanation.contributions.falsePositiveRate.windowMinutes >= 0 ? "+" : ""}
                    {formatPercent(draftImpact[draft.id].explanation.contributions.falsePositiveRate.windowMinutes, 2)} / cooldown{" "}
                    {draftImpact[draft.id].explanation.contributions.falsePositiveRate.cooldownMinutes >= 0 ? "+" : ""}
                    {formatPercent(draftImpact[draft.id].explanation.contributions.falsePositiveRate.cooldownMinutes, 2)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}




