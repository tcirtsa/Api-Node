/**
 * @file src/app/pages/AlertsPage.tsx
 * 文件作用：前端业务页面，负责状态管理、接口调用与交互渲染。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock3, Columns3, Filter, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { Textarea } from "../components/ui/textarea";
import { apiClient } from "../lib/api";
import { startVisibilityAwarePolling } from "../lib/polling";
import type { AlertItem } from "../lib/types";
import {
  formatDateTime,
  getAlertStatusClass,
  getAlertStatusText,
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
 * 符号：ALERT_COLUMN_OPTIONS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const ALERT_COLUMN_OPTIONS = [
  { id: "level", label: "级别", required: true },
  { id: "api", label: "API", required: true },
  { id: "rule", label: "规则" },
  { id: "message", label: "告警信息" },
  { id: "status", label: "状态" },
  { id: "triggeredAt", label: "触发时间" },
  { id: "updatedAt", label: "最后更新" },
  { id: "actions", label: "操作", required: true },
] as const;

/**
 * 符号：AlertColumnId（type）
 * 作用说明：该类型声明用于约束数据形状，提高可读性和类型安全。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：类型层声明，不直接执行运行时逻辑，作用是约束其它代码的输入输出格式。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
type AlertColumnId = (typeof ALERT_COLUMN_OPTIONS)[number]["id"];

/**
 * 符号：ALERT_COLUMN_STORAGE_KEY（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const ALERT_COLUMN_STORAGE_KEY = "alerts_visible_columns_v1";
/**
 * 符号：ALERT_PIN_STORAGE_KEY（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const ALERT_PIN_STORAGE_KEY = "alerts_pin_key_columns_v1";
/**
 * 符号：ALERT_PAGE_SIZE_STORAGE_KEY（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const ALERT_PAGE_SIZE_STORAGE_KEY = "alerts_rows_per_page_v1";
/**
 * 符号：ALERT_PAGE_SIZE_OPTIONS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const ALERT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
/**
 * 符号：ALERT_DEFAULT_COLUMN_IDS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const ALERT_DEFAULT_COLUMN_IDS = ALERT_COLUMN_OPTIONS.map((option) => option.id);
/**
 * 符号：ALERT_REQUIRED_COLUMN_IDS（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现中使用 map/filter/reduce 等数组操作，强调声明式数据变换。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
const ALERT_REQUIRED_COLUMN_IDS = new Set(
  ALERT_COLUMN_OPTIONS.filter((option) => 'required' in option && option.required).map((option) => option.id),
);

/**
 * 符号：sanitizeAlertColumnIds（function）
 * 作用说明：该函数用于输入标准化，先把不稳定入参转为稳定结构。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
function sanitizeAlertColumnIds(rawIds: unknown): AlertColumnId[] {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const allowed = new Set<AlertColumnId>(ALERT_DEFAULT_COLUMN_IDS);
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const picked = new Set<AlertColumnId>();
  if (Array.isArray(rawIds)) {
    for (const raw of rawIds) {
      if (typeof raw !== "string") continue;
      const id = raw as AlertColumnId;
      if (allowed.has(id)) picked.add(id);
    }
  }
  // 步骤 2：遍历数据集合并逐项处理，累计中间结果或执行批量动作。
  for (const requiredId of ALERT_REQUIRED_COLUMN_IDS) {
    picked.add(requiredId);
  }
  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return ALERT_DEFAULT_COLUMN_IDS.filter((id) => picked.has(id));
}

/**
 * 符号：AlertsPage（function）
 * 作用说明：该组件是页面级入口，负责拼装子组件与组织页面状态。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
export function AlertsPage() {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);
  const [operatorNote, setOperatorNote] = useState("");
  const [visibleColumnIds, setVisibleColumnIds] = useState<AlertColumnId[]>(() => {
    try {
      const raw = localStorage.getItem(ALERT_COLUMN_STORAGE_KEY);
      return raw ? sanitizeAlertColumnIds(JSON.parse(raw)) : ALERT_DEFAULT_COLUMN_IDS;
    } catch {
      return ALERT_DEFAULT_COLUMN_IDS;
    }
  });
  const [pinKeyColumns, setPinKeyColumns] = useState(() => {
    return localStorage.getItem(ALERT_PIN_STORAGE_KEY) !== "false";
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const raw = Number(localStorage.getItem(ALERT_PAGE_SIZE_STORAGE_KEY) || "20");
    return ALERT_PAGE_SIZE_OPTIONS.includes(raw) ? raw : 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async () => {
    try {
      const result = await apiClient.listAlerts({ limit: 300 });
      setAlerts(result.items);
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

  const filtered = useMemo(() => {
    return alerts.filter((alert) => {
      if (statusFilter !== "all" && alert.status !== statusFilter) {
        return false;
      }
      if (levelFilter !== "all" && alert.level !== levelFilter) {
        return false;
      }
      return true;
    });
  }, [alerts, levelFilter, statusFilter]);

  // 步骤 2：执行当前前端业务子步骤，推进页面状态和交互流程。
  const selectedAlertIdSet = useMemo(() => new Set(selectedAlertIds), [selectedAlertIds]);
  const selectedFilteredCount = useMemo(
    () => filtered.filter((item) => selectedAlertIdSet.has(item.id)).length,
    [filtered, selectedAlertIdSet],
  );
  const allFilteredSelected = filtered.length > 0 && selectedFilteredCount === filtered.length;
  // 步骤 3：执行当前前端业务子步骤，推进页面状态和交互流程。
  const visibleColumnSet = useMemo(() => new Set(visibleColumnIds), [visibleColumnIds]);
  const visibleColumnCount = visibleColumnIds.length + 1;
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pagedAlerts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [currentPage, filtered, rowsPerPage]);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const rangeEnd = Math.min(currentPage * rowsPerPage, filtered.length);

  const stickySelectClass = pinKeyColumns ? "sticky left-0 z-20 bg-white" : "";
  const stickyApiClass = pinKeyColumns ? "sticky left-[44px] z-10 bg-white" : "";
  const stickyActionClass = pinKeyColumns ? "sticky right-0 z-20 bg-white" : "";

  useEffect(() => {
    const validIds = new Set(alerts.map((item) => item.id));
    setSelectedAlertIds((prev) => prev.filter((id) => validIds.has(id)));
    if (selectedAlert && !validIds.has(selectedAlert.id)) {
      setSelectedAlert(null);
    }
  }, [alerts, selectedAlert]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, levelFilter, rowsPerPage]);

  useEffect(() => {
    localStorage.setItem(ALERT_COLUMN_STORAGE_KEY, JSON.stringify(visibleColumnIds));
  }, [visibleColumnIds]);

  useEffect(() => {
    localStorage.setItem(ALERT_PIN_STORAGE_KEY, String(pinKeyColumns));
  }, [pinKeyColumns]);

  useEffect(() => {
    localStorage.setItem(ALERT_PAGE_SIZE_STORAGE_KEY, String(rowsPerPage));
  }, [rowsPerPage]);

  const stats = useMemo(() => {
    return {
      open: alerts.filter((item) => item.status === "open").length,
      acknowledged: alerts.filter((item) => item.status === "acknowledged").length,
      resolved: alerts.filter((item) => item.status === "resolved").length,
      closed: alerts.filter((item) => item.status === "closed").length,
    };
  }, [alerts]);

  const updateStatus = async (status: AlertItem["status"]) => {
    if (!selectedAlert) return;

    try {
      await apiClient.updateAlertStatus(selectedAlert.id, {
        status,
        actor: localStorage.getItem("api_alert_user") || "admin",
        note: operatorNote,
      });

      setOperatorNote("");
      setMessage(`告警状态已更新为 ${getAlertStatusText(status)}`);
      await loadData();

      const refreshed = await apiClient.getAlertDetail(selectedAlert.id);
      setSelectedAlert(refreshed.item);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新失败");
    }
  };

  const deleteAlert = async () => {
    if (!selectedAlert) return;
    if (!window.confirm(`确认删除告警 ${selectedAlert.id} ?`)) return;

    try {
      await apiClient.deleteAlert(selectedAlert.id, localStorage.getItem("api_alert_user") || "admin");
      setSelectedAlert(null);
      setSelectedAlertIds((prev) => prev.filter((id) => id !== selectedAlert.id));
      setMessage("告警已删除");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "删除失败");
    }
  };

  const updateFeedback = async (
    label: "false_positive" | "true_positive" | "noise" | "unknown",
  ) => {
    if (!selectedAlert) return;
    try {
      await apiClient.updateAlertFeedback(selectedAlert.id, {
        label,
        note: operatorNote,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setMessage("反馈已更新");
      await loadData();
      const refreshed = await apiClient.getAlertDetail(selectedAlert.id);
      setSelectedAlert(refreshed.item);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "反馈更新失败");
    }
  };

  const toggleSelectAlert = (alertId: string, checked: boolean) => {
    setSelectedAlertIds((prev) =>
      checked ? (prev.includes(alertId) ? prev : [...prev, alertId]) : prev.filter((item) => item !== alertId),
    );
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedAlertIds((prev) => {
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

  const handleToggleColumn = (columnId: AlertColumnId, checked: boolean) => {
    if (ALERT_REQUIRED_COLUMN_IDS.has(columnId)) return;
    setVisibleColumnIds((prev) => {
      const next = checked ? [...prev, columnId] : prev.filter((id) => id !== columnId);
      const unique = new Set(next);
      for (const requiredId of ALERT_REQUIRED_COLUMN_IDS) {
        unique.add(requiredId);
      }
      return ALERT_DEFAULT_COLUMN_IDS.filter((id) => unique.has(id));
    });
  };

  const handleRowsPerPageChange = (value: string) => {
    const parsed = Number(value);
    setRowsPerPage(ALERT_PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : 20);
  };

  const handleBulkStatus = async (status: AlertItem["status"]) => {
    if (!selectedAlertIds.length) return;
    if (!window.confirm(`确认将 ${selectedAlertIds.length} 条告警批量更新为“${getAlertStatusText(status)}”？`)) return;

    try {
      const result = await apiClient.bulkUpdateAlertStatus({
        ids: selectedAlertIds,
        status,
        note: operatorNote,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setOperatorNote("");
      const notFoundText = result.notFoundIds.length ? `，不存在 ${result.notFoundIds.length} 条` : "";
      setMessage(`批量状态更新完成：成功 ${result.updatedCount}/${result.requested}${notFoundText}`);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量状态更新失败");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedAlertIds.length) return;
    if (!window.confirm(`确认批量删除 ${selectedAlertIds.length} 条告警？`)) return;

    try {
      const result = await apiClient.bulkDeleteAlerts({
        ids: selectedAlertIds,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setSelectedAlertIds((prev) => prev.filter((id) => !result.deletedIds.includes(id)));
      if (selectedAlert && result.deletedIds.includes(selectedAlert.id)) {
        setSelectedAlert(null);
      }
      const notFoundText = result.notFoundIds.length ? `，不存在 ${result.notFoundIds.length} 条` : "";
      setMessage(`批量删除完成：成功 ${result.deletedCount}/${result.requested}${notFoundText}`);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量删除失败");
    }
  };

  // 步骤 4：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500">待处理</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{stats.open}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">处理中</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{stats.acknowledged}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">已恢复</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{stats.resolved}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">已关闭</p>
          <p className="mt-1 text-2xl font-semibold text-slate-700">{stats.closed}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="级别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部级别</SelectItem>
                  <SelectItem value="P1">P1</SelectItem>
                  <SelectItem value="P2">P2</SelectItem>
                  <SelectItem value="P3">P3</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="open">待处理</SelectItem>
                  <SelectItem value="acknowledged">处理中</SelectItem>
                  <SelectItem value="resolved">已恢复</SelectItem>
                  <SelectItem value="closed">已关闭</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" className="gap-2" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={() => toggleSelectAllFiltered(!allFilteredSelected)}>
              {allFilteredSelected ? "取消全选当前筛选" : "全选当前筛选"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAlertIds([])}
              disabled={selectedAlertIds.length === 0}
            >
              清空选择
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => handleBulkStatus("acknowledged")}
              disabled={selectedAlertIds.length === 0}
            >
              <Clock3 className="h-4 w-4" />
              批量处理中
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => handleBulkStatus("resolved")}
              disabled={selectedAlertIds.length === 0}
            >
              <Check className="h-4 w-4" />
              批量已恢复
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={handleBulkDelete}
              disabled={selectedAlertIds.length === 0}
            >
              批量删除
            </Button>
            <p className="self-center text-xs text-slate-500">
              已选 {selectedAlertIds.length} 条（当前筛选 {selectedFilteredCount}/{filtered.length}）
            </p>
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
                {ALERT_PAGE_SIZE_OPTIONS.map((size) => (
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
                {ALERT_COLUMN_OPTIONS.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={visibleColumnSet.has(column.id)}
                    disabled={Boolean('required' in column && column.required)}
                    onCheckedChange={(checked) => handleToggleColumn(column.id, checked === true)}
                  >
                    {column.label}
                    {'required' in column && column.required ? "（必选）" : ""}
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
        <Table className="min-w-[1080px]">
          <TableHeader>
            <TableRow>
              <TableHead className={`w-11 min-w-11 px-2 ${stickySelectClass}`}>
                <input
                  type="checkbox"
                  aria-label="select-all-alerts"
                  checked={allFilteredSelected}
                  onChange={(event) => toggleSelectAllFiltered(event.target.checked)}
                />
              </TableHead>
              {visibleColumnSet.has("level") && <TableHead>级别</TableHead>}
              {visibleColumnSet.has("api") && <TableHead className={stickyApiClass}>API</TableHead>}
              {visibleColumnSet.has("rule") && <TableHead>规则</TableHead>}
              {visibleColumnSet.has("message") && <TableHead>告警信息</TableHead>}
              {visibleColumnSet.has("status") && <TableHead>状态</TableHead>}
              {visibleColumnSet.has("triggeredAt") && <TableHead>触发时间</TableHead>}
              {visibleColumnSet.has("updatedAt") && <TableHead>最后更新</TableHead>}
              {visibleColumnSet.has("actions") && <TableHead className={`text-right ${stickyActionClass}`}>操作</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="py-8 text-center text-slate-500">
                  暂无告警数据
                </TableCell>
              </TableRow>
            )}

            {pagedAlerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell className={`px-2 ${stickySelectClass}`}>
                  <input
                    type="checkbox"
                    aria-label={`select-alert-${alert.id}`}
                    checked={selectedAlertIdSet.has(alert.id)}
                    onChange={(event) => toggleSelectAlert(alert.id, event.target.checked)}
                  />
                </TableCell>
                {visibleColumnSet.has("level") && (
                  <TableCell>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${getLevelBadgeClass(alert.level)}`}>
                      {alert.level}
                    </span>
                  </TableCell>
                )}
                {visibleColumnSet.has("api") && (
                  <TableCell className={`font-mono text-xs ${stickyApiClass}`}>{alert.apiPath || alert.apiId}</TableCell>
                )}
                {visibleColumnSet.has("rule") && <TableCell className="text-sm">{alert.ruleName || alert.ruleId}</TableCell>}
                {visibleColumnSet.has("message") && <TableCell className="max-w-sm text-sm text-slate-700">{alert.message}</TableCell>}
                {visibleColumnSet.has("status") && (
                  <TableCell>
                    <span className={`rounded border px-2 py-0.5 text-xs ${getAlertStatusClass(alert.status)}`}>
                      {getAlertStatusText(alert.status)}
                    </span>
                  </TableCell>
                )}
                {visibleColumnSet.has("triggeredAt") && (
                  <TableCell className="text-xs text-slate-500">{formatDateTime(alert.triggeredAt)}</TableCell>
                )}
                {visibleColumnSet.has("updatedAt") && (
                  <TableCell className="text-xs text-slate-500">{formatDateTime(alert.updatedAt)}</TableCell>
                )}
                {visibleColumnSet.has("actions") && (
                  <TableCell className={`text-right ${stickyActionClass}`}>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedAlert(alert)}>
                        <Filter className="h-4 w-4" />
                        详情
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-[560px] overflow-y-auto sm:max-w-[560px]">
                      {selectedAlert && (
                        <>
                          <SheetHeader>
                            <SheetTitle className="flex items-center gap-2">
                              <span className={`rounded px-2 py-1 text-xs ${getLevelBadgeClass(selectedAlert.level)}`}>
                                {selectedAlert.level}
                              </span>
                              告警详情
                            </SheetTitle>
                            <SheetDescription>{selectedAlert.apiPath || selectedAlert.apiId}</SheetDescription>
                          </SheetHeader>

                          <div className="mt-6 space-y-5">
                            <Card className="p-4">
                              <p className="text-sm font-medium">告警信息</p>
                              <p className="mt-2 text-sm text-slate-700">{selectedAlert.message}</p>
                              <div className="mt-3 space-y-1 text-xs text-slate-500">
                                <p>规则: {selectedAlert.ruleName || selectedAlert.ruleId}</p>
                                <p>触发: {formatDateTime(selectedAlert.triggeredAt)}</p>
                                <p>状态: {getAlertStatusText(selectedAlert.status)}</p>
                              </div>
                            </Card>

                            <Card className="p-4">
                              <p className="mb-2 text-sm font-medium">处理备注</p>
                              <Textarea
                                value={operatorNote}
                                onChange={(event) => setOperatorNote(event.target.value)}
                                placeholder="填写处理说明"
                                rows={3}
                              />
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <Button
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => updateStatus("acknowledged")}
                                >
                                  <Clock3 className="h-4 w-4" />
                                  标记处理中
                                </Button>
                                <Button
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => updateStatus("resolved")}
                                >
                                  <Check className="h-4 w-4" />
                                  标记已恢复
                                </Button>
                                <Button variant="outline" onClick={() => updateStatus("open")}>
                                  回退待处理
                                </Button>
                                <Button variant="outline" onClick={() => updateStatus("closed")}>
                                  关闭
                                </Button>
                              </div>
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                <Button variant="outline" onClick={() => updateFeedback("true_positive")}>
                                  真实告警
                                </Button>
                                <Button variant="outline" onClick={() => updateFeedback("false_positive")}>
                                  误报
                                </Button>
                                <Button variant="outline" onClick={() => updateFeedback("noise")}>
                                  噪声
                                </Button>
                              </div>
                              {selectedAlert.feedback && (
                                <p className="mt-2 text-xs text-slate-500">
                                  反馈: {selectedAlert.feedback.label} / {selectedAlert.feedback.by} /{" "}
                                  {formatDateTime(selectedAlert.feedback.at)}
                                </p>
                              )}
                              <Button
                                variant="outline"
                                className="mt-3 w-full gap-2 text-red-600 hover:text-red-700"
                                onClick={deleteAlert}
                              >
                                <Trash2 className="h-4 w-4" />
                                删除告警
                              </Button>
                            </Card>

                            <Card className="p-4">
                              <p className="mb-2 text-sm font-medium">事件轨迹</p>
                              <div className="space-y-2">
                                {selectedAlert.events?.map((event) => (
                                  <div key={event.id} className="rounded border border-slate-200 p-2 text-xs">
                                    <p className="font-medium">{event.type}</p>
                                    <p className="text-slate-600">{event.note}</p>
                                    <p className="text-slate-500">
                                      {event.by} · {formatDateTime(event.at)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          </div>
                        </>
                      )}
                    </SheetContent>
                  </Sheet>
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




