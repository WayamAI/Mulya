"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "./app-shell";

/** Login is a full-bleed surface. Everything else sits in the workbench chrome. */
export function ShellGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The static export serves trailing-slash URLs, so /login arrives as /login/.
  if (pathname.replace(/\/$/, "") === "/login") return children;
  return <AppShell>{children}</AppShell>;
}
