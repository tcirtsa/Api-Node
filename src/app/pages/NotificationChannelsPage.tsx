/**
 * @file src/app/pages/NotificationChannelsPage.tsx
 * 文件作用：前端业务页面，负责状态管理、接口调用与交互渲染。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

﻿import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, MessageSquare, Plus, Save, Send, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { apiClient } from "../lib/api";
import type { ChannelItem } from "../lib/types";
import { formatDateTime } from "../lib/format";

const iconByType: Record<string, typeof BellRing> = {
  email: BellRing,
  webhook: MessageSquare,
  slack: MessageSquare,
  sms: MessageSquare,
  wechat: MessageSquare,
};

/**
 * 符号：NotificationChannelsPage（function）
 * 作用说明：该组件是页面级入口，负责拼装子组件与组织页面状态。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：通过 apiClient 调用后端接口，并驱动页面组件状态更新。
 */
export function NotificationChannelsPage() {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [configText, setConfigText] = useState("{}");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState("webhook");
  const [createName, setCreateName] = useState("");
  const [createConfigText, setCreateConfigText] = useState('{ "deliveryMode": "mock" }');

  useEffect(() => {
    if (!createOpen) return;
    if (createType === "email") {
      setCreateConfigText(
        JSON.stringify(
          {
            deliveryMode: "mock",
            recipients: ["ops@example.com"],
          },
          null,
          2,
        ),
      );
      return;
    }
    if (createType === "webhook") {
      setCreateConfigText(
        JSON.stringify(
          {
            deliveryMode: "mock",
            url: "https://example.com/webhook",
            method: "POST",
          },
          null,
          2,
        ),
      );
      return;
    }
    if (createType === "slack") {
      setCreateConfigText(
        JSON.stringify(
          {
            deliveryMode: "mock",
            webhookUrl: "https://hooks.slack.com/services/EXAMPLE",
          },
          null,
          2,
        ),
      );
      return;
    }
    if (createType === "wechat") {
      setCreateConfigText(
        JSON.stringify(
          {
            deliveryMode: "mock",
            webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=EXAMPLE",
          },
          null,
          2,
        ),
      );
      return;
    }
    if (createType === "sms") {
      setCreateConfigText(
        JSON.stringify(
          {
            deliveryMode: "mock",
            recipients: ["+10000000000"],
          },
          null,
          2,
        ),
      );
    }
  }, [createOpen, createType]);

  const loadChannels = useCallback(async () => {
    try {
      const result = await apiClient.listChannels();
      setChannels(result.items);
      const hasSelected = result.items.some((item) => item.id === selectedChannelId);
      if ((!selectedChannelId || !hasSelected) && result.items.length > 0) {
        setSelectedChannelId(result.items[0].id);
        setConfigText(JSON.stringify(result.items[0].config, null, 2));
      }
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载失败");
    }
  }, [selectedChannelId]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId],
  );
  // 步骤 2：执行当前前端业务子步骤，推进页面状态和交互流程。
  const selectedChannelIdSet = useMemo(() => new Set(selectedChannelIds), [selectedChannelIds]);
  const allChannelsSelected = channels.length > 0 && selectedChannelIds.length === channels.length;

  useEffect(() => {
    if (selectedChannel) {
      setConfigText(JSON.stringify(selectedChannel.config, null, 2));
    }
  }, [selectedChannel]);

  useEffect(() => {
    const validIds = new Set(channels.map((channel) => channel.id));
    setSelectedChannelIds((prev) => prev.filter((id) => validIds.has(id)));
    if (selectedChannelId && !validIds.has(selectedChannelId)) {
      setSelectedChannelId("");
    }
  }, [channels, selectedChannelId]);

  const handleToggle = async (channel: ChannelItem, enabled: boolean) => {
    try {
      await apiClient.updateChannel(channel.id, {
        enabled,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setMessage(`${channel.name} 已${enabled ? "启用" : "禁用"}`);
      await loadChannels();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新失败");
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedChannel) return;

    try {
      const parsed = JSON.parse(configText) as Record<string, unknown>;
      await apiClient.updateChannel(selectedChannel.id, {
        config: parsed,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setMessage(`${selectedChannel.name} 配置已保存`);
      await loadChannels();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "配置 JSON 非法");
    }
  };

  const handleTest = async () => {
    if (!selectedChannel) return;

    try {
      const result = await apiClient.testChannel(
        selectedChannel.id,
        localStorage.getItem("api_alert_user") || "admin",
      );

      setMessage(`测试完成：${result.item.status} (${formatDateTime(result.item.createdAt)})`);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "测试失败");
    }
  };

  const handleDeleteChannel = async () => {
    if (!selectedChannel) return;
    if (!window.confirm(`确认删除通知渠道 ${selectedChannel.name} ?`)) return;

    const force = window.confirm("如果该渠道被规则引用，是否自动从规则动作中移除并强制删除？");

    try {
      await apiClient.deleteChannel(selectedChannel.id, {
        force,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setSelectedChannelIds((prev) => prev.filter((id) => id !== selectedChannel.id));
      setSelectedChannelId("");
      await loadChannels();
      setMessage(`已删除渠道 ${selectedChannel.name}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "删除失败");
    }
  };

  const handleCreateChannel = async () => {
    if (!createName.trim()) {
      setError("渠道名称不能为空");
      return;
    }
    try {
      const parsed = JSON.parse(createConfigText || "{}") as Record<string, unknown>;
      const result = await apiClient.createChannel({
        type: createType,
        name: createName.trim(),
        enabled: true,
        config: parsed,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setCreateOpen(false);
      setCreateName("");
      setCreateConfigText('{ "deliveryMode": "mock" }');
      setSelectedChannelId(result.item.id);
      setMessage(`已新增渠道 ${result.item.name}`);
      await loadChannels();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建渠道失败");
    }
  };

  const toggleSelectChannel = (channelId: string, checked: boolean) => {
    setSelectedChannelIds((prev) =>
      checked ? (prev.includes(channelId) ? prev : [...prev, channelId]) : prev.filter((id) => id !== channelId),
    );
  };

  const toggleSelectAllChannels = (checked: boolean) => {
    if (!checked) {
      setSelectedChannelIds([]);
      return;
    }
    setSelectedChannelIds(channels.map((channel) => channel.id));
  };

  const handleBulkToggleChannels = async (enabled: boolean) => {
    if (!selectedChannelIds.length) return;
    try {
      const result = await apiClient.bulkToggleChannels({
        ids: selectedChannelIds,
        enabled,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      const notFoundText = result.notFoundIds.length ? `，不存在 ${result.notFoundIds.length} 项` : "";
      setMessage(`批量${enabled ? "启用" : "禁用"}完成：${result.updatedCount}/${result.requested}${notFoundText}`);
      await loadChannels();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量切换失败");
    }
  };

  const handleBulkDeleteChannels = async () => {
    if (!selectedChannelIds.length) return;
    if (!window.confirm(`确认批量删除 ${selectedChannelIds.length} 个通知渠道？`)) return;
    const force = window.confirm("若渠道被规则引用，是否自动从规则动作中移除并继续删除？");

    try {
      const result = await apiClient.bulkDeleteChannels({
        ids: selectedChannelIds,
        force,
        actor: localStorage.getItem("api_alert_user") || "admin",
      });
      setSelectedChannelIds((prev) => prev.filter((id) => !result.deletedIds.includes(id)));
      if (selectedChannelId && result.deletedIds.includes(selectedChannelId)) {
        setSelectedChannelId("");
      }
      const conflictText = result.conflicts.length ? `，冲突 ${result.conflicts.length} 项` : "";
      const notFoundText = result.notFoundIds.length ? `，不存在 ${result.notFoundIds.length} 项` : "";
      setMessage(`批量删除完成：${result.deletedCount}/${result.requested}${conflictText}${notFoundText}`);
      await loadChannels();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量删除失败");
    }
  };

  // 步骤 3：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">通知渠道配置</h2>
            <p className="mt-1 text-sm text-slate-500">对接邮件、Webhook、Slack、短信等渠道。</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                新增渠道
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新增通知渠道</DialogTitle>
                <DialogDescription>可创建多个同类型渠道，用于多目的地同时通知。</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>渠道类型</Label>
                  <select
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                    value={createType}
                    onChange={(event) => setCreateType(event.target.value)}
                  >
                    <option value="email">email</option>
                    <option value="webhook">webhook</option>
                    <option value="slack">slack</option>
                    <option value="sms">sms</option>
                    <option value="wechat">wechat</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>渠道名称</Label>
                  <Input value={createName} onChange={(event) => setCreateName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>配置 JSON</Label>
                  <Textarea
                    rows={8}
                    value={createConfigText}
                    onChange={(event) => setCreateConfigText(event.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateChannel}>创建</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => toggleSelectAllChannels(!allChannelsSelected)}>
              {allChannelsSelected ? "取消全选" : "全选"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedChannelIds([])}
              disabled={selectedChannelIds.length === 0}
            >
              清空选择
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkToggleChannels(true)}
              disabled={selectedChannelIds.length === 0}
            >
              批量启用
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkToggleChannels(false)}
              disabled={selectedChannelIds.length === 0}
            >
              批量禁用
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={handleBulkDeleteChannels}
              disabled={selectedChannelIds.length === 0}
            >
              批量删除
            </Button>
            <span className="text-xs text-slate-500">已选 {selectedChannelIds.length} 个渠道</span>
          </div>
        </Card>
      </div>

      {message && <Card className="border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</Card>}
      {error && <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <div className="border-b p-4">
            <h3 className="font-semibold">渠道列表</h3>
          </div>

          <div className="space-y-2 p-3">
            {channels.map((channel) => {
              const Icon = iconByType[channel.type] || BellRing;
              return (
                <div key={channel.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2">
                  <input
                    className="mt-3"
                    type="checkbox"
                    aria-label={`select-channel-${channel.id}`}
                    checked={selectedChannelIdSet.has(channel.id)}
                    onChange={(event) => toggleSelectChannel(channel.id, event.target.checked)}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={`flex-1 rounded-lg border p-3 text-left transition ${
                      channel.id === selectedChannelId
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{channel.name}</p>
                          <p className="text-xs text-slate-500">{channel.type}</p>
                        </div>
                      </div>
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={(checked) => handleToggle(channel, checked as boolean)}
                      />
                    </div>

                    <div className="mt-2 text-xs">
                      {channel.enabled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          已启用
                        </span>
                      ) : (
                        <span className="text-slate-500">已禁用</span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 xl:col-span-2">
          {!selectedChannel ? (
            <p className="text-sm text-slate-500">请选择渠道</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedChannel.name}</h3>
                  <p className="text-xs text-slate-500">type: {selectedChannel.type}</p>
                </div>
                <span
                  className={`rounded px-2 py-1 text-xs ${
                    selectedChannel.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {selectedChannel.enabled ? "enabled" : "disabled"}
                </span>
              </div>

              <div className="space-y-2">
                <Label>配置 JSON</Label>
                <Textarea
                  rows={16}
                  value={configText}
                  onChange={(event) => setConfigText(event.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  className="gap-2 text-red-600 hover:text-red-700"
                  onClick={handleDeleteChannel}
                >
                  <Trash2 className="h-4 w-4" />
                  删除渠道
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleTest}>
                  <Send className="h-4 w-4" />
                  发送测试
                </Button>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleSaveConfig}>
                  <Save className="h-4 w-4" />
                  保存配置
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}




