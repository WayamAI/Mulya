import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { PageBody, PageHeader as LayoutPageHeader } from "@/components/layout/page-header";
import { PanelHeader } from "@/components/ui/primitives";
import { cx } from "@/lib/format";

export { PageBody };
/** Chevron glyph the original chunk re-exported for inline use. */
export { ChevronRight };

export interface BreadcrumbItem {
  label: string;
  /** Route to link to; the last crumb usually has none. */
  to?: string;
}

/**
 * Page title block. Wraps the Chronos layout header; a string subtitle becomes
 * the description, a rich one renders in the header's second row.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  info,
  mark,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Optional “i” popover beside the title. */
  info?: ReactNode;
  /** Optional 3D mark beside the title (see `@/components/ui/mark`). */
  mark?: ReactNode;
  /** Extra second-row content (filter chips etc.). */
  children?: ReactNode;
}) {
  const plain = typeof subtitle === "string" || typeof subtitle === "number";
  const rich = !plain && subtitle != null && subtitle !== false;
  return (
    <LayoutPageHeader
      title={title}
      description={plain ? String(subtitle) : undefined}
      info={info}
      mark={mark}
      actions={actions}
    >
      {rich || children ? (
        <div className="flex flex-col gap-3">
          {rich ? <div className="text-body-md text-tertiary">{subtitle}</div> : null}
          {children}
        </div>
      ) : null}
    </LayoutPageHeader>
  );
}

/**
 * Card section with an optional caption header and right-aligned action: the
 * Chronos Panel look. `bodyClassName` replaces the default `p-4` padding when it
 * sets its own padding (e.g. `p-0` for edge-to-edge tables).
 */
export function Section({
  title,
  count,
  action,
  actionHref,
  actionLabel,
  children,
  className,
  bodyClassName,
  inset = false,
}: {
  title?: ReactNode;
  /** Small count pill beside the title. */
  count?: ReactNode;
  action?: ReactNode;
  /** Renders a “View all →” link in the header (label via `actionLabel`). */
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Nested card weight (rounded-lg) instead of top-level (rounded-xl). */
  inset?: boolean;
}) {
  const ownPadding = /(^|\s)p[xytrbl]?-/.test(bodyClassName ?? "");
  return (
    <section
      className={cx(
        "min-w-0 overflow-hidden border border-muted bg-container",
        inset ? "rounded-lg" : "rounded-xl",
        className,
      )}
    >
      {title || action || actionHref ? (
        <PanelHeader title={title} count={count} action={action} actionHref={actionHref} actionLabel={actionLabel} />
      ) : null}
      <div className={cx(!ownPadding && "p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * Convenience composition: header + scroll body with the standard vertical
 * rhythm.
 */
export function Page({
  title,
  subtitle,
  actions,
  info,
  mark,
  header,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  info?: ReactNode;
  /** Optional 3D mark beside the title. */
  mark?: ReactNode;
  /** @deprecated Ignored: the top bar shows the trail. */
  breadcrumbs?: BreadcrumbItem[];
  /** Second header row. */
  header?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={actions} info={info} mark={mark}>
        {header}
      </PageHeader>
      <PageBody>
        <div className="flex flex-col gap-4">
          {children}
        </div>
      </PageBody>
    </>
  );
}
