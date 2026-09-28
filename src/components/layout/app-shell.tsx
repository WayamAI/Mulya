"use client";

import { useState, type ReactNode } from "react";

import { AppProvider } from "@/lib/app-context";

import { Sidebar } from "./sidebar";
import { TrailProvider } from "./trail-context";
import { TopBar } from "./top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <AppProvider>
      <TrailProvider>
        <div className="flex h-screen w-full overflow-hidden bg-page">
          {navOpen ? (
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
          ) : null}
          <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <TopBar onMenu={() => setNavOpen(true)} />
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-page">{children}</main>
          </div>
        </div>
      </TrailProvider>
    </AppProvider>
  );
}
