/**
 * @file src/app/layouts/DashboardLayout.tsx
 * 文件作用：前端布局文件，负责页面骨架、导航结构与容器组织。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

import { Link, Outlet, useLocation } from "react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Settings,
  User,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";

/**
 * 符号：TEXT（const）
 * 作用说明：该常量用于集中管理配置值或枚举项，避免魔法值散落。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
const TEXT = {
  overview: "\u603B\u89C8",
  apiMonitor: "API \u76D1\u63A7",
  rules: "\u89C4\u5219\u5F15\u64CE",
  alerts: "\u544A\u8B66\u4E2D\u5FC3",
  channels: "\u901A\u77E5\u6E20\u9053",
  quality: "\u8D28\u91CF\u62A5\u8868",
  settings: "\u7CFB\u7EDF\u8BBE\u7F6E",
  appTitle: "\u89C4\u5219\u5F15\u64CE\u544A\u8B66\u5E73\u53F0",
  appSubTitle: "Node Full Stack",
  defaultTitle: "API \u9884\u8B66\u7CFB\u7EDF",
  switchActorPrompt: "\u8BF7\u8F93\u5165\u64CD\u4F5C\u4EBA\u540D\u79F0\uFF08\u7528\u4E8E\u5BA1\u8BA1\u8BB0\u5F55\uFF09",
  actorIdentity: "\u64CD\u4F5C\u4EBA\u8EAB\u4EFD\uFF08\u5BA1\u8BA1\u7528\u9014\uFF09",
  switchActor: "\u5207\u6362\u64CD\u4F5C\u4EBA",
  serviceRunning: "\u670D\u52A1\u8FD0\u884C\u4E2D",
  core: "Core",
  advanced: "Advanced",
  collapseSidebar: "\u6536\u8D77\u4FA7\u680F",
  expandSidebar: "\u5C55\u5F00\u4FA7\u680F",
  toggleAdvanced: "\u5C55\u5F00/\u6536\u8D77\u9AD8\u7EA7\u83DC\u5355",
} as const;

/**
 * 符号：coreNavItems（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
const coreNavItems = [
  { path: "/", label: TEXT.overview, icon: LayoutDashboard },
  { path: "/api-monitor", label: TEXT.apiMonitor, icon: Activity },
  { path: "/rules", label: TEXT.rules, icon: Zap },
  { path: "/alerts", label: TEXT.alerts, icon: AlertTriangle },
  { path: "/notification-channels", label: TEXT.channels, icon: Bell },
];

/**
 * 符号：advancedNavItems（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
const advancedNavItems = [
  { path: "/alert-quality", label: TEXT.quality, icon: BarChart3 },
  { path: "/settings", label: TEXT.settings, icon: Settings },
];

/**
 * 符号：allNavItems（const）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
const allNavItems = [...coreNavItems, ...advancedNavItems];

/**
 * 符号：DashboardLayout（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现中包含条件分支，用于按业务场景走不同处理路径。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：与同目录/同层模块协同，建议结合 import 列表理解依赖方向。
 */
export function DashboardLayout() {
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const location = useLocation();
  // 步骤 1：执行当前前端业务子步骤，推进页面状态和交互流程。
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(() => {
    const raw = localStorage.getItem("api_alert_sidebar_collapsed");
    return raw === "true";
  });
  const [username, setUsername] = useState(
    () => localStorage.getItem("api_alert_user") || "operator",
  );
  const [showAdvanced, setShowAdvanced] = useState(() => {
    const raw = localStorage.getItem("api_alert_show_advanced");
    if (raw === "true") return true;
    if (raw === "false") return false;
    return false;
  });

  useEffect(() => {
    const inAdvanced = advancedNavItems.some((item) => location.pathname.startsWith(item.path));
    if (inAdvanced) {
      setShowAdvanced((prev) => (prev ? prev : true));
    }
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem("api_alert_sidebar_collapsed", String(isDesktopSidebarCollapsed));
  }, [isDesktopSidebarCollapsed]);

  const title = useMemo(() => {
    const current = allNavItems.find((item) =>
      item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path),
    );
    return current?.label ?? TEXT.defaultTitle;
  }, [location.pathname]);

  const handleSwitchActor = () => {
    const next = window.prompt(TEXT.switchActorPrompt, username) || "";
    const value = next.trim();
    if (!value) return;
    localStorage.setItem("api_alert_user", value);
    setUsername(value);
  };

  const toggleAdvanced = () => {
    setShowAdvanced((prev) => {
      const next = !prev;
      localStorage.setItem("api_alert_show_advanced", String(next));
      return next;
    });
  };

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarCollapsed((prev) => !prev);
  };

  const renderNavLink = (item: (typeof allNavItems)[number]) => {
    const isActive =
      item.path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(item.path);

    return (
      <Link
        key={item.path}
        to={item.path}
        title={item.label}
        className={`flex items-center rounded-xl font-medium transition-colors ${
          isDesktopSidebarCollapsed
            ? "justify-center px-2 py-3"
            : "gap-3 px-4 py-3 text-[15px]"
        } ${
          isActive
            ? "bg-blue-600 text-white"
            : "text-slate-700 hover:bg-slate-100"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <item.icon className="h-[18px] w-[18px]" />
        {!isDesktopSidebarCollapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  // 步骤 2：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="app-orb app-orb-a" />
        <div className="app-orb app-orb-b" />
      </div>

      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm lg:hidden"
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 border-r border-slate-200 bg-white/95 backdrop-blur transition-all duration-300 ${
          isMobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full w-72 lg:translate-x-0"
        } ${isDesktopSidebarCollapsed ? "lg:w-20" : "lg:w-72"}`}
      >
        <div className={`flex h-20 items-center border-b border-slate-200 ${isDesktopSidebarCollapsed ? "justify-center px-2" : "gap-3 px-6"}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Zap className="h-5 w-5" />
          </div>
          {!isDesktopSidebarCollapsed && (
            <div>
              <p className="text-base font-semibold">{TEXT.appTitle}</p>
              <p className="text-sm text-slate-500">{TEXT.appSubTitle}</p>
            </div>
          )}
        </div>

        <nav className={`space-y-2 ${isDesktopSidebarCollapsed ? "px-2 py-4" : "p-4"}`}>
          {!isDesktopSidebarCollapsed && (
            <div className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {TEXT.core}
            </div>
          )}
          <div className="space-y-1">{coreNavItems.map(renderNavLink)}</div>

          <button
            type="button"
            title={TEXT.toggleAdvanced}
            className={`mt-2 flex w-full items-center rounded-lg text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-100 ${
              isDesktopSidebarCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2"
            }`}
            onClick={toggleAdvanced}
          >
            {!isDesktopSidebarCollapsed && <span>{TEXT.advanced}</span>}
            {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {showAdvanced && <div className="space-y-1">{advancedNavItems.map(renderNavLink)}</div>}
        </nav>

        <div className={`absolute bottom-0 left-0 right-0 border-t border-slate-200 ${isDesktopSidebarCollapsed ? "p-2" : "p-4"}`}>
          <div className={`mb-3 flex items-center rounded-xl bg-slate-50 ${isDesktopSidebarCollapsed ? "justify-center p-2.5" : "gap-3 p-3.5"}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <User className="h-4 w-4" />
            </div>
            {!isDesktopSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{username}</p>
                <p className="truncate text-sm text-slate-500">{TEXT.actorIdentity}</p>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            title={TEXT.switchActor}
            className={isDesktopSidebarCollapsed ? "w-full justify-center px-0" : "w-full gap-2"}
            onClick={handleSwitchActor}
          >
            <User className="h-4 w-4" />
            {!isDesktopSidebarCollapsed && <span>{TEXT.switchActor}</span>}
          </Button>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="close-sidebar"
        />
      )}

      <div className={`relative transition-all duration-300 ${isDesktopSidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-[72px] items-center justify-between px-4 pl-14 lg:px-8 lg:pl-8 xl:px-10 xl:pl-10">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hidden lg:inline-flex"
                onClick={toggleDesktopSidebar}
                title={isDesktopSidebarCollapsed ? TEXT.expandSidebar : TEXT.collapseSidebar}
              >
                {isDesktopSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{title}</h1>
                <p className="text-sm text-slate-500">
                  {new Date().toLocaleString("zh-CN", { hour12: false })}
                </p>
              </div>
            </div>
            <div className="rounded-full bg-emerald-100 px-3.5 py-1.5 text-sm font-medium text-emerald-700">
              <span>{TEXT.serviceRunning}</span>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
          <div className="mx-auto w-full max-w-[1600px] page-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}




