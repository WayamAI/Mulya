"use client";

import { Menu, Moon, PanelLeftClose, PanelLeftOpen, SunMedium } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useTheme } from "@/context/theme-context";
import { NAV_GROUPS, isActive } from "@/lib/navigation";

import { Logo } from "./logo";
import { SidebarItem, SidebarTreeLabel } from "./sidebar-item";

/**
 * Primary navigation. Two short groups, so every destination stays visible
 * without a tree. Collapsed (68px) shows the pucks only.
 */
export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const { isDark, toggleTheme } = useTheme();
  const showExpanded = expanded || open;

  return (
    <aside
      aria-label="Primary"
      data-expanded={showExpanded}
      className={[
        "flex h-full shrink-0 flex-col border-r border-muted bg-container",
        "transition-[width,transform] duration-200 ease-out",
        "fixed inset-y-0 left-0 z-50 lg:relative lg:z-30 lg:translate-x-0",
        showExpanded ? "w-[252px]" : "w-[68px]",
        open ? "translate-x-0" : "-translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-14 shrink-0 items-center border-b border-muted",
          showExpanded ? "gap-2.5 px-4" : "justify-center",
        ].join(" ")}
      >
        <Logo wordmark={showExpanded} />
      </div>

      <nav
        aria-label="Main navigation"
        className={[
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-3",
          showExpanded ? "px-3" : "px-[14px]",
        ].join(" ")}
      >
        {NAV_GROUPS.map((group, index) => (
          <div key={group.id} className={index > 0 ? "mt-3 border-t border-muted pt-3" : undefined}>
            {showExpanded ? <SidebarTreeLabel className="pb-2">{group.label}</SidebarTreeLabel> : null}
            <ul className="flex flex-col gap-1.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <SidebarItem
                    icon={item.icon}
                    label={item.label}
                    href={item.href}
                    active={isActive(item.href, pathname)}
                    expanded={showExpanded}
                    onNavigate={onClose}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className={[
          "flex shrink-0 flex-col gap-1.5 border-t border-muted py-3",
          showExpanded ? "px-3" : "px-[14px]",
        ].join(" ")}
      >
        <div className="hidden lg:contents">
          <SidebarItem
            icon={showExpanded ? PanelLeftClose : PanelLeftOpen}
            label={showExpanded ? "Collapse sidebar" : "Expand sidebar"}
            onClick={() => setExpanded((v) => !v)}
            expanded={showExpanded}
          />
        </div>
        <SidebarItem
          icon={isDark ? SunMedium : Moon}
          label={isDark ? "Switch to light" : "Switch to dark"}
          onClick={toggleTheme}
          expanded={showExpanded}
        />
        {showExpanded ? <p className="px-3 pt-1.5 text-caption text-quaternary">Model v0.1 · illustrative</p> : null}
      </div>
    </aside>
  );
}

/** Mobile-only control lives in the top bar, not the rail. */
export function SidebarMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open navigation"
      className="flex size-8 items-center justify-center rounded-full bg-action icon-tertiary outline-none transition-colors duration-[180ms] hover:bg-raised-2 hover:icon-secondary focus-visible:ring-2 focus-visible:ring-active lg:hidden"
    >
      <Menu size={16} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
