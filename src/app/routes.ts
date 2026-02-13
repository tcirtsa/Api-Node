/**
 * @file src/app/routes.ts
 * 文件作用：工程源码文件，参与项目运行或构建流程。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { createBrowserRouter } from "react-router";

/**
 * 符号：router（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含异步等待，调用方需要关注超时、重试和并发控制。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export const router = createBrowserRouter([
  {
    path: "/",
    lazy: async () => {
      const module = await import("./layouts/DashboardLayout");
      return { Component: module.DashboardLayout };
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const module = await import("./pages/DashboardPage");
          return { Component: module.DashboardPage };
        },
      },
      {
        path: "api-monitor",
        lazy: async () => {
          const module = await import("./pages/ApiMonitorPage");
          return { Component: module.ApiMonitorPage };
        },
      },
      {
        path: "api-monitor/:id",
        lazy: async () => {
          const module = await import("./pages/ApiDetailPage");
          return { Component: module.ApiDetailPage };
        },
      },
      {
        path: "rules",
        lazy: async () => {
          const module = await import("./pages/RulesPage");
          return { Component: module.RulesPage };
        },
      },
      {
        path: "alerts",
        lazy: async () => {
          const module = await import("./pages/AlertsPage");
          return { Component: module.AlertsPage };
        },
      },
      {
        path: "alert-quality",
        lazy: async () => {
          const module = await import("./pages/AlertQualityPage");
          return { Component: module.AlertQualityPage };
        },
      },
      {
        path: "notification-channels",
        lazy: async () => {
          const module = await import("./pages/NotificationChannelsPage");
          return { Component: module.NotificationChannelsPage };
        },
      },
      {
        path: "settings",
        lazy: async () => {
          const module = await import("./pages/SettingsPage");
          return { Component: module.SettingsPage };
        },
      },
    ],
  },
  {
    path: "*",
    lazy: async () => {
      const module = await import("./pages/NotFoundPage");
      return { Component: module.NotFoundPage };
    },
  },
]);


