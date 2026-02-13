/**
 * @file src/app/pages/ApiMonitorPage.tsx
 * 文件作用：前端业务页面，负责状态管理、接口调用与交互渲染。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Columns3,
  Eye,
  FileUp,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Switch } from "../components/ui/switch";
import { apiClient } from "../lib/api";
import { startVisibilityAwarePolling } from "../lib/polling";
import type { ApiItem, CredentialItem } from "../lib/types";
import {
  formatDateTime,
  formatNumber,
  formatPercent,
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
 * 符号：ApiFormState（interface）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
interface ApiFormState {
  name: string;
  path: string;
  owner: string;
  service: string;
  environment: "production" | "staging" | "test";
  tags: string;
  mode: "push" | "pull";
  url: string;
  method: string;
  intervalSeconds: string;
  timeoutMs: string;
  expectedStatusCodes: string;
  headersJson: string;
  requestBody: string;
  safetyMode: "readonly" | "dry_run" | "sandbox";
  dryRunParamKey: string;
  dryRunParamValue: string;
  allowInProduction: boolean;
  credentialId: string;
}

const DEFAULT_FORM: ApiFormState = {
  name: "",
  path: "",
  owner: "",
  service: "",
  environment: "production",
  tags: "",
  mode: "pull",
  url: "",
  method: "GET",
  intervalSeconds: "60",
  timeoutMs: "5000",
  expectedStatusCodes: "200,204",
  headersJson: "{}",
  requestBody: "",
  safetyMode: "readonly",
  dryRunParamKey: "dryRun",
  dryRunParamValue: "true",
  allowInProduction: false,
  credentialId: "",
};

/**
 * 符号：MONITOR_COLUMN_OPTIONS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const MONITOR_COLUMN_OPTIONS = [
  { id: "api", label: "API", required: true },
  { id: "method", label: "方法" },
  { id: "mode", label: "模式" },
  { id: "owner", label: "负责人" },
  { id: "service", label: "服务" },
  { id: "environment", label: "环境" },
  { id: "errorRate", label: "错误率" },
  { id: "latencyP95", label: "95 分位延迟(P95)" },
  { id: "status", label: "状态", required: true },
  { id: "alerts", label: "告警" },
  { id: "lastSeen", label: "最后探测/上报" },
  { id: "actions", label: "操作", required: true },
] as const;

/**
 * 符号：MonitorColumnId（type）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
type MonitorColumnId = (typeof MONITOR_COLUMN_OPTIONS)[number]["id"];

/**
 * 符号：COLUMN_STORAGE_KEY（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const COLUMN_STORAGE_KEY = "api_monitor_visible_columns_v1";
/**
 * 符号：PIN_STORAGE_KEY（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const PIN_STORAGE_KEY = "api_monitor_pin_key_columns_v1";
/**
 * 符号：PAGE_SIZE_STORAGE_KEY（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const PAGE_SIZE_STORAGE_KEY = "api_monitor_rows_per_page_v1";

/**
 * 符号：DEFAULT_COLUMN_IDS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const DEFAULT_COLUMN_IDS = MONITOR_COLUMN_OPTIONS.map((option) => option.id);
/**
 * 符号：REQUIRED_COLUMN_IDS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const REQUIRED_COLUMN_IDS = new Set(
  MONITOR_COLUMN_OPTIONS.filter((option) => option.required).map((option) => option.id),
);
/**
 * 符号：PAGE_SIZE_OPTIONS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * 符号：sanitizeColumnIds（function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
function sanitizeColumnIds(rawIds: unknown): MonitorColumnId[] {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const allowed = new Set<MonitorColumnId>(DEFAULT_COLUMN_IDS);
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const picked = new Set<MonitorColumnId>();
  if (Array.isArray(rawIds)) {
    for (const raw of rawIds) {
      if (typeof raw !== "string") continue;
      const id = raw as MonitorColumnId;
      if (allowed.has(id)) picked.add(id);
    }
  }

  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const requiredId of REQUIRED_COLUMN_IDS) {
    picked.add(requiredId);
  }

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return DEFAULT_COLUMN_IDS.filter((id) => picked.has(id));
}

/**
 * 符号：ApiMonitorPage（function）
 * 作用说明：该组件是页面级入口，负责拼装子组件与组织页面状态。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
export function ApiMonitorPage() {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [items, setItems] = useState<ApiItem[]>([]);
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [demoModeEnabled, setDemoModeEnabled] = useState(false);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedApiIds, setSelectedApiIds] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const [monitorMode, setMonitorMode] = useState("all");
  const [visibleColumnIds, setVisibleColumnIds] = useState<MonitorColumnId[]>(() => {
    try {
      const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
      return raw ? sanitizeColumnIds(JSON.parse(raw)) : DEFAULT_COLUMN_IDS;
    } catch {
      return DEFAULT_COLUMN_IDS;
    }
  });
  const [pinKeyColumns, setPinKeyColumns] = useState(() => {
    return localStorage.getItem(PIN_STORAGE_KEY) !== "false";
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const raw = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY) || "20");
    return PAGE_SIZE_OPTIONS.includes(raw) ? raw : 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ApiFormState>(DEFAULT_FORM);

  const loadApiData = useCallback(async () => {
    try {
      const result = await apiClient.listApis();
      setItems(result.items);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCredentials = useCallback(async (force = false) => {
    if (credentialsLoaded && !force) return;

    setCredentialsLoading(true);
    try {
      const result = await apiClient.listCredentials();
      setCredentials(result.items);
      setCredentialsLoaded(true);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载凭据失败");
    } finally {
      setCredentialsLoading(false);
    }
  }, [credentialsLoaded]);

  useEffect(() => {
    loadApiData();
    return startVisibilityAwarePolling(loadApiData, POLLING_MS);
  }, [loadApiData]);

  useEffect(() => {
    apiClient
      .bootstrap()
      .then((result) => {
        setDemoModeEnabled(Boolean(result.demoMode));
      })
      .catch(() => {
        setDemoModeEnabled(false);
      });
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    void loadCredentials();
  }, [createOpen, loadCredentials]);

  const ownerOptions = useMemo(() => {
    const values = new Set(items.map((item) => item.owner));
    return [...values];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (search) {
        const text = search.toLowerCase();
        const matched =
          item.name.toLowerCase().includes(text) ||
          item.path.toLowerCase().includes(text) ||
          item.service.toLowerCase().includes(text) ||
          (item.monitor?.checkConfig?.url || "").toLowerCase().includes(text);
        if (!matched) return false;
      }

      if (status !== "all" && item.status !== status) {
        return false;
      }

      if (owner !== "all" && item.owner !== owner) {
        return false;
      }

      if (monitorMode !== "all" && item.monitor?.mode !== monitorMode) {
        return false;
      }

      return true;
    });
  }, [items, monitorMode, owner, search, status]);

  // 步骤 2：执行当前前端业务子步骤，推进页面状态和交互流程。
  const selectedApiIdSet = useMemo(() => new Set(selectedApiIds), [selectedApiIds]);
  const selectedFilteredCount = useMemo(
    () => filtered.filter((item) => selectedApiIdSet.has(item.id)).length,
    [filtered, selectedApiIdSet],
  );
  const allFilteredSelected = filtered.length > 0 && selectedFilteredCount === filtered.length;
  // 步骤 3：执行当前前端业务子步骤，推进页面状态和交互流程。
  const visibleColumnSet = useMemo(() => new Set(visibleColumnIds), [visibleColumnIds]);
  const visibleColumnCount = visibleColumnIds.length + 1;
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [currentPage, filtered, rowsPerPage]);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const rangeEnd = Math.min(currentPage * rowsPerPage, filtered.length);

  const stickySelectClass = pinKeyColumns ? "sticky left-0 z-20 bg-white" : "";
  const stickyApiClass = pinKeyColumns ? "sticky left-[44px] z-10 bg-white" : "";
  const stickyActionClass = pinKeyColumns ? "sticky right-0 z-20 bg-white" : "";

  useEffect(() => {
    const validIds = new Set(items.map((item) => item.id));
    setSelectedApiIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [items]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, owner, monitorMode, rowsPerPage]);

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumnIds));
  }, [visibleColumnIds]);

  useEffect(() => {
    localStorage.setItem(PIN_STORAGE_KEY, String(pinKeyColumns));
  }, [pinKeyColumns]);

  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(rowsPerPage));
  }, [rowsPerPage]);

  const handleDemoTick = async () => {
    if (!demoModeEnabled) return;
    try {
      await apiClient.demoTick();
      await loadApiData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "模拟失败");
    }
  };

  const handleCreateApi = async () => {
    if (!form.name.trim() || !form.path.trim() || !form.owner.trim() || !form.service.trim()) {
      setError("请填写 API 名称、路径、负责人和服务名称");
      return;
    }

    if (form.mode === "pull" && !form.url.trim()) {
      setError("pull 模式必须填写目标 URL");
      return;
    }

    let parsedHeaders: Record<string, string> = {};
    if (form.mode === "pull") {
      try {
        const raw = JSON.parse(form.headersJson || "{}") as Record<string, unknown>;
        parsedHeaders = Object.fromEntries(
          Object.entries(raw).map(([key, value]) => [String(key), String(value)]),
        );
      } catch {
        setError("请求头 JSON 格式不正确");
        return;
      }
    }

    try {
      await apiClient.createApi({
        method: form.method as ApiItem["method"],
        name: form.name.trim(),
        path: form.path.trim(),
        owner: form.owner.trim(),
        service: form.service.trim(),
        environment: form.environment,
        tags: form.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        monitor:
          form.mode === "pull"
            ? {
                mode: "pull",
                enabled: true,
                checkConfig: {
                  url: form.url.trim(),
                  method: form.method,
                  intervalSeconds: Number(form.intervalSeconds),
                  timeoutMs: Number(form.timeoutMs),
                  expectedStatusCodes: form.expectedStatusCodes
                    .split(",")
                    .map((item) => Number(item.trim()))
                    .filter((item) => Number.isInteger(item) && item >= 100 && item <= 599),
                  headers: parsedHeaders,
                  body: form.requestBody,
                  safetyMode: form.safetyMode,
                  dryRunParamKey: form.dryRunParamKey,
                  dryRunParamValue: form.dryRunParamValue,
                  allowInProduction: form.allowInProduction,
                  credentialId: form.credentialId || null,
                },
              }
            : {
                mode: "push",
                enabled: true,
                source: "manual",
              },
      });

      setCreateOpen(false);
      setForm(DEFAULT_FORM);
      await loadApiData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建失败");
    }
  };

  const handleImportQuick = async () => {
    const sourceType = window.confirm("Import OpenAPI from URL?\nOK=URL, Cancel=Paste text") ? "url" : "text";
    const source = window.prompt(
      sourceType === "url" ? "Enter OpenAPI URL" : "Paste OpenAPI JSON/YAML",
      "",
    );
    if (!source?.trim()) return;

    const credentialId = window.prompt("Optional credentialId for imported APIs (leave blank for none)", "") || "";

    try {
      const result = await apiClient.importOpenApi({
        sourceType: sourceType as "url" | "text",
        url: sourceType === "url" ? source.trim() : undefined,
        text: sourceType === "text" ? source : undefined,
        actor: localStorage.getItem("api_alert_user") || "admin",
        defaults: {
          owner: "Imported Team",
          service: "imported-service",
          environment: "test",
          tags: ["openapi", "imported"],
          writeSafetyMode: "dry_run",
          dryRunParamKey: "dryRun",
          dryRunParamValue: "true",
          allowWriteInProduction: false,
          credentialId: credentialId.trim() || undefined,
        },
      });
      window.alert(`Imported: total=${result.total}, created=${result.created}, skipped=${result.skipped}`);
      await loadApiData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Import failed");
    }
  };
  const handleDeleteApi = async (api: ApiItem) => {
    if (!window.confirm(`确认删除 API ${api.path} ?`)) {
      return;
    }

    const cascade = window.confirm("是否级联删除其关联指标/告警/命中数据？\n确定=级联删除，取消=仅在无依赖时删除");

    try {
      await apiClient.deleteApi(api.id, {
        cascade,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setMessage(`已删除 API ${api.path}`);
      await loadApiData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "删除失败");
    }
  };

  const toggleSelectApi = (apiId: string, checked: boolean) => {
    setSelectedApiIds((prev) =>
      checked ? (prev.includes(apiId) ? prev : [...prev, apiId]) : prev.filter((item) => item !== apiId),
    );
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedApiIds((prev) => {
      if (!checked) {
        const filteredIdSet = new Set(filtered.map((item) => item.id));
        return prev.filter((id) => !filteredIdSet.has(id));
      }

      const next = new Set(prev);
      for (const item of filtered) {
        next.add(item.id);
      }
      return [...next];
    });
  };

  const handleToggleColumn = (columnId: MonitorColumnId, checked: boolean) => {
    if (REQUIRED_COLUMN_IDS.has(columnId)) return;

    setVisibleColumnIds((prev) => {
      const next = checked
        ? [...prev, columnId]
        : prev.filter((item) => item !== columnId);

      const unique = new Set(next);
      for (const requiredId of REQUIRED_COLUMN_IDS) {
        unique.add(requiredId);
      }

      return DEFAULT_COLUMN_IDS.filter((id) => unique.has(id));
    });
  };

  const handleRowsPerPageChange = (value: string) => {
    const parsed = Number(value);
    setRowsPerPage(PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : 20);
  };

  const handleBulkDeleteApis = async () => {
    if (!selectedApiIds.length) return;
    if (!window.confirm(`确认批量删除 ${selectedApiIds.length} 个 API？`)) return;

    const cascade = window.confirm(
      "是否级联删除关联指标/告警/命中数据/作用域规则？\n确定=级联删除，取消=仅删除无依赖项",
    );

    try {
      const result = await apiClient.bulkDeleteApis({
        ids: selectedApiIds,
        cascade,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });

      setSelectedApiIds((prev) => prev.filter((id) => !result.deletedIds.includes(id)));
      const conflictText = result.conflicts.length ? `，冲突 ${result.conflicts.length} 项` : "";
      const notFoundText = result.notFoundIds.length ? `，不存在 ${result.notFoundIds.length} 项` : "";
      setMessage(`批量删除完成：成功 ${result.deletedCount}/${result.requested}${conflictText}${notFoundText}`);
      await loadApiData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量删除失败");
    }
  };

  const handleCheckNow = async (api: ApiItem) => {
    try {
      await apiClient.runApiCheckNow(api.id, localStorage.getItem("api_alert_user") || "admin");
      await loadApiData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "探测失败");
    }
  };

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="搜索名称/路径/URL..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="healthy">正常</SelectItem>
                <SelectItem value="warning">告警</SelectItem>
                <SelectItem value="critical">严重</SelectItem>
              </SelectContent>
            </Select>

            <Select value={monitorMode} onValueChange={setMonitorMode}>
              <SelectTrigger>
                <SelectValue placeholder="监控模式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模式</SelectItem>
                <SelectItem value="pull">pull 主动探测</SelectItem>
                <SelectItem value="push">push 指标上报</SelectItem>
              </SelectContent>
            </Select>

            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger>
                <SelectValue placeholder="负责人筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部负责人</SelectItem>
                {ownerOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4" />
                  新增监控 API
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>新增监控 API</DialogTitle>
                  <DialogDescription>
                    支持 pull 主动探测任意外部 API，也支持 push 模式接收业务侧指标上报。
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>名称</Label>
                    <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>路径标识</Label>
                    <Input
                      value={form.path}
                      onChange={(event) => setForm((prev) => ({ ...prev, path: event.target.value }))}
                      placeholder="例如 /external/github/status"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>负责人</Label>
                    <Input value={form.owner} onChange={(event) => setForm((prev) => ({ ...prev, owner: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>服务名称</Label>
                    <Input value={form.service} onChange={(event) => setForm((prev) => ({ ...prev, service: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>环境</Label>
                    <Select
                      value={form.environment}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          environment: value as "production" | "staging" | "test",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">production</SelectItem>
                        <SelectItem value="staging">staging</SelectItem>
                        <SelectItem value="test">test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>标签（逗号分隔）</Label>
                    <Input value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>监控模式</Label>
                    <Select value={form.mode} onValueChange={(value) => setForm((prev) => ({ ...prev, mode: value as "pull" | "push" }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pull">pull 主动探测</SelectItem>
                        <SelectItem value="push">push 指标上报</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.mode === "pull" && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <Label>目标 URL</Label>
                        <Input
                          value={form.url}
                          onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                          placeholder="https://api.example.com/health"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>方法</Label>
                        <Select value={form.method} onValueChange={(value) => setForm((prev) => ({ ...prev, method: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                            <SelectItem value="HEAD">HEAD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>探测间隔(秒)</Label>
                        <Input
                          type="number"
                          value={form.intervalSeconds}
                          onChange={(event) => setForm((prev) => ({ ...prev, intervalSeconds: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>超时(ms)</Label>
                        <Input
                          type="number"
                          value={form.timeoutMs}
                          onChange={(event) => setForm((prev) => ({ ...prev, timeoutMs: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>期望状态码</Label>
                        <Input
                          value={form.expectedStatusCodes}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, expectedStatusCodes: event.target.value }))
                          }
                          placeholder="200,204"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>写探测安全策略</Label>
                        <Select
                          value={form.safetyMode}
                          onValueChange={(value) =>
                            setForm((prev) => ({
                              ...prev,
                              safetyMode: value as "readonly" | "dry_run" | "sandbox",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="readonly">readonly（禁写探测）</SelectItem>
                            <SelectItem value="dry_run">dry_run（自动加 dry-run）</SelectItem>
                            <SelectItem value="sandbox">sandbox（仅沙箱允许写探测）</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>生产环境允许写探测</Label>
                        <Select
                          value={form.allowInProduction ? "yes" : "no"}
                          onValueChange={(value) =>
                            setForm((prev) => ({ ...prev, allowInProduction: value === "yes" }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">否</SelectItem>
                            <SelectItem value="yes">是（谨慎）</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>凭据</Label>
                        <Select
                          value={form.credentialId || "none"}
                          onValueChange={(value) =>
                            setForm((prev) => ({ ...prev, credentialId: value === "none" ? "" : value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">不使用凭据</SelectItem>
                            {credentialsLoading && (
                              <SelectItem value="__loading__" disabled>
                                凭据加载中...
                              </SelectItem>
                            )}
                            {credentials.map((credential) => (
                              <SelectItem key={credential.id} value={credential.id}>
                                {credential.name} ({credential.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>dry-run 参数名</Label>
                        <Input
                          value={form.dryRunParamKey}
                          onChange={(event) => setForm((prev) => ({ ...prev, dryRunParamKey: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>dry-run 参数值</Label>
                        <Input
                          value={form.dryRunParamValue}
                          onChange={(event) => setForm((prev) => ({ ...prev, dryRunParamValue: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>请求头 JSON</Label>
                        <Textarea
                          value={form.headersJson}
                          onChange={(event) => setForm((prev) => ({ ...prev, headersJson: event.target.value }))}
                          rows={3}
                          className="font-mono text-xs"
                          placeholder='{\"Authorization\":\"Bearer xxx\"}'
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>请求体（可选）</Label>
                        <Textarea
                          value={form.requestBody}
                          onChange={(event) => setForm((prev) => ({ ...prev, requestBody: event.target.value }))}
                          rows={3}
                          className="font-mono text-xs"
                        />
                      </div>
                    </>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateApi}>创建</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="gap-2" onClick={handleImportQuick}>
              <FileUp className="h-4 w-4" />
              导入 OpenAPI
            </Button>
            {demoModeEnabled && (
              <Button variant="outline" className="gap-2" onClick={handleDemoTick}>
                <ShieldAlert className="h-4 w-4" />
                生成一轮指标
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={loadApiData}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            已选择 <span className="font-semibold">{selectedApiIds.length}</span> 项
            {filtered.length > 0 && (
              <span className="text-slate-500">
                （当前筛选命中 {selectedFilteredCount}/{filtered.length}）
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => toggleSelectAllFiltered(!allFilteredSelected)}>
              {allFilteredSelected ? "取消全选当前筛选" : "全选当前筛选"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedApiIds([])}
              disabled={selectedApiIds.length === 0}
            >
              清空选择
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={handleBulkDeleteApis}
              disabled={selectedApiIds.length === 0}
            >
              批量删除
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <p className="text-sm text-slate-600">
            当前展示 {rangeStart}-{rangeEnd} / {filtered.length} 条，页码 {currentPage}/{totalPages}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
              <span className="text-sm text-slate-600">固定关键列</span>
              <Switch checked={pinKeyColumns} onCheckedChange={setPinKeyColumns} />
            </div>

            <Select value={String(rowsPerPage)} onValueChange={handleRowsPerPageChange}>
              <SelectTrigger className="w-[136px]">
                <SelectValue placeholder="每页行数" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    每页 {size} 行
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Columns3 className="h-4 w-4" />
                  列显示
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>显示列</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {MONITOR_COLUMN_OPTIONS.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={visibleColumnSet.has(column.id)}
                    disabled={Boolean(column.required)}
                    onCheckedChange={(checked) => handleToggleColumn(column.id, checked === true)}
                  >
                    {column.label}
                    {column.required ? "（必选）" : ""}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
            >
              下一页
            </Button>
          </div>
        </div>
      </Card>

      {message && <Card className="border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</Card>}
      {error && <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}

      <Card className="overflow-hidden">
        <Table className="min-w-[1120px]">
          <TableHeader>
            <TableRow>
              <TableHead className={`w-11 min-w-11 px-2 ${stickySelectClass}`}>
                <input
                  type="checkbox"
                  aria-label="select-all-apis"
                  checked={allFilteredSelected}
                  onChange={(event) => toggleSelectAllFiltered(event.target.checked)}
                />
              </TableHead>

              {visibleColumnSet.has("api") && <TableHead className={stickyApiClass}>API</TableHead>}
              {visibleColumnSet.has("method") && <TableHead>方法</TableHead>}
              {visibleColumnSet.has("mode") && <TableHead>模式</TableHead>}
              {visibleColumnSet.has("owner") && <TableHead>负责人</TableHead>}
              {visibleColumnSet.has("service") && <TableHead>服务</TableHead>}
              {visibleColumnSet.has("environment") && <TableHead>环境</TableHead>}
              {visibleColumnSet.has("errorRate") && <TableHead className="text-right">错误率</TableHead>}
              {visibleColumnSet.has("latencyP95") && <TableHead className="text-right">95 分位延迟(P95)</TableHead>}
              {visibleColumnSet.has("status") && <TableHead>状态</TableHead>}
              {visibleColumnSet.has("alerts") && <TableHead>告警</TableHead>}
              {visibleColumnSet.has("lastSeen") && <TableHead>最后探测/上报</TableHead>}
              {visibleColumnSet.has("actions") && <TableHead className={`text-right ${stickyActionClass}`}>操作</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="py-8 text-center text-slate-500">
                  暂无匹配 API
                </TableCell>
              </TableRow>
            )}

            {pagedItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className={`px-2 ${stickySelectClass}`}>
                  <input
                    type="checkbox"
                    aria-label={`select-api-${item.id}`}
                    checked={selectedApiIdSet.has(item.id)}
                    onChange={(event) => toggleSelectApi(item.id, event.target.checked)}
                  />
                </TableCell>

                {visibleColumnSet.has("api") && (
                  <TableCell className={stickyApiClass}>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="font-mono text-xs text-slate-500">{item.path}</p>
                      {item.monitor?.mode === "pull" && item.monitor?.checkConfig?.url && (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-400">{item.monitor.checkConfig.url}</p>
                      )}
                    </div>
                  </TableCell>
                )}

                {visibleColumnSet.has("method") && (
                  <TableCell>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-mono">{item.method || "GET"}</span>
                  </TableCell>
                )}

                {visibleColumnSet.has("mode") && (
                  <TableCell>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs">
                      {item.monitor?.mode === "pull" ? "pull" : "push"}
                    </span>
                  </TableCell>
                )}

                {visibleColumnSet.has("owner") && <TableCell>{item.owner}</TableCell>}
                {visibleColumnSet.has("service") && <TableCell>{item.service}</TableCell>}
                {visibleColumnSet.has("environment") && <TableCell>{item.environment}</TableCell>}
                {visibleColumnSet.has("errorRate") && (
                  <TableCell className="text-right">{formatPercent(item.latestMetrics?.errorRate, 2)}</TableCell>
                )}
                {visibleColumnSet.has("latencyP95") && (
                  <TableCell className="text-right">{formatNumber(item.latestMetrics?.latencyP95, 0)} ms</TableCell>
                )}

                {visibleColumnSet.has("status") && (
                  <TableCell>
                    <span className={`rounded px-2 py-1 text-xs font-medium ${getApiStatusClass(item.status)}`}>
                      {getApiStatusText(item.status)}
                    </span>
                  </TableCell>
                )}

                {visibleColumnSet.has("alerts") && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{item.activeAlertCount}</span>
                      {item.highestAlertLevel && (
                        <span className={`rounded px-2 py-0.5 text-xs ${getLevelBadgeClass(item.highestAlertLevel)}`}>
                          {item.highestAlertLevel}
                        </span>
                      )}
                    </div>
                  </TableCell>
                )}

                {visibleColumnSet.has("lastSeen") && (
                  <TableCell className="text-xs text-slate-500">
                    {formatDateTime(item.monitor?.lastCheckedAt || item.latestMetrics?.timestamp)}
                  </TableCell>
                )}

                {visibleColumnSet.has("actions") && (
                  <TableCell className={`text-right ${stickyActionClass}`}>
                    <div className="flex justify-end gap-1">
                      {item.monitor?.mode === "pull" && (
                        <Button variant="ghost" size="sm" onClick={() => handleCheckNow(item)}>
                          探测
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/api-monitor/${item.id}`} className="gap-1">
                          <Eye className="h-4 w-4" />
                          详情
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteApi(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

    </div>
  );
}




