"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center" // 保持在顶部中间
      duration={2000}
      toastOptions={{
        classNames: {
          // --- 1. 基础面板：完全使用 shadcn CSS 变量，确保明暗模式完美适配 ---
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",

          // --- 2. 状态变体：极简风格，只改变边框颜色和图标颜色，文字保持默认 ---
          // 成功：翠绿 (Emerald)
          success:
            "group-[.toaster]:!border-emerald-500 [&>[data-icon]]:!text-emerald-500",
          // 错误：破坏性红色 (完全复用 shadcn 的 destructive 变量)
          error:
            "group-[.toaster]:!border-destructive [&>[data-icon]]:!text-destructive",
          // 警告：琥珀黄 (Amber)
          warning:
            "group-[.toaster]:!border-amber-500 [&>[data-icon]]:!text-amber-500",
          // 提示：知性蓝 (Blue)
          info:
            "group-[.toaster]:!border-blue-500 [&>[data-icon]]:!text-blue-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }