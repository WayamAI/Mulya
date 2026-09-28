/**
 * Primary navigation. The sidebar and the top-bar breadcrumb trail both read this.
 */

import {
  Bot,
  Box,
  BrainCircuit,
  Columns3,
  History,
  LayoutDashboard,
  Library,
  Plus,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "estimate",
    label: "Estimate",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "New Estimate", href: "/new-estimate", icon: Plus },
      { label: "Part Library", href: "/library", icon: Library },
      { label: "3D Models", href: "/models", icon: Box },
      { label: "Estimate History", href: "/history", icon: History },
      { label: "Compare Estimates", href: "/compare", icon: Columns3 },
    ],
  },
  {
    id: "engine",
    label: "Engine",
    items: [
      { label: "Agents", href: "/agents", icon: Bot },
      { label: "Rate Master", href: "/rates", icon: SlidersHorizontal },
      { label: "Data & Model", href: "/model", icon: BrainCircuit },
    ],
  },
];

/** Routes that are not in the rail but still need a title. */
const HIDDEN_ITEMS: NavItem[] = [
  { label: "Estimate Result", href: "/estimate", icon: LayoutDashboard },
  { label: "Estimate Report", href: "/report", icon: LayoutDashboard },
];

/**
 * Where a hidden route sits in the trail: its parent route and the short
 * crumb label it shows under that parent.
 */
const TRAIL_PARENTS: Record<string, { parent: string; label: string }> = {
  "/estimate": { parent: "/new-estimate", label: "Result" },
  "/report": { parent: "/estimate", label: "Report" },
};

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), ...HIDDEN_ITEMS];

export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function navItemForPath(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.filter((item) => isActive(item.href, pathname)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}

// --- breadcrumb trail ----------------------------------------------------------

export interface TrailCrumb {
  label: string;
  /** Link target; the current page (last crumb) has none. */
  href?: string;
}

/**
 * Breadcrumb trail for a route: group › page › sub-page, e.g.
 * `Estimate › New Estimate › Result`. Pages can append more segments at
 * runtime with `useTrail` (see `@/components/layout/trail-context`).
 */
export function trailForPath(pathname: string): TrailCrumb[] {
  const item = navItemForPath(pathname);
  if (!item) return [{ label: "Mūlya" }];

  const chain: TrailCrumb[] = [];
  let href: string | undefined = item.href;
  let label = TRAIL_PARENTS[item.href]?.label ?? item.label;
  const seen = new Set<string>();
  while (href && !seen.has(href)) {
    seen.add(href);
    chain.unshift({ label, href });
    const parent: { parent: string; label: string } | undefined = TRAIL_PARENTS[href];
    if (!parent) break;
    href = parent.parent;
    const parentItem = ALL_NAV_ITEMS.find((i) => i.href === href);
    label = TRAIL_PARENTS[href]?.label ?? parentItem?.label ?? href;
  }

  const rootHref = chain[0]?.href ?? item.href;
  const group = NAV_GROUPS.find((g) => g.items.some((i) => i.href === rootHref));
  const crumbs = group ? [{ label: group.label }, ...chain] : chain;
  // The current page is not a link.
  const last = crumbs[crumbs.length - 1];
  crumbs[crumbs.length - 1] = { label: last.label };
  return crumbs;
}
