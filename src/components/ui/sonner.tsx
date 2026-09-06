"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  RiCheckboxCircleLine,
  RiInformationLine,
  RiErrorWarningLine,
  RiCloseCircleLine,
  RiLoaderLine,
} from "@remixicon/react";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton={true}
      icons={{
        success: <RiCheckboxCircleLine className="size-4 text-emerald-500" />,
        info: <RiInformationLine className="size-4 text-blue-500" />,
        warning: <RiErrorWarningLine className="size-4 text-amber-500" />,
        error: <RiCloseCircleLine className="size-4 text-rose-500" />,
        loading: <RiLoaderLine className="size-4 animate-spin text-primary" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-zinc-950 group-[.toaster]:text-zinc-950 dark:group-[.toaster]:text-zinc-50 group-[.toaster]:border-zinc-200 dark:group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-2xl font-sans",
          title: "group-[.toast]:text-zinc-950 dark:group-[.toast]:text-zinc-50 font-bold text-sm",
          description: "group-[.toast]:text-indigo-600 dark:group-[.toast]:text-indigo-300 text-xs font-semibold leading-relaxed tracking-wide",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-semibold cursor-pointer",
          cancelButton:
            "group-[.toast]:bg-zinc-100 dark:group-[.toast]:bg-zinc-900 group-[.toast]:text-zinc-700 dark:group-[.toast]:text-zinc-300 cursor-pointer",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
