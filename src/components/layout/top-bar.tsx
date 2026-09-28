"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useSyncExternalStore } from "react";

import { Dropdown, type DropdownOption } from "@/components/ui/dropdown";
import { SearchInput } from "@/components/ui/field";
import { useApp } from "@/lib/app-context";
import { CURRENCIES, cx, type Currency } from "@/lib/format";

const CURRENCY_NAMES: Record<Currency, string> = {
  EUR: "Euro",
  USD: "US dollar",
  GBP: "Pound sterling",
};

/** Estimates are stored in EUR; the menu shows the fixed demo rate each currency converts at. */
const CURRENCY_OPTIONS: DropdownOption<Currency>[] = (Object.keys(CURRENCIES) as Currency[]).map((code) => ({
  value: code,
  label: `${code} ${CURRENCIES[code].symbol}`,
  text: `${code} ${CURRENCY_NAMES[code]}`,
  description: CURRENCY_NAMES[code],
  meta: code === "EUR" ? "base" : `× ${CURRENCIES[code].rate.toFixed(2)}`,
}));
import { trailForPath, type TrailCrumb } from "@/lib/navigation";

import { AccountMenu } from "./account-menu";
import { SidebarMenuButton } from "./sidebar";
import { useTrailExtra } from "./trail-context";

/**
 * Breadcrumb trail: group (caption) › page › sub-page. The page itself owns
 * the big title, so the bar only says where you are. Below `sm` only the
 * current crumb shows.
 */
function Trail({ crumbs }: { crumbs: TrailCrumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          const isGroup = index === 0 && crumbs.length > 1 && !crumb.href;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 ? (
                <li aria-hidden className="hidden shrink-0 icon-quaternary sm:block">
                  <ChevronRight size={13} strokeWidth={1.75} />
                </li>
              ) : null}
              <li className={cx("min-w-0", last ? "flex" : "hidden shrink-0 sm:flex")}>
                {last ? (
                  <span aria-current="page" className="truncate text-label-md text-primary">
                    {crumb.label}
                  </span>
                ) : isGroup ? (
                  <span className="text-caption tracking-[0.08em] text-quaternary uppercase">{crumb.label}</span>
                ) : crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="rounded-sm text-label-sm whitespace-nowrap text-tertiary transition-colors duration-[150ms] outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-active"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-label-sm whitespace-nowrap text-tertiary">{crumb.label}</span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Where you are, part search, display currency and the operator.
 */
export function TopBar({ onMenu }: { onMenu?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currency, setCurrency } = useApp();
  const searchRef = useRef<HTMLInputElement>(null);
  const extra = useTrailExtra();

  const isMac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );

  const base = trailForPath(pathname);
  const crumbs: TrailCrumb[] = extra.length
    ? [
        ...base.slice(0, -1),
        // The route's own page becomes a link once a page adds sub-crumbs.
        { label: base[base.length - 1].label, href: pathname },
        ...extra.map((crumb, i) => (i === extra.length - 1 ? { label: crumb.label } : crumb)),
      ]
    : base;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-muted bg-page px-4 sm:gap-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        {onMenu ? <SidebarMenuButton onClick={onMenu} /> : null}
        <Trail crumbs={crumbs} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label className="hidden md:block">
          <span className="sr-only">Search parts</span>
          <SearchInput
            ref={searchRef}
            size="sm"
            surface="action"
            placeholder="Search parts, numbers, programmes…"
            shortcut={`${isMac ? "⌘" : "Ctrl"} K`}
            onKeyDown={(event) => {
              if (event.key === "Enter") router.push("/library");
            }}
            className="w-[min(22rem,32vw)]"
          />
        </label>

        <span
          title="Cost model version · figures are illustrative"
          className="hidden h-8 items-center gap-2 rounded-full border border-muted bg-action px-3 text-label-sm text-tertiary xl:inline-flex"
        >
          <span className="size-1.5 rounded-full bg-info-icon" aria-hidden />
          Model v0.1 · illustrative
        </span>

        <Dropdown<Currency>
          aria-label="Currency"
          title="Display currency"
          value={currency}
          onChange={setCurrency}
          options={CURRENCY_OPTIONS}
          size="sm"
          shape="pill"
          surface="action"
          align="end"
          menuMinWidth={232}
          className="w-[5.75rem]"
          renderValue={() => (
            <span className="text-label-sm tabular text-secondary">
              {currency} {CURRENCIES[currency].symbol}
            </span>
          )}
        />

        <AccountMenu />
      </div>
    </header>
  );
}
