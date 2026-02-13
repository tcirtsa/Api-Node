/**
 * @file src/app/pages/RulesPage.tsx
 * 文件作用：前端业务页面，负责状态管理、接口调用与交互渲染。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Edit3, Plus, Play, Sparkles, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { apiClient } from "../lib/api";
import type { ApiItem, ChannelItem, RuleItem } from "../lib/types";
import { formatDateTime, getLevelBadgeClass } from "../lib/format";

/**
 * 符号：RuleForm（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
interface RuleForm {
  ruleType: "threshold" | "consecutive_failures" | "missing_data" | "burn_rate";
  name: string;
  description: string;
  priority: RuleItem["priority"];
  conditionLogic: "all" | "any";
  conditions: Array<{
    metric: RuleItem["metric"];
    operator: RuleItem["operator"];
    threshold: string;
  }>;
  metric: RuleItem["metric"];
  operator: RuleItem["operator"];
  threshold: string;
  aggregation: RuleItem["aggregation"];
  windowMinutes: string;
  minSamples: string;
  cooldownMinutes: string;
  scopeType: "global" | "service" | "api";
  scopeValue: string;
  actions: string[];
}

/**
 * 符号：DEFAULT_ACTION_TYPES（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const DEFAULT_ACTION_TYPES = new Set(["email", "webhook", "slack", "sms", "wechat"]);

/**
 * 符号：buildDefaultRuleActions（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const buildDefaultRuleActions = (channels: ChannelItem[]) => {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const enabled = channels.filter((channel) => channel.enabled).map((channel) => channel.id);
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const fallback = channels.map((channel) => channel.id);
  return (enabled.length ? enabled : fallback).slice(0, 2);
};

/**
 * 符号：formatRuleActionLabel（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const formatRuleActionLabel = (action: string, channels: ChannelItem[]) => {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const channel = channels.find((item) => item.id === action);
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (channel) {
    return `${channel.name} (${channel.type})`;
  }
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (DEFAULT_ACTION_TYPES.has(action)) {
    return `type:${action}`;
  }
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return `invalid:${action}`;
};

const metricLabelMap: Record<string, string> = {
  qps: "每秒请求量",
  errorRate: "错误率",
  latencyP95: "95 分位延迟(P95)",
  latencyP99: "99 分位延迟(P99)",
  availability: "可用性",
  statusCode5xx: "5xx 错误数",
};

const aggregationLabelMap: Record<string, string> = {
  avg: "平均值",
  max: "最大值",
  min: "最小值",
  latest: "最新值",
};

/**
 * 符号：formatRuleCondition（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const formatRuleCondition = (
  condition: { metric: string; operator: string; threshold: number; aggregation?: string },
  defaultAggregation: string,
) => {
  const metricLabel = metricLabelMap[condition.metric] || condition.metric;
  const aggregation = condition.aggregation || defaultAggregation;
  const aggregationLabel = aggregationLabelMap[aggregation] || aggregation;
  return `${aggregationLabel}(${metricLabel}) ${condition.operator} ${condition.threshold}`;
};

const DEFAULT_FORM: RuleForm = {
  ruleType: "threshold",
  name: "",
  description: "",
  priority: "P2",
  conditionLogic: "all",
  conditions: [],
  metric: "errorRate",
  operator: ">",
  threshold: "5",
  aggregation: "avg",
  windowMinutes: "5",
  minSamples: "2",
  cooldownMinutes: "10",
  scopeType: "global",
  scopeValue: "",
  actions: [],
};

/**
 * 符号：formatDslValue（arrow-function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const formatDslValue = (value: string) => {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const trimmed = value.trim();
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (!trimmed) return "";
  if (/[\s"'=]/.test(trimmed)) {
    return `"${trimmed.replace(/"/g, '\\"')}"`;
  }
  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return trimmed;
};

/**
 * 符号：buildDslFromForm（arrow-function）
 * 作用说明：该函数用于构造对象或派生数据，保证字段完整和默认值统一。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const buildDslFromForm = (form: RuleForm) => {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const parts: string[] = [];
  // 步骤 1：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (form.conditions.length > 0) {
    const joiner = form.conditionLogic === "any" ? " or " : " and ";
    const conditionText = form.conditions
      .map((condition) => `${condition.metric} ${condition.operator} ${condition.threshold || "0"}`)
      .join(joiner);
    parts.push(conditionText);
  } else {
    parts.push(form.metric, form.operator, String(form.threshold || "0"));
  }
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (form.name.trim()) parts.push(`name=${formatDslValue(form.name)}`);
  // 步骤 2：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (form.description.trim()) parts.push(`desc=${formatDslValue(form.description)}`);
  if (form.priority) parts.push(`priority=${form.priority}`);
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (form.ruleType) parts.push(`type=${form.ruleType}`);
  // 步骤 3：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (form.conditions.length > 0) parts.push(`logic=${form.conditionLogic}`);
  if (form.aggregation) parts.push(`agg=${form.aggregation}`);
  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (form.windowMinutes) parts.push(`window=${form.windowMinutes}m`);
  // 步骤 4：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (form.minSamples) parts.push(`min=${form.minSamples}`);
  if (form.cooldownMinutes) parts.push(`cooldown=${form.cooldownMinutes}`);
  // 步骤 5：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (form.scopeType === "global") {
    parts.push("scope=global");
  } else if (form.scopeValue) {
    parts.push(`scope=${form.scopeType}:${form.scopeValue}`);
  }
  // 步骤 6：按条件分支处理不同场景，确保每条路径都符合业务约束。
  if (form.actions.length) parts.push(`actions=${form.actions.join(",")}`);
  // 步骤 5：返回当前结果并结束函数，明确本路径的输出语义。
  return parts.join(" ");
};

/**
 * 符号：mapRuleToForm（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const mapRuleToForm = (rule: RuleItem): RuleForm => {
  const scopeType =
    rule.scope?.type === "service" || rule.scope?.type === "api" ? rule.scope.type : "global";
  const firstCondition = Array.isArray(rule.conditions) && rule.conditions.length ? rule.conditions[0] : null;
  return {
    ruleType: (rule.ruleType || "threshold") as RuleForm["ruleType"],
    name: rule.name || "",
    description: rule.description || "",
    priority: rule.priority || "P2",
    conditionLogic: rule.conditionLogic === "any" ? "any" : "all",
    conditions: Array.isArray(rule.conditions)
      ? rule.conditions.map((condition) => ({
          metric: condition.metric,
          operator: condition.operator,
          threshold: String(condition.threshold ?? ""),
        }))
      : [],
    metric: firstCondition?.metric || rule.metric || "errorRate",
    operator: firstCondition?.operator || rule.operator || ">",
    threshold: String(firstCondition?.threshold ?? rule.threshold ?? ""),
    aggregation: firstCondition?.aggregation || rule.aggregation || "avg",
    windowMinutes: String(firstCondition?.windowMinutes ?? rule.windowMinutes ?? "5"),
    minSamples: String(firstCondition?.minSamples ?? rule.minSamples ?? "2"),
    cooldownMinutes: String(rule.cooldownMinutes ?? "10"),
    scopeType,
    scopeValue: rule.scope?.value ?? "",
    actions: Array.isArray(rule.actions) ? rule.actions : [],
  };
};

/**
 * 符号：RulesPage（function）
 * 作用说明：该组件是页面级入口，负责拼装子组件与组织页面状态。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
export function RulesPage() {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [rules, setRules] = useState<RuleItem[]>([]);
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [apis, setApis] = useState<ApiItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSmartOpen, setIsSmartOpen] = useState(false);
  const [isEditActionsOpen, setIsEditActionsOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(DEFAULT_FORM);
  const [dslText, setDslText] = useState("");
  const [dslWarnings, setDslWarnings] = useState<string[]>([]);
  const [dslError, setDslError] = useState<string | null>(null);
  const [dslSource, setDslSource] = useState<"form" | "dsl">("form");
  const [dslParsing, setDslParsing] = useState(false);
  const [editForm, setEditForm] = useState<RuleForm>(DEFAULT_FORM);
  const [editDslText, setEditDslText] = useState("");
  const [editDslWarnings, setEditDslWarnings] = useState<string[]>([]);
  const [editDslError, setEditDslError] = useState<string | null>(null);
  const [editDslSource, setEditDslSource] = useState<"form" | "dsl">("form");
  const [editDslParsing, setEditDslParsing] = useState(false);
  const [editActions, setEditActions] = useState<string[]>([]);
  const [smartScopeType, setSmartScopeType] = useState<"global" | "service" | "api">("global");
  const [smartScopeValue, setSmartScopeValue] = useState("");
  const [smartSensitivity, setSmartSensitivity] = useState<"low" | "medium" | "high">("medium");
  const [smartDays, setSmartDays] = useState("7");
  const [smartActions, setSmartActions] = useState<string[]>([]);
  const [simulateText, setSimulateText] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      const [ruleResult, apiResult, channelResult] = await Promise.all([
        apiClient.listRules(),
        apiClient.listApis(),
        apiClient.listChannels(),
      ]);
      setRules(ruleResult.items);
      setApis(apiResult.items);
      setChannels(channelResult.items);
      setError(null);

      if (!selectedRuleId && ruleResult.items.length > 0) {
        setSelectedRuleId(ruleResult.items[0].id);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [selectedRuleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!channels.length) return;
    setForm((prev) => {
      const validExisting = prev.actions.filter((action) => channels.some((channel) => channel.id === action));
      if (validExisting.length > 0) {
        return { ...prev, actions: validExisting };
      }
      return { ...prev, actions: buildDefaultRuleActions(channels) };
    });
    setEditForm((prev) => {
      const validExisting = prev.actions.filter((action) => channels.some((channel) => channel.id === action));
      if (validExisting.length > 0) {
        return { ...prev, actions: validExisting };
      }
      return { ...prev, actions: buildDefaultRuleActions(channels) };
    });
    setSmartActions((prev) => (prev.length ? prev : buildDefaultRuleActions(channels)));
    setDslSource("form");
  }, [channels]);

  const selectedRule = useMemo(
    () => rules.find((rule) => rule.id === selectedRuleId) ?? null,
    [rules, selectedRuleId],
  );
  // 步骤 2：执行当前前端业务子步骤，推进页面状态和交互流程。
  const selectedRuleIdSet = useMemo(() => new Set(selectedRuleIds), [selectedRuleIds]);
  const allRulesSelected = rules.length > 0 && selectedRuleIds.length === rules.length;

  useEffect(() => {
    const validIds = new Set(rules.map((rule) => rule.id));
    setSelectedRuleIds((prev) => prev.filter((id) => validIds.has(id)));
    if (selectedRuleId && !validIds.has(selectedRuleId)) {
      setSelectedRuleId("");
    }
  }, [rules, selectedRuleId]);

  useEffect(() => {
    if (!isCreateOpen) return;
    if (dslSource !== "form") return;
    setDslText(buildDslFromForm(form));
  }, [form, isCreateOpen, dslSource]);

  useEffect(() => {
    if (!isEditOpen) return;
    if (editDslSource !== "form") return;
    setEditDslText(buildDslFromForm(editForm));
  }, [editForm, isEditOpen, editDslSource]);

  const updateForm = (updater: (prev: RuleForm) => RuleForm) => {
    setForm((prev) => updater(prev));
    setDslSource("form");
    setDslError(null);
    setDslWarnings([]);
  };

  const updateEditForm = (updater: (prev: RuleForm) => RuleForm) => {
    setEditForm((prev) => updater(prev));
    setEditDslSource("form");
    setEditDslError(null);
    setEditDslWarnings([]);
  };

  const serviceOptions = useMemo(() => {
    return [...new Set(apis.map((api) => api.service))];
  }, [apis]);

  // 步骤 3：执行当前前端业务子步骤，推进页面状态和交互流程。
  const apiOptions = useMemo(() => apis.map((api) => ({ id: api.id, label: api.path })), [apis]);

  const createRule = async () => {
    try {
      await apiClient.createRule({
        ruleType: form.ruleType,
        name: form.name.trim(),
        description: form.description.trim(),
        priority: form.priority,
        metric: form.metric,
        operator: form.operator,
        threshold: Number(form.threshold),
        aggregation: form.aggregation,
        windowMinutes: Number(form.windowMinutes),
        minSamples: Number(form.minSamples),
        cooldownMinutes: Number(form.cooldownMinutes),
        failureCount: Number(form.minSamples),
        shortWindowMinutes: Number(form.windowMinutes),
        longWindowMinutes: Math.max(Number(form.windowMinutes) * 12, 60),
        burnRateThreshold: 2,
        sloTarget: 99.9,
        conditions:
          form.conditions.length > 0
            ? form.conditions.map((condition) => ({
                metric: condition.metric,
                operator: condition.operator,
                threshold: Number(condition.threshold),
              }))
            : undefined,
        conditionLogic: form.conditions.length > 0 ? form.conditionLogic : undefined,
        scope:
          form.scopeType === "global"
            ? { type: "global" }
            : { type: form.scopeType, value: form.scopeValue },
        actions: form.actions
          .map((item) => item.trim())
          .filter(Boolean),
        actor: localStorage.getItem("api_alert_user") || "admin",
      });

      setForm({ ...DEFAULT_FORM, actions: buildDefaultRuleActions(channels) });
      setIsCreateOpen(false);
      setMessage("规则已创建");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建规则失败");
    }
  };

  const parseDslIntoForm = async () => {
    const text = dslText.trim();
    if (!text) {
      setDslError("DSL 不能为空");
      return;
    }
    setDslParsing(true);
    try {
      const result = await apiClient.parseRuleDsl({ dsl: text });
      const nextForm = mapRuleToForm(result.rule);
      setForm(nextForm);
      setDslText(buildDslFromForm(nextForm));
      setDslWarnings(result.warnings || []);
      setDslError(null);
      setDslSource("form");
    } catch (requestError) {
      setDslError(requestError instanceof Error ? requestError.message : "DSL 解析失败");
    } finally {
      setDslParsing(false);
    }
  };

  const createRuleFromDsl = async () => {
    const text = dslText.trim();
    if (!text) {
      setDslError("DSL 不能为空");
      return;
    }
    setDslParsing(true);
    try {
      const result = await apiClient.createRuleDsl({
        dsl: text,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setDslWarnings(result.warnings || []);
      setIsCreateOpen(false);
      setMessage("规则已创建");
      await loadData();
    } catch (requestError) {
      setDslError(requestError instanceof Error ? requestError.message : "DSL 创建失败");
    } finally {
      setDslParsing(false);
    }
  };

  const parseDslIntoEditForm = async () => {
    const text = editDslText.trim();
    if (!text) {
      setEditDslError("DSL 不能为空");
      return;
    }
    setEditDslParsing(true);
    try {
      const result = await apiClient.parseRuleDsl({ dsl: text });
      const nextForm = mapRuleToForm(result.rule);
      setEditForm(nextForm);
      setEditDslText(buildDslFromForm(nextForm));
      setEditDslWarnings(result.warnings || []);
      setEditDslError(null);
      setEditDslSource("form");
    } catch (requestError) {
      setEditDslError(requestError instanceof Error ? requestError.message : "DSL 解析失败");
    } finally {
      setEditDslParsing(false);
    }
  };

  const updateRuleFromEditForm = async () => {
    if (!selectedRule) return;
    try {
      await apiClient.updateRule(selectedRule.id, {
        ruleType: editForm.ruleType,
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        priority: editForm.priority,
        metric: editForm.metric,
        operator: editForm.operator,
        threshold: Number(editForm.threshold),
        aggregation: editForm.aggregation,
        windowMinutes: Number(editForm.windowMinutes),
        minSamples: Number(editForm.minSamples),
        cooldownMinutes: Number(editForm.cooldownMinutes),
        failureCount: Number(editForm.minSamples),
        shortWindowMinutes: Number(editForm.windowMinutes),
        longWindowMinutes: Math.max(Number(editForm.windowMinutes) * 12, 60),
        burnRateThreshold: 2,
        sloTarget: 99.9,
        conditions:
          editForm.conditions.length > 0
            ? editForm.conditions.map((condition) => ({
                metric: condition.metric,
                operator: condition.operator,
                threshold: Number(condition.threshold),
              }))
            : [],
        conditionLogic: editForm.conditions.length > 0 ? editForm.conditionLogic : "all",
        scope:
          editForm.scopeType === "global"
            ? { type: "global" }
            : { type: editForm.scopeType, value: editForm.scopeValue },
        actions: editForm.actions.map((item) => item.trim()).filter(Boolean),
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setIsEditOpen(false);
      setMessage("规则已更新");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新规则失败");
    }
  };

  const updateRuleFromDsl = async () => {
    if (!selectedRule) return;
    const text = editDslText.trim();
    if (!text) {
      setEditDslError("DSL 不能为空");
      return;
    }
    setEditDslParsing(true);
    try {
      const result = await apiClient.parseRuleDsl({ dsl: text });
      const nextForm = mapRuleToForm(result.rule);
      setEditForm(nextForm);
      setEditDslText(buildDslFromForm(nextForm));
      setEditDslWarnings(result.warnings || []);
      setEditDslError(null);
      setEditDslSource("form");
      await apiClient.updateRule(selectedRule.id, {
        ruleType: nextForm.ruleType,
        name: nextForm.name.trim(),
        description: nextForm.description.trim(),
        priority: nextForm.priority,
        metric: nextForm.metric,
        operator: nextForm.operator,
        threshold: Number(nextForm.threshold),
        aggregation: nextForm.aggregation,
        windowMinutes: Number(nextForm.windowMinutes),
        minSamples: Number(nextForm.minSamples),
        cooldownMinutes: Number(nextForm.cooldownMinutes),
        failureCount: Number(nextForm.minSamples),
        shortWindowMinutes: Number(nextForm.windowMinutes),
        longWindowMinutes: Math.max(Number(nextForm.windowMinutes) * 12, 60),
        burnRateThreshold: 2,
        sloTarget: 99.9,
        conditions:
          nextForm.conditions.length > 0
            ? nextForm.conditions.map((condition) => ({
                metric: condition.metric,
                operator: condition.operator,
                threshold: Number(condition.threshold),
              }))
            : [],
        conditionLogic: nextForm.conditions.length > 0 ? nextForm.conditionLogic : "all",
        scope:
          nextForm.scopeType === "global"
            ? { type: "global" }
            : { type: nextForm.scopeType, value: nextForm.scopeValue },
        actions: nextForm.actions.map((item) => item.trim()).filter(Boolean),
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setIsEditOpen(false);
      setMessage("规则已更新");
      await loadData();
    } catch (requestError) {
      setEditDslError(requestError instanceof Error ? requestError.message : "DSL 更新失败");
    } finally {
      setEditDslParsing(false);
    }
  };

  const handleToggleRule = async (rule: RuleItem, enabled: boolean) => {
    try {
      await apiClient.toggleRule(rule.id, enabled, localStorage.getItem("api_alert_user") || "admin");
      setMessage(`${rule.name} 已${enabled ? "启用" : "禁用"}`);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "切换失败");
    }
  };

  const handleDeleteRule = async (rule: RuleItem) => {
    if (!window.confirm(`确认删除规则 ${rule.name} ?`)) {
      return;
    }

    try {
      await apiClient.deleteRule(rule.id, localStorage.getItem("api_alert_user") || "admin");
      setSelectedRuleIds((prev) => prev.filter((id) => id !== rule.id));
      if (selectedRuleId === rule.id) {
        setSelectedRuleId("");
      }
      setMessage(`已删除规则 ${rule.name}`);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "删除失败");
    }
  };

  const toggleSelectRule = (ruleId: string, checked: boolean) => {
    setSelectedRuleIds((prev) =>
      checked ? (prev.includes(ruleId) ? prev : [...prev, ruleId]) : prev.filter((id) => id !== ruleId),
    );
  };

  const toggleSelectAllRules = (checked: boolean) => {
    if (!checked) {
      setSelectedRuleIds([]);
      return;
    }
    setSelectedRuleIds(rules.map((rule) => rule.id));
  };

  const handleBulkToggleRules = async (enabled: boolean) => {
    if (!selectedRuleIds.length) return;
    try {
      const result = await apiClient.bulkToggleRules({
        ids: selectedRuleIds,
        enabled,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      const notFoundText = result.notFoundIds.length ? `，不存在 ${result.notFoundIds.length} 条` : "";
      setMessage(`批量${enabled ? "启用" : "禁用"}完成：${result.updatedCount}/${result.requested}${notFoundText}`);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量切换失败");
    }
  };

  const handleBulkDeleteRules = async () => {
    if (!selectedRuleIds.length) return;
    if (!window.confirm(`确认批量删除 ${selectedRuleIds.length} 条规则？`)) return;

    try {
      const result = await apiClient.bulkDeleteRules({
        ids: selectedRuleIds,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setSelectedRuleIds((prev) => prev.filter((id) => !result.deletedIds.includes(id)));
      if (selectedRuleId && result.deletedIds.includes(selectedRuleId)) {
        setSelectedRuleId("");
      }
      const notFoundText = result.notFoundIds.length ? `，不存在 ${result.notFoundIds.length} 条` : "";
      setMessage(`批量删除完成：${result.deletedCount}/${result.requested}${notFoundText}`);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量删除失败");
    }
  };

  const runSimulation = async () => {
    if (!selectedRule) return;

    try {
      const result = await apiClient.simulateRule(selectedRule.id);
      const lines = result.items.map((item) => {
        if (!item.evaluable) {
          return `${item.apiPath}: 无法评估 (${item.reason || "unknown"})`;
        }
        return `${item.apiPath}: value=${item.value} matched=${item.matched}`;
      });
      setSimulateText(lines.join("\n"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "模拟失败");
    }
  };

  const runSmartCreate = async () => {
    if (!smartActions.length) {
      setError("至少选择一个通知目的地");
      return;
    }

    const scope =
      smartScopeType === "global"
        ? { type: "global" as const }
        : { type: smartScopeType, value: smartScopeValue };

    try {
      const result = await apiClient.autoCreateRules({
        scope,
        sensitivity: smartSensitivity,
        days: Number(smartDays),
        actions: smartActions,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setIsSmartOpen(false);
      setMessage(
        `智能创建完成：新增 ${result.created.length} 条，跳过 ${result.skipped.length} 条（范围API ${result.basis.scopedApis}，样本 ${result.basis.scopedMetrics}）`,
      );
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "智能创建失败");
    }
  };

  const openEditActions = () => {
    if (!selectedRule) return;
    setEditActions(selectedRule.actions || []);
    setIsEditActionsOpen(true);
  };

  const saveEditActions = async () => {
    if (!selectedRule) return;
    if (!editActions.length) {
      setError("至少选择一个通知目的地");
      return;
    }
    try {
      await apiClient.updateRule(selectedRule.id, {
        actions: editActions,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setIsEditActionsOpen(false);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新通知目的地失败");
    }
  };

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">配置规则条件与触发动作</p>
          <h2 className="text-2xl font-semibold">规则引擎</h2>
        </div>

        <Dialog open={isSmartOpen} onOpenChange={setIsSmartOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              智能创建
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>智能创建规则</DialogTitle>
              <DialogDescription>自动基于历史指标推导阈值，复杂参数由系统自动计算。</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label>作用域类型</Label>
                <Select
                  value={smartScopeType}
                  onValueChange={(value) => {
                    setSmartScopeType(value as "global" | "service" | "api");
                    setSmartScopeValue("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">全局</SelectItem>
                    <SelectItem value="service">服务级</SelectItem>
                    <SelectItem value="api">单个API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {smartScopeType !== "global" && (
                <div className="space-y-2">
                  <Label>作用域值</Label>
                  <Select value={smartScopeValue} onValueChange={setSmartScopeValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {(smartScopeType === "service"
                        ? serviceOptions
                        : apiOptions.map((item) => item.id)).map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>敏感度</Label>
                <Select value={smartSensitivity} onValueChange={(value) => setSmartSensitivity(value as "low" | "medium" | "high")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">high (更敏感)</SelectItem>
                    <SelectItem value="medium">medium</SelectItem>
                    <SelectItem value="low">low (更稳健)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>历史天数</Label>
                <Input type="number" value={smartDays} onChange={(event) => setSmartDays(event.target.value)} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>通知目的地（可多选）</Label>
                <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-2">
                  {channels.map((channel) => (
                    <label key={channel.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={smartActions.includes(channel.id)}
                        onChange={(event) =>
                          setSmartActions((prev) =>
                            event.target.checked
                              ? [...prev, channel.id]
                              : prev.filter((item) => item !== channel.id),
                          )
                        }
                      />
                      <span>{channel.name}</span>
                      <span className="text-xs text-slate-500">({channel.type})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSmartOpen(false)}>
                取消
              </Button>
              <Button
                onClick={runSmartCreate}
                disabled={(smartScopeType !== "global" && !smartScopeValue) || smartActions.length === 0}
              >
                自动生成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) {
              const nextForm = { ...DEFAULT_FORM, actions: buildDefaultRuleActions(channels) };
              setForm(nextForm);
              setDslText(buildDslFromForm(nextForm));
              setDslSource("form");
              setDslWarnings([]);
              setDslError(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              新建规则
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>创建规则</DialogTitle>
              <DialogDescription>支持阈值告警、窗口聚合、作用域设置、冷却时间。</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>规则名称</Label>
                <Input
                  value={form.name}
                  onChange={(event) => updateForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="例如：支付错误率高"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>规则描述</Label>
                <Textarea
                  value={form.description}
                  onChange={(event) => updateForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>规则类型</Label>
                <Select
                  value={form.ruleType}
                  onValueChange={(value) =>
                    updateForm((prev) => ({
                      ...prev,
                      ruleType: value as RuleForm["ruleType"],
                      conditions: value === "threshold" ? prev.conditions : [],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="threshold">阈值触发</SelectItem>
                    <SelectItem value="consecutive_failures">连续失败</SelectItem>
                    <SelectItem value="missing_data">缺失数据</SelectItem>
                    <SelectItem value="burn_rate">SLO 消耗率</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>优先级</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) =>
                    updateForm((prev) => ({ ...prev, priority: value as RuleItem["priority"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P1">P1</SelectItem>
                    <SelectItem value="P2">P2</SelectItem>
                    <SelectItem value="P3">P3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.ruleType === "threshold" && (
                <div className="space-y-2 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>条件设置</Label>
                    {form.conditions.length > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateForm((prev) => {
                            const first = prev.conditions[0];
                            return {
                              ...prev,
                              metric: first?.metric || prev.metric,
                              operator: first?.operator || prev.operator,
                              threshold: first?.threshold || prev.threshold,
                              conditions: [],
                            };
                          })
                        }
                      >
                        切回单条件
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateForm((prev) => ({
                            ...prev,
                            conditions: [
                              { metric: prev.metric, operator: prev.operator, threshold: prev.threshold },
                            ],
                          }))
                        }
                      >
                        使用多条件
                      </Button>
                    )}
                  </div>

                  {form.conditions.length > 0 ? (
                    <div className="space-y-3 rounded-md border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>逻辑关系</span>
                        <Select
                          value={form.conditionLogic}
                          onValueChange={(value) =>
                            updateForm((prev) => ({ ...prev, conditionLogic: value as "all" | "any" }))
                          }
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">全部满足</SelectItem>
                            <SelectItem value="any">任一满足</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {form.conditions.map((condition, index) => (
                        <div key={`cond-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-[1.2fr_0.8fr_1fr_auto]">
                          <Select
                            value={condition.metric}
                            onValueChange={(value) =>
                              updateForm((prev) => {
                                const next = [...prev.conditions];
                                next[index] = { ...next[index], metric: value as RuleItem["metric"] };
                                return { ...prev, conditions: next };
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="qps">每秒请求量</SelectItem>
                              <SelectItem value="errorRate">错误率</SelectItem>
                              <SelectItem value="latencyP95">95 分位延迟(P95)</SelectItem>
                              <SelectItem value="latencyP99">99 分位延迟(P99)</SelectItem>
                              <SelectItem value="availability">可用性</SelectItem>
                              <SelectItem value="statusCode5xx">5xx 错误数</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={condition.operator}
                            onValueChange={(value) =>
                              updateForm((prev) => {
                                const next = [...prev.conditions];
                                next[index] = { ...next[index], operator: value as RuleItem["operator"] };
                                return { ...prev, conditions: next };
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value=">">&gt;</SelectItem>
                              <SelectItem value=">=">&gt;=</SelectItem>
                              <SelectItem value="<">&lt;</SelectItem>
                              <SelectItem value="<=">&lt;=</SelectItem>
                              <SelectItem value="==">==</SelectItem>
                              <SelectItem value="!=">!=</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={condition.threshold}
                            onChange={(event) =>
                              updateForm((prev) => {
                                const next = [...prev.conditions];
                                next[index] = { ...next[index], threshold: event.target.value };
                                return { ...prev, conditions: next };
                              })
                            }
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              updateForm((prev) => ({
                                ...prev,
                                conditions: prev.conditions.filter((_, idx) => idx !== index),
                              }))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateForm((prev) => ({
                            ...prev,
                            conditions: [
                              ...prev.conditions,
                              { metric: "errorRate", operator: ">", threshold: "5" },
                            ],
                          }))
                        }
                      >
                        新增条件
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>指标</Label>
                        <Select
                          value={form.metric}
                          onValueChange={(value) =>
                            updateForm((prev) => ({ ...prev, metric: value as RuleItem["metric"] }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="qps">每秒请求量</SelectItem>
                            <SelectItem value="errorRate">错误率</SelectItem>
                            <SelectItem value="latencyP95">95 分位延迟(P95)</SelectItem>
                            <SelectItem value="latencyP99">99 分位延迟(P99)</SelectItem>
                            <SelectItem value="availability">可用性</SelectItem>
                            <SelectItem value="statusCode5xx">5xx 错误数</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>操作符</Label>
                        <Select
                          value={form.operator}
                          onValueChange={(value) =>
                            updateForm((prev) => ({ ...prev, operator: value as RuleItem["operator"] }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=">">&gt;</SelectItem>
                            <SelectItem value=">=">&gt;=</SelectItem>
                            <SelectItem value="<">&lt;</SelectItem>
                            <SelectItem value="<=">&lt;=</SelectItem>
                            <SelectItem value="==">==</SelectItem>
                            <SelectItem value="!=">!=</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>阈值</Label>
                        <Input
                          type="number"
                          value={form.threshold}
                          onChange={(event) => updateForm((prev) => ({ ...prev, threshold: event.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>聚合方式</Label>
                <Select
                  value={form.aggregation}
                  onValueChange={(value) =>
                    updateForm((prev) => ({ ...prev, aggregation: value as RuleItem["aggregation"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avg">平均值</SelectItem>
                    <SelectItem value="max">最大值</SelectItem>
                    <SelectItem value="min">最小值</SelectItem>
                    <SelectItem value="latest">最新值</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>窗口分钟</Label>
                <Input
                  type="number"
                  value={form.windowMinutes}
                  onChange={(event) => updateForm((prev) => ({ ...prev, windowMinutes: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>最少样本数</Label>
                <Input
                  type="number"
                  value={form.minSamples}
                  onChange={(event) => updateForm((prev) => ({ ...prev, minSamples: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>冷却分钟</Label>
                <Input
                  type="number"
                  value={form.cooldownMinutes}
                  onChange={(event) => updateForm((prev) => ({ ...prev, cooldownMinutes: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>作用域类型</Label>
                <Select
                  value={form.scopeType}
                  onValueChange={(value) =>
                    updateForm((prev) => ({ ...prev, scopeType: value as RuleForm["scopeType"], scopeValue: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">全局</SelectItem>
                    <SelectItem value="service">服务级</SelectItem>
                    <SelectItem value="api">单个API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.scopeType !== "global" && (
                <div className="space-y-2">
                  <Label>作用域值</Label>
                  <Select
                    value={form.scopeValue}
                    onValueChange={(value) => updateForm((prev) => ({ ...prev, scopeValue: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {(form.scopeType === "service" ? serviceOptions : apiOptions.map((item) => item.id)).map(
                        (option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label>通知目的地（可多选）</Label>
                <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-2">
                  {channels.map((channel) => (
                    <label key={channel.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.actions.includes(channel.id)}
                        onChange={(event) =>
                          updateForm((prev) => ({
                            ...prev,
                            actions: event.target.checked
                              ? [...prev.actions, channel.id]
                              : prev.actions.filter((item) => item !== channel.id),
                          }))
                        }
                      />
                      <span>{channel.name}</span>
                      <span className="text-xs text-slate-500">({channel.type})</span>
                    </label>
                  ))}
                  {channels.length === 0 && (
                    <p className="text-xs text-slate-500">暂无通知渠道，请先到通知渠道页新增。</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>规则 DSL</Label>
                <Textarea
                  value={dslText}
                  onChange={(event) => {
                    setDslText(event.target.value);
                    setDslSource("dsl");
                    setDslError(null);
                    setDslWarnings([]);
                  }}
                  rows={4}
                  placeholder={'errorRate > 5 name="支付错误率高" priority=P1 agg=avg window=5m min=2 cooldown=10 scope=service:payment actions=email,slack'}
                />
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>表单改动会自动生成 DSL。</span>
                  <span>修改 DSL 后点击解析即可同步回表单。</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={parseDslIntoForm} disabled={dslParsing}>
                    解析到表单
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDslText(buildDslFromForm(form));
                      setDslSource("form");
                      setDslError(null);
                      setDslWarnings([]);
                    }}
                    disabled={dslParsing}
                  >
                    从表单生成
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-700 hover:text-blue-800"
                    onClick={createRuleFromDsl}
                    disabled={dslParsing || !dslText.trim()}
                  >
                    用 DSL 创建
                  </Button>
                </div>
                {dslError && <p className="text-sm text-red-600">{dslError}</p>}
                {dslWarnings.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                    警告：{dslWarnings.join("，")}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                取消
              </Button>
              <Button onClick={createRule} disabled={!form.name.trim() || form.actions.length === 0}>
                创建规则
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {message && (
        <Card className="border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</Card>
      )}
      {error && (
        <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <div className="border-b p-4">
            <h3 className="font-semibold">规则列表</h3>
            <p className="mt-1 text-xs text-slate-500">共 {rules.length} 条规则</p>
            <p className="mt-1 text-xs text-slate-500">已选 {selectedRuleIds.length} 条</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleSelectAllRules(!allRulesSelected)}>
                {allRulesSelected ? "取消全选" : "全选"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkToggleRules(true)}
                disabled={selectedRuleIds.length === 0}
              >
                批量启用
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkToggleRules(false)}
                disabled={selectedRuleIds.length === 0}
              >
                批量禁用
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={handleBulkDeleteRules}
                disabled={selectedRuleIds.length === 0}
              >
                批量删除
              </Button>
            </div>
          </div>
          <div className="space-y-2 p-3">
            {!loading && rules.length === 0 && <p className="text-sm text-slate-500">暂无规则</p>}
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2">
                <input
                  className="mt-3"
                  type="checkbox"
                  aria-label={`select-rule-${rule.id}`}
                  checked={selectedRuleIdSet.has(rule.id)}
                  onChange={(event) => toggleSelectRule(rule.id, event.target.checked)}
                />
                <button
                  type="button"
                  onClick={() => setSelectedRuleId(rule.id)}
                  className={`flex-1 rounded-md border p-3 text-left transition ${
                    rule.id === selectedRuleId ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${getLevelBadgeClass(rule.priority)}`}>
                      {rule.priority}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                      {rule.ruleType || "threshold"}
                    </span>
                    <p className="line-clamp-1 text-sm font-medium">{rule.name}</p>
                  </div>
                  <p className="line-clamp-1 text-xs text-slate-500">
                    {Array.isArray(rule.conditions) && rule.conditions.length > 0
                      ? `${rule.conditionLogic === "any" ? "任一" : "全部"}满足：${rule.conditions
                          .map((condition) => formatRuleCondition(condition, rule.aggregation))
                          .join("；")}`
                      : `${rule.metric} ${rule.operator} ${rule.threshold}`}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{rule.scope.type}{rule.scope.value ? `: ${rule.scope.value}` : ""}</span>
                    <span>{rule.activeAlertCount || 0} 活动告警</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 xl:col-span-2">
          {!selectedRule ? (
            <p className="text-sm text-slate-500">请选择左侧规则</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{selectedRule.name}</h3>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${getLevelBadgeClass(selectedRule.priority)}`}>
                      {selectedRule.priority}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{selectedRule.description || "无描述"}</p>
                  <p className="mt-1 text-xs text-slate-500">更新时间：{formatDateTime(selectedRule.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">启用</span>
                  <Switch
                    checked={selectedRule.enabled}
                    onCheckedChange={(checked) => handleToggleRule(selectedRule, checked as boolean)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4 text-sm">
                  <p className="mb-2 font-medium">匹配条件</p>
                  <p className="mb-1 text-xs text-slate-500">type: {selectedRule.ruleType || "threshold"}</p>
                  {Array.isArray(selectedRule.conditions) && selectedRule.conditions.length > 0 ? (
                    <div className="space-y-1 text-xs text-slate-700">
                      <p className="text-xs text-slate-500">
                        逻辑：{selectedRule.conditionLogic === "any" ? "任一满足" : "全部满足"}
                      </p>
                      {selectedRule.conditions.map((condition, index) => (
                        <p key={`${condition.metric}-${condition.operator}-${condition.threshold}-${index}`} className="font-mono">
                          {formatRuleCondition(condition, selectedRule.aggregation)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="font-mono text-xs text-slate-700">
                      {(aggregationLabelMap[selectedRule.aggregation] || selectedRule.aggregation)}
                      ({metricLabelMap[selectedRule.metric] || selectedRule.metric}) {selectedRule.operator} {selectedRule.threshold}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    窗口 {selectedRule.windowMinutes} 分钟，最少样本 {selectedRule.minSamples}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-4 text-sm">
                  <p className="mb-2 font-medium">作用域与动作</p>
                  <p className="text-xs text-slate-700">
                    作用域: {selectedRule.scope.type === "global" ? "全局" : selectedRule.scope.type === "service" ? "服务级" : "单个API"}
                    {selectedRule.scope.value ? ` (${selectedRule.scope.value})` : ""}
                  </p>
                  <p className="mt-2 text-xs text-slate-700">
                    actions: {selectedRule.actions.map((action) => formatRuleActionLabel(action, channels)).join(", ")}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">冷却时间 {selectedRule.cooldownMinutes} 分钟</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="gap-2" onClick={runSimulation}>
                  <Play className="h-4 w-4" />
                  模拟评估
                </Button>
                <Dialog
                  open={isEditOpen}
                  onOpenChange={(open) => {
                    setIsEditOpen(open);
                    if (open && selectedRule) {
                      const nextForm = mapRuleToForm(selectedRule);
                      setEditForm(nextForm);
                      setEditDslText(buildDslFromForm(nextForm));
                      setEditDslSource("form");
                      setEditDslWarnings([]);
                      setEditDslError(null);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Edit3 className="h-4 w-4" />
                      编辑规则
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>编辑规则</DialogTitle>
                      <DialogDescription>支持表单与 DSL 双向同步编辑。</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label>规则名称</Label>
                        <Input
                          value={editForm.name}
                          onChange={(event) => updateEditForm((prev) => ({ ...prev, name: event.target.value }))}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>规则描述</Label>
                        <Textarea
                          value={editForm.description}
                          onChange={(event) => updateEditForm((prev) => ({ ...prev, description: event.target.value }))}
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>规则类型</Label>
                        <Select
                          value={editForm.ruleType}
                          onValueChange={(value) =>
                            updateEditForm((prev) => ({
                              ...prev,
                              ruleType: value as RuleForm["ruleType"],
                              conditions: value === "threshold" ? prev.conditions : [],
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="threshold">阈值触发</SelectItem>
                            <SelectItem value="consecutive_failures">连续失败</SelectItem>
                            <SelectItem value="missing_data">缺失数据</SelectItem>
                            <SelectItem value="burn_rate">SLO 消耗率</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>优先级</Label>
                        <Select
                          value={editForm.priority}
                          onValueChange={(value) =>
                            updateEditForm((prev) => ({ ...prev, priority: value as RuleItem["priority"] }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="P1">P1</SelectItem>
                            <SelectItem value="P2">P2</SelectItem>
                            <SelectItem value="P3">P3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {editForm.ruleType === "threshold" && (
                        <div className="space-y-2 md:col-span-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label>条件设置</Label>
                            {editForm.conditions.length > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateEditForm((prev) => {
                                    const first = prev.conditions[0];
                                    return {
                                      ...prev,
                                      metric: first?.metric || prev.metric,
                                      operator: first?.operator || prev.operator,
                                      threshold: first?.threshold || prev.threshold,
                                      conditions: [],
                                    };
                                  })
                                }
                              >
                                切回单条件
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateEditForm((prev) => ({
                                    ...prev,
                                    conditions: [
                                      { metric: prev.metric, operator: prev.operator, threshold: prev.threshold },
                                    ],
                                  }))
                                }
                              >
                                使用多条件
                              </Button>
                            )}
                          </div>

                          {editForm.conditions.length > 0 ? (
                            <div className="space-y-3 rounded-md border border-slate-200 p-3">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>逻辑关系</span>
                                <Select
                                  value={editForm.conditionLogic}
                                  onValueChange={(value) =>
                                    updateEditForm((prev) => ({ ...prev, conditionLogic: value as "all" | "any" }))
                                  }
                                >
                                  <SelectTrigger className="h-8 w-[140px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">全部满足</SelectItem>
                                    <SelectItem value="any">任一满足</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {editForm.conditions.map((condition, index) => (
                                <div key={`edit-cond-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-[1.2fr_0.8fr_1fr_auto]">
                                  <Select
                                    value={condition.metric}
                                    onValueChange={(value) =>
                                      updateEditForm((prev) => {
                                        const next = [...prev.conditions];
                                        next[index] = { ...next[index], metric: value as RuleItem["metric"] };
                                        return { ...prev, conditions: next };
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="qps">每秒请求量</SelectItem>
                                      <SelectItem value="errorRate">错误率</SelectItem>
                                      <SelectItem value="latencyP95">95 分位延迟(P95)</SelectItem>
                                      <SelectItem value="latencyP99">99 分位延迟(P99)</SelectItem>
                                      <SelectItem value="availability">可用性</SelectItem>
                                      <SelectItem value="statusCode5xx">5xx 错误数</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={condition.operator}
                                    onValueChange={(value) =>
                                      updateEditForm((prev) => {
                                        const next = [...prev.conditions];
                                        next[index] = { ...next[index], operator: value as RuleItem["operator"] };
                                        return { ...prev, conditions: next };
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value=">">&gt;</SelectItem>
                                      <SelectItem value=">=">&gt;=</SelectItem>
                                      <SelectItem value="<">&lt;</SelectItem>
                                      <SelectItem value="<=">&lt;=</SelectItem>
                                      <SelectItem value="==">==</SelectItem>
                                      <SelectItem value="!=">!=</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="number"
                                    value={condition.threshold}
                                    onChange={(event) =>
                                      updateEditForm((prev) => {
                                        const next = [...prev.conditions];
                                        next[index] = { ...next[index], threshold: event.target.value };
                                        return { ...prev, conditions: next };
                                      })
                                    }
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                      updateEditForm((prev) => ({
                                        ...prev,
                                        conditions: prev.conditions.filter((_, idx) => idx !== index),
                                      }))
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateEditForm((prev) => ({
                                    ...prev,
                                    conditions: [
                                      ...prev.conditions,
                                      { metric: "errorRate", operator: ">", threshold: "5" },
                                    ],
                                  }))
                                }
                              >
                                新增条件
                              </Button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label>指标</Label>
                                <Select
                                  value={editForm.metric}
                                  onValueChange={(value) =>
                                    updateEditForm((prev) => ({ ...prev, metric: value as RuleItem["metric"] }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="qps">每秒请求量</SelectItem>
                                    <SelectItem value="errorRate">错误率</SelectItem>
                                    <SelectItem value="latencyP95">95 分位延迟(P95)</SelectItem>
                                    <SelectItem value="latencyP99">99 分位延迟(P99)</SelectItem>
                                    <SelectItem value="availability">可用性</SelectItem>
                                    <SelectItem value="statusCode5xx">5xx 错误数</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>操作符</Label>
                                <Select
                                  value={editForm.operator}
                                  onValueChange={(value) =>
                                    updateEditForm((prev) => ({ ...prev, operator: value as RuleItem["operator"] }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value=">">&gt;</SelectItem>
                                    <SelectItem value=">=">&gt;=</SelectItem>
                                    <SelectItem value="<">&lt;</SelectItem>
                                    <SelectItem value="<=">&lt;=</SelectItem>
                                    <SelectItem value="==">==</SelectItem>
                                    <SelectItem value="!=">!=</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>阈值</Label>
                                <Input
                                  type="number"
                                  value={editForm.threshold}
                                  onChange={(event) => updateEditForm((prev) => ({ ...prev, threshold: event.target.value }))}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>聚合方式</Label>
                        <Select
                          value={editForm.aggregation}
                          onValueChange={(value) =>
                            updateEditForm((prev) => ({ ...prev, aggregation: value as RuleItem["aggregation"] }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="avg">平均值</SelectItem>
                            <SelectItem value="max">最大值</SelectItem>
                            <SelectItem value="min">最小值</SelectItem>
                            <SelectItem value="latest">最新值</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>窗口分钟</Label>
                        <Input
                          type="number"
                          value={editForm.windowMinutes}
                          onChange={(event) => updateEditForm((prev) => ({ ...prev, windowMinutes: event.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>最少样本数</Label>
                        <Input
                          type="number"
                          value={editForm.minSamples}
                          onChange={(event) => updateEditForm((prev) => ({ ...prev, minSamples: event.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>冷却分钟</Label>
                        <Input
                          type="number"
                          value={editForm.cooldownMinutes}
                          onChange={(event) => updateEditForm((prev) => ({ ...prev, cooldownMinutes: event.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>作用域类型</Label>
                        <Select
                          value={editForm.scopeType}
                          onValueChange={(value) =>
                            updateEditForm((prev) => ({ ...prev, scopeType: value as RuleForm["scopeType"], scopeValue: "" }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="global">全局</SelectItem>
                            <SelectItem value="service">服务级</SelectItem>
                            <SelectItem value="api">单个API</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {editForm.scopeType !== "global" && (
                        <div className="space-y-2">
                          <Label>作用域值</Label>
                          <Select
                            value={editForm.scopeValue}
                            onValueChange={(value) => updateEditForm((prev) => ({ ...prev, scopeValue: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="请选择" />
                            </SelectTrigger>
                            <SelectContent>
                              {(editForm.scopeType === "service" ? serviceOptions : apiOptions.map((item) => item.id)).map(
                                (option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2 md:col-span-2">
                        <Label>通知目的地（可多选）</Label>
                        <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-2">
                          {channels.map((channel) => (
                            <label key={channel.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editForm.actions.includes(channel.id)}
                                onChange={(event) =>
                                  updateEditForm((prev) => ({
                                    ...prev,
                                    actions: event.target.checked
                                      ? [...prev.actions, channel.id]
                                      : prev.actions.filter((item) => item !== channel.id),
                                  }))
                                }
                              />
                              <span>{channel.name}</span>
                              <span className="text-xs text-slate-500">({channel.type})</span>
                            </label>
                          ))}
                          {channels.length === 0 && (
                            <p className="text-xs text-slate-500">暂无通知渠道，请先到通知渠道页新增。</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>规则 DSL</Label>
                        <Textarea
                          value={editDslText}
                          onChange={(event) => {
                            setEditDslText(event.target.value);
                            setEditDslSource("dsl");
                            setEditDslError(null);
                            setEditDslWarnings([]);
                          }}
                          rows={4}
                          placeholder={'errorRate > 5 name="支付错误率高" priority=P1 agg=avg window=5m min=2 cooldown=10 scope=service:payment actions=email,slack'}
                        />
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>表单改动会自动生成 DSL。</span>
                          <span>修改 DSL 后点击解析即可同步回表单。</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={parseDslIntoEditForm} disabled={editDslParsing}>
                            解析到表单
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditDslText(buildDslFromForm(editForm));
                              setEditDslSource("form");
                              setEditDslError(null);
                              setEditDslWarnings([]);
                            }}
                            disabled={editDslParsing}
                          >
                            从表单生成
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-200 text-blue-700 hover:text-blue-800"
                            onClick={updateRuleFromDsl}
                            disabled={editDslParsing || !editDslText.trim()}
                          >
                            用 DSL 更新
                          </Button>
                        </div>
                        {editDslError && <p className="text-sm text-red-600">{editDslError}</p>}
                        {editDslWarnings.length > 0 && (
                          <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                            警告：{editDslWarnings.join("，")}
                          </div>
                        )}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={updateRuleFromEditForm} disabled={!editForm.name.trim() || editForm.actions.length === 0}>
                        保存更新
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={isEditActionsOpen} onOpenChange={setIsEditActionsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2" onClick={openEditActions}>
                      <Edit3 className="h-4 w-4" />
                      编辑通知目的地
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>编辑通知目的地</DialogTitle>
                      <DialogDescription>为当前规则选择一个或多个通知渠道。</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 p-3">
                      {channels.map((channel) => (
                        <label key={channel.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editActions.includes(channel.id)}
                            onChange={(event) =>
                              setEditActions((prev) =>
                                event.target.checked
                                  ? [...prev, channel.id]
                                  : prev.filter((item) => item !== channel.id),
                              )
                            }
                          />
                          <span>{channel.name}</span>
                          <span className="text-xs text-slate-500">({channel.type})</span>
                        </label>
                      ))}
                      {channels.length === 0 && (
                        <p className="text-xs text-slate-500">暂无通知渠道，请先到通知渠道页新增。</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditActionsOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={saveEditActions} disabled={editActions.length === 0}>
                        保存
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  className="gap-2 text-red-600 hover:text-red-700"
                  onClick={() => handleDeleteRule(selectedRule)}
                >
                  <Trash2 className="h-4 w-4" />
                  删除规则
                </Button>
              </div>

              {simulateText && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-900">
                    <Bot className="h-4 w-4" />
                    模拟结果
                  </p>
                  <pre className="whitespace-pre-wrap text-xs text-blue-900">{simulateText}</pre>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}




