/**
 * @file src/app/components/ui/menubar.tsx
 * 文件作用：前端通用 UI 组件封装，提供一致的交互行为与视觉样式。
 * 维护建议：修改本文件逻辑后，请同步检查关联测试与文档，保证实现与说明一致。
 */

"use client";

import * as React from "react";
import * as MenubarPrimitive from "@radix-ui/react-menubar";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";

import { cn } from "./utils";

/**
 * 符号：Menubar（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function Menubar({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <MenubarPrimitive.Root
      data-slot="menubar"
      className={cn(
        "bg-background flex h-9 items-center gap-1 rounded-md border p-1 shadow-xs",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 符号：MenubarMenu（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarMenu({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />;
}

/**
 * 符号：MenubarGroup（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return <MenubarPrimitive.Group data-slot="menubar-group" {...props} />;
}

/**
 * 符号：MenubarPortal（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarPortal({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />;
}

/**
 * 符号：MenubarRadioGroup（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarRadioGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />
  );
}

/**
 * 符号：MenubarTrigger（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 符号：MenubarContent（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarContent({
  className,
  align = "start",
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <MenubarPortal>
      <MenubarPrimitive.Content
        data-slot="menubar-content"
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[12rem] origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-md",
          className,
        )}
        {...props}
      />
    </MenubarPortal>
  );
}

/**
 * 符号：MenubarItem（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <MenubarPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 符号：MenubarCheckboxItem（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <MenubarPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  );
}

/**
 * 符号：MenubarRadioItem（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioItem>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <MenubarPrimitive.RadioItem
      data-slot="menubar-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  );
}

/**
 * 符号：MenubarLabel（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & {
  inset?: boolean;
}) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <MenubarPrimitive.Label
      data-slot="menubar-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 符号：MenubarSeparator（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <MenubarPrimitive.Separator
      data-slot="menubar-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

/**
 * 符号：MenubarShortcut（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <span
      data-slot="menubar-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 符号：MenubarSub（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarSub({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}

/**
 * 符号：MenubarSubTrigger（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <MenubarPrimitive.SubTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[inset]:pl-8",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto h-4 w-4" />
    </MenubarPrimitive.SubTrigger>
  );
}

/**
 * 符号：MenubarSubContent（function）
 * 作用说明：该符号承载局部核心逻辑，建议从输入、处理、输出三个维度理解。
 * 实现说明：实现路径较直线，主要按顺序执行语句并返回结果。
 * 输入输出：接收函数参数并返回计算结果，建议答辩时明确返回值如何被上游使用。
 * 关联关系：被多个页面复用，提供统一交互语义和样式能力。
 */
function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  // 步骤 1：返回当前结果并结束函数，明确本路径的输出语义。
  return (
    <MenubarPrimitive.SubContent
      data-slot="menubar-sub-content"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg",
        className,
      )}
      {...props}
    />
  );
}

export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
};



