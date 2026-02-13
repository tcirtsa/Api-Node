/**
 * @file src/app/pages/SettingsPage.tsx
 * 文件作用：前端业务页面，负责状态管理、接口调用与交互渲染。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { useCallback, useEffect, useState } from "react";
import { BellRing, ClipboardList, KeyRound, ShieldCheck, Trash2, Users } from "lucide-react";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { apiClient } from "../lib/api";
import type { AlertPolicy, AuditLogItem, CredentialItem, NotificationRecord, UserItem } from "../lib/types";
import { formatDateTime } from "../lib/format";

/**
 * 符号：SettingsPage（function）
 * 作用说明：该组件是页面级入口，负责拼装子组件与组织页面状态。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
export function SettingsPage() {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [users, setUsers] = useState<UserItem[]>([]);
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [alertPolicy, setAlertPolicy] = useState<AlertPolicy | null>(null);
  const [credentialName, setCredentialName] = useState("");
  const [credentialType, setCredentialType] = useState<CredentialItem["type"]>("bearer");
  const [bearerTokenRef, setBearerTokenRef] = useState("");
  const [apiKeyName, setApiKeyName] = useState("X-API-Key");
  const [apiKeyIn, setApiKeyIn] = useState<"header" | "query">("header");
  const [apiKeyValueRef, setApiKeyValueRef] = useState("");
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPasswordRef, setBasicPasswordRef] = useState("");
  const [customHeaderName, setCustomHeaderName] = useState("Authorization");
  const [customHeaderRef, setCustomHeaderRef] = useState("");
  const [envTemplateText, setEnvTemplateText] = useState("");
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<string[]>([]);
  const [selectedCredentialIds, setSelectedCredentialIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [dispatchingNotifications, setDispatchingNotifications] = useState(false);
  const [dispatchSummary, setDispatchSummary] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      const result = await apiClient.getSettingsOverview({
        auditLimit: 300,
        notificationLimit: 200,
      });

      setUsers(result.users.items);
      setAuditLogs(result.auditLogs.items);
      setNotifications(result.notifications.items);
      setAlertPolicy(result.alertPolicy.item);
      setCredentials(result.credentials.items);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const validIds = new Set(notifications.map((item) => item.id));
    setSelectedNotificationIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [notifications]);

  useEffect(() => {
    const validIds = new Set(credentials.map((item) => item.id));
    setSelectedCredentialIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [credentials]);

  const deleteNotification = async (id: string) => {
    if (!window.confirm("确认删除该通知记录？")) return;

    try {
      await apiClient.deleteNotification(id, localStorage.getItem("api_alert_user") || "admin");
      setSelectedNotificationIds((prev) => prev.filter((item) => item !== id));
      setMessage("通知记录已删除");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "删除通知失败");
    }
  };

  const saveAlertPolicy = async () => {
    if (!alertPolicy) return;

    setSavingPolicy(true);
    try {
      await apiClient.updateAlertPolicy({
        ...alertPolicy,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存策略失败");
    } finally {
      setSavingPolicy(false);
    }
  };

  const dispatchNotificationsNow = async () => {
    setDispatchingNotifications(true);
    try {
      const result = await apiClient.dispatchNotificationsNow(50);
      setDispatchSummary(
        `processed=${result.processed}, sent=${result.sent}, retried=${result.retried}, failed=${result.failed}, queued=${result.queued}`,
      );
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "通知调度失败");
    } finally {
      setDispatchingNotifications(false);
    }
  };

  const createCredential = async () => {
    if (!credentialName.trim()) {
      setError("凭据名称不能为空");
      return;
    }

    let configObj: Record<string, unknown> = {};
    if (credentialType === "bearer") {
      configObj = { tokenRef: bearerTokenRef.trim() };
    } else if (credentialType === "api_key") {
      configObj = {
        key: apiKeyName.trim(),
        in: apiKeyIn,
        valueRef: apiKeyValueRef.trim(),
      };
    } else if (credentialType === "basic") {
      configObj = {
        username: basicUsername.trim(),
        passwordRef: basicPasswordRef.trim(),
      };
    } else {
      configObj = {
        headerRefs: {
          [customHeaderName.trim()]: customHeaderRef.trim(),
        },
      };
    }

    try {
      await apiClient.createCredential({
        name: credentialName.trim(),
        type: credentialType,
        config: configObj,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setCredentialName("");
      setBearerTokenRef("");
      setApiKeyName("X-API-Key");
      setApiKeyIn("header");
      setApiKeyValueRef("");
      setBasicUsername("");
      setBasicPasswordRef("");
      setCustomHeaderName("Authorization");
      setCustomHeaderRef("");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建凭据失败");
    }
  };

  const deleteCredential = async (credential: CredentialItem) => {
    if (!window.confirm(`确认删除凭据 ${credential.name} ?`)) return;
    const force = window.confirm("若被 API 引用，是否强制解绑并删除？");
    try {
      await apiClient.deleteCredential(credential.id, {
        force,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setSelectedCredentialIds((prev) => prev.filter((id) => id !== credential.id));
      setMessage(`已删除凭据 ${credential.name}`);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "删除凭据失败");
    }
  };

  const verifyCredential = async (credential: CredentialItem) => {
    try {
      const result = await apiClient.verifyCredential(credential.id);
      window.alert(result.ok ? `凭据 ${credential.name} 验证通过` : `验证失败: ${result.error || "unknown"}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "验证凭据失败");
    }
  };

  const loadEnvTemplate = async () => {
    try {
      const result = await apiClient.getCredentialEnvTemplate();
      const content = [
        `# prefix: ${result.prefix}`,
        `# missing refs: ${result.missingRefs.join(", ") || "none"}`,
        ...result.lines,
      ].join("\n");
      setEnvTemplateText(content);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载环境变量模板失败");
    }
  };

  const toggleSelectNotification = (id: string, checked: boolean) => {
    setSelectedNotificationIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((item) => item !== id),
    );
  };

  const toggleSelectCredential = (id: string, checked: boolean) => {
    setSelectedCredentialIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((item) => item !== id),
    );
  };

  const toggleSelectAllNotifications = (checked: boolean) => {
    if (!checked) {
      setSelectedNotificationIds([]);
      return;
    }
    setSelectedNotificationIds(notifications.map((item) => item.id));
  };

  const toggleSelectAllCredentials = (checked: boolean) => {
    if (!checked) {
      setSelectedCredentialIds([]);
      return;
    }
    setSelectedCredentialIds(credentials.map((item) => item.id));
  };

  const handleBulkDeleteNotifications = async () => {
    if (!selectedNotificationIds.length) return;
    if (!window.confirm(`确认批量删除 ${selectedNotificationIds.length} 条通知记录？`)) return;

    try {
      const result = await apiClient.bulkDeleteNotifications({
        ids: selectedNotificationIds,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setSelectedNotificationIds((prev) => prev.filter((id) => !result.deletedIds.includes(id)));
      const notFoundText = result.notFoundIds.length ? `，不存在 ${result.notFoundIds.length} 条` : "";
      setMessage(`批量删除通知完成：${result.deletedCount}/${result.requested}${notFoundText}`);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量删除通知失败");
    }
  };

  const handleBulkToggleCredentials = async (enabled: boolean) => {
    if (!selectedCredentialIds.length) return;

    try {
      const result = await apiClient.bulkToggleCredentials({
        ids: selectedCredentialIds,
        enabled,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      const notFoundText = result.notFoundIds.length ? `，不存在 ${result.notFoundIds.length} 条` : "";
      setMessage(`批量${enabled ? "启用" : "禁用"}凭据：${result.updatedCount}/${result.requested}${notFoundText}`);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量切换凭据失败");
    }
  };

  const handleBulkDeleteCredentials = async () => {
    if (!selectedCredentialIds.length) return;
    if (!window.confirm(`确认批量删除 ${selectedCredentialIds.length} 个凭据？`)) return;
    const force = window.confirm("若被 API 引用，是否强制解绑后继续删除？");

    try {
      const result = await apiClient.bulkDeleteCredentials({
        ids: selectedCredentialIds,
        force,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setSelectedCredentialIds((prev) => prev.filter((id) => !result.deletedIds.includes(id)));
      const conflictText = result.conflicts.length ? `，冲突 ${result.conflicts.length} 条` : "";
      const notFoundText = result.notFoundIds.length ? `，不存在 ${result.notFoundIds.length} 条` : "";
      setMessage(`批量删除凭据完成：${result.deletedCount}/${result.requested}${conflictText}${notFoundText}`);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量删除凭据失败");
    }
  };

  const roleStats = users.reduce<Record<string, number>>((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});
  // 步骤 2：执行当前前端业务子步骤，推进页面状态和交互流程。
  const selectedNotificationIdSet = new Set(selectedNotificationIds);
  // 步骤 2：执行当前前端业务子步骤，推进页面状态和交互流程。
  const selectedCredentialIdSet = new Set(selectedCredentialIds);
  const allNotificationsSelected =
    notifications.length > 0 && selectedNotificationIds.length === notifications.length;
  const allCredentialsSelected = credentials.length > 0 && selectedCredentialIds.length === credentials.length;

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">系统设置</h2>
          <p className="mt-1 text-sm text-slate-500">责任人目录、审计日志、通知记录管理</p>
        </div>
        <Button variant="outline" onClick={loadData}>
          刷新数据
        </Button>
      </div>

      {message && <Card className="border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</Card>}
      {error && <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            责任人
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            审计日志
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <BellRing className="h-4 w-4" />
            通知记录
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            责任分布
          </TabsTrigger>
          <TabsTrigger value="credentials" className="gap-2">
            <KeyRound className="h-4 w-4" />
            凭据中心
          </TabsTrigger>
          <TabsTrigger value="noise" className="gap-2">
            <BellRing className="h-4 w-4" />
            告警降噪
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="border-blue-100 bg-blue-50/60 p-3 text-sm text-blue-700">
            责任人目录为只读数据，用于告警归属与审计追踪，不在本系统内新增或删除。
          </Card>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>责任人</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最后登录</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                      暂无责任人数据
                    </TableCell>
                  </TableRow>
                )}
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.status === "active" ? "启用" : "停用"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(user.lastLoginAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>操作人</TableHead>
                  <TableHead>动作</TableHead>
                  <TableHead>目标</TableHead>
                  <TableHead>详情</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && auditLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                      无审计日志
                    </TableCell>
                  </TableRow>
                )}
                {auditLogs.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.user}</TableCell>
                    <TableCell>{item.action}</TableCell>
                    <TableCell className="font-mono text-xs">{item.target}</TableCell>
                    <TableCell className="text-sm text-slate-600">{item.detail}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(item.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="mb-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">{dispatchSummary || "可手动触发通知队列处理（便于演示与排障）"}</div>
              <Button variant="outline" size="sm" onClick={dispatchNotificationsNow} disabled={dispatchingNotifications}>
                {dispatchingNotifications ? "调度中..." : "处理通知队列"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSelectAllNotifications(!allNotificationsSelected)}
              >
                {allNotificationsSelected ? "取消全选" : "全选"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedNotificationIds([])}
                disabled={selectedNotificationIds.length === 0}
              >
                清空选择
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={handleBulkDeleteNotifications}
                disabled={selectedNotificationIds.length === 0}
              >
                批量删除
              </Button>
              <span className="text-xs text-slate-500">已选 {selectedNotificationIds.length} 条</span>
            </div>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="select-all-notifications"
                      checked={allNotificationsSelected}
                      onChange={(event) => toggleSelectAllNotifications(event.target.checked)}
                    />
                  </TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>渠道</TableHead>
                  <TableHead>模式</TableHead>
                  <TableHead>事件</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>重试</TableHead>
                  <TableHead>下次重试</TableHead>
                  <TableHead>告警ID</TableHead>
                  <TableHead>响应</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && notifications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="py-8 text-center text-slate-500">
                      无通知记录
                    </TableCell>
                  </TableRow>
                )}
                {notifications.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`select-notification-${record.id}`}
                        checked={selectedNotificationIdSet.has(record.id)}
                        onChange={(event) => toggleSelectNotification(record.id, event.target.checked)}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(record.createdAt)}</TableCell>
                    <TableCell>{record.channelType}</TableCell>
                    <TableCell className="text-xs">{record.deliveryMode || "-"}</TableCell>
                    <TableCell className="text-xs">{record.eventType || "trigger"}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          record.status === "sent"
                            ? "bg-emerald-100 text-emerald-700"
                            : record.status === "queued"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {record.attempts ?? 0}/{record.maxAttempts ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {record.nextRetryAt ? formatDateTime(record.nextRetryAt) : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{record.alertId || "-"}</TableCell>
                    <TableCell className="text-xs text-slate-500">{record.response}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => deleteNotification(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {Object.entries(roleStats).map(([role, count]) => (
                <div key={role} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium">{role}</p>
                  <p className="mt-1 text-2xl font-semibold">{count}</p>
                  <p className="text-xs text-slate-500">当前角色人数</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="credentials">
          <Card className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>凭据名称</Label>
                <Input value={credentialName} onChange={(event) => setCredentialName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <select
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                  value={credentialType}
                  onChange={(event) => setCredentialType(event.target.value as CredentialItem["type"])}
                >
                  <option value="bearer">bearer</option>
                  <option value="api_key">api_key</option>
                  <option value="basic">basic</option>
                  <option value="custom">custom</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={createCredential}>创建凭据</Button>
              </div>
            </div>
            {credentialType === "bearer" && (
              <div className="space-y-2">
                <Label>tokenRef</Label>
                <Input
                  placeholder="github_token"
                  value={bearerTokenRef}
                  onChange={(event) => setBearerTokenRef(event.target.value)}
                />
              </div>
            )}
            {credentialType === "api_key" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Key 名称</Label>
                  <Input value={apiKeyName} onChange={(event) => setApiKeyName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>位置</Label>
                  <select
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                    value={apiKeyIn}
                    onChange={(event) => setApiKeyIn(event.target.value as "header" | "query")}
                  >
                    <option value="header">header</option>
                    <option value="query">query</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>valueRef</Label>
                  <Input
                    placeholder="partner_key"
                    value={apiKeyValueRef}
                    onChange={(event) => setApiKeyValueRef(event.target.value)}
                  />
                </div>
              </div>
            )}
            {credentialType === "basic" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>username</Label>
                  <Input value={basicUsername} onChange={(event) => setBasicUsername(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>passwordRef</Label>
                  <Input
                    placeholder="demo_pass"
                    value={basicPasswordRef}
                    onChange={(event) => setBasicPasswordRef(event.target.value)}
                  />
                </div>
              </div>
            )}
            {credentialType === "custom" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Header 名称</Label>
                  <Input
                    value={customHeaderName}
                    onChange={(event) => setCustomHeaderName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>headerRef</Label>
                  <Input
                    placeholder="partner_sign"
                    value={customHeaderRef}
                    onChange={(event) => setCustomHeaderRef(event.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadEnvTemplate}>
                  生成环境变量模板
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!envTemplateText) return;
                    void navigator.clipboard.writeText(envTemplateText);
                  }}
                >
                  复制模板
                </Button>
              </div>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-slate-200 p-2 font-mono text-xs"
                value={envTemplateText}
                onChange={(event) => setEnvTemplateText(event.target.value)}
                placeholder="# API_ALERT_SECRET_demo_token="
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSelectAllCredentials(!allCredentialsSelected)}
              >
                {allCredentialsSelected ? "取消全选" : "全选"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCredentialIds([])}
                disabled={selectedCredentialIds.length === 0}
              >
                清空选择
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkToggleCredentials(true)}
                disabled={selectedCredentialIds.length === 0}
              >
                批量启用
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkToggleCredentials(false)}
                disabled={selectedCredentialIds.length === 0}
              >
                批量禁用
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={handleBulkDeleteCredentials}
                disabled={selectedCredentialIds.length === 0}
              >
                批量删除
              </Button>
              <span className="text-xs text-slate-500">已选 {selectedCredentialIds.length} 条</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="select-all-credentials"
                      checked={allCredentialsSelected}
                      onChange={(event) => toggleSelectAllCredentials(event.target.checked)}
                    />
                  </TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>配置(脱敏)</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead>可用性</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && credentials.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-slate-500">
                      无凭据
                    </TableCell>
                  </TableRow>
                )}
                {credentials.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`select-credential-${credential.id}`}
                        checked={selectedCredentialIdSet.has(credential.id)}
                        onChange={(event) => toggleSelectCredential(credential.id, event.target.checked)}
                      />
                    </TableCell>
                    <TableCell>{credential.name}</TableCell>
                    <TableCell>{credential.type}</TableCell>
                    <TableCell>{credential.enabled ? "enabled" : "disabled"}</TableCell>
                    <TableCell className="max-w-[420px] truncate font-mono text-xs">
                      {JSON.stringify(credential.config)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(credential.updatedAt)}</TableCell>
                    <TableCell className="text-xs">
                      {JSON.stringify(credential.secretStatus || {})}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                        onClick={() => verifyCredential(credential)}
                      >
                        验证
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => deleteCredential(credential)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="noise">
          <Card className="p-4">
            {!alertPolicy ? (
              <p className="text-sm text-slate-500">加载中...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>去重窗口(秒)</Label>
                    <Input
                      type="number"
                      value={alertPolicy.dedupWindowSeconds}
                      onChange={(event) =>
                        setAlertPolicy((prev) =>
                          prev ? { ...prev, dedupWindowSeconds: Number(event.target.value) } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>抑制窗口(秒)</Label>
                    <Input
                      type="number"
                      value={alertPolicy.suppressWindowSeconds}
                      onChange={(event) =>
                        setAlertPolicy((prev) =>
                          prev ? { ...prev, suppressWindowSeconds: Number(event.target.value) } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>抖动窗口(分钟)</Label>
                    <Input
                      type="number"
                      value={alertPolicy.flapWindowMinutes}
                      onChange={(event) =>
                        setAlertPolicy((prev) =>
                          prev ? { ...prev, flapWindowMinutes: Number(event.target.value) } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>抖动阈值</Label>
                    <Input
                      type="number"
                      value={alertPolicy.flapThreshold}
                      onChange={(event) =>
                        setAlertPolicy((prev) =>
                          prev ? { ...prev, flapThreshold: Number(event.target.value) } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>自动静默(分钟)</Label>
                    <Input
                      type="number"
                      value={alertPolicy.autoSilenceMinutes}
                      onChange={(event) =>
                        setAlertPolicy((prev) =>
                          prev ? { ...prev, autoSilenceMinutes: Number(event.target.value) } : prev,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>恢复通知</Label>
                    <select
                      className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                      value={alertPolicy.sendRecovery ? "yes" : "no"}
                      onChange={(event) =>
                        setAlertPolicy((prev) =>
                          prev ? { ...prev, sendRecovery: event.target.value === "yes" } : prev,
                        )
                      }
                    >
                      <option value="yes">开启</option>
                      <option value="no">关闭</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>策略启用</Label>
                    <select
                      className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                      value={alertPolicy.enabled ? "yes" : "no"}
                      onChange={(event) =>
                        setAlertPolicy((prev) =>
                          prev ? { ...prev, enabled: event.target.value === "yes" } : prev,
                        )
                      }
                    >
                      <option value="yes">开启</option>
                      <option value="no">关闭</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <Button onClick={saveAlertPolicy} disabled={savingPolicy}>
                    {savingPolicy ? "保存中..." : "保存降噪策略"}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}





