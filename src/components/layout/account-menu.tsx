"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { clearSession, DEMO_EMAIL, DEMO_NAME } from "@/lib/auth/session";
import { cx } from "@/lib/format";

const initials = DEMO_NAME.split(" ")
  .map((word) => word[0])
  .join("")
  .slice(0, 2);

/** Operator avatar in the top bar; opens a small menu with the session and Sign out. */
export function AccountMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function signOut() {
    clearSession();
    setOpen(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative ml-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={`Signed in as ${DEMO_NAME}`}
        className="group flex items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 outline-none transition-colors duration-[150ms] hover:bg-action focus-visible:ring-2 focus-visible:ring-active"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-action-primary text-label-sm text-on-color">
          {initials}
        </span>
        <span className="hidden text-label-sm text-secondary group-hover:text-primary lg:inline">{DEMO_NAME}</span>
        <ChevronDown
          size={13}
          strokeWidth={1.75}
          aria-hidden
          className={cx("hidden icon-tertiary transition-transform duration-[150ms] lg:block", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute top-full right-0 z-[60] mt-2 w-64 origin-top-right animate-[dropdown-in_120ms_ease-out] overflow-hidden rounded-xl border border-default bg-container shadow-lg shadow-black/10 motion-reduce:animate-none"
        >
          <div className="flex items-center gap-3 border-b border-muted px-3.5 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-action-primary text-label-sm text-on-color">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-label-md text-primary">{DEMO_NAME}</span>
              <span className="block truncate text-body-sm text-tertiary">{DEMO_EMAIL}</span>
            </span>
          </div>
          <p className="px-3.5 pt-2.5 pb-1 text-caption text-quaternary">Prototype session · browser cookie</p>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-body-md text-secondary outline-none transition-colors duration-[100ms] hover:bg-raised-2 hover:text-primary focus-visible:bg-raised-2 focus-visible:text-primary"
            >
              <LogOut size={15} strokeWidth={1.75} aria-hidden className="icon-tertiary" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
