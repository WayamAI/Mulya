import Link from "next/link";

/**
 * Mūlya brand. The mark is the orange tile shared with the Chronos family;
 * the wordmark is set in the display face so it needs no light/dark lockups.
 */
export function Logo({
  wordmark = false,
  className = "",
  href = "/",
}: {
  wordmark?: boolean;
  className?: string;
  href?: string | false;
}) {
  const mark = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG mark, nothing to optimise */}
      <img src="/brand/mulya-mark.svg" alt="" width={32} height={32} className="size-8 shrink-0 rounded-[10px]" />
      {wordmark ? (
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-display text-display-lg tracking-[0.04em] text-primary">MŪLYA</span>
          <span lang="sa" className="text-body-sm text-quaternary">
            मूल्य
          </span>
        </span>
      ) : null}
    </>
  );

  const frame = `flex min-w-0 items-center gap-2.5 ${className}`;

  if (!href) return <span className={frame}>{mark}</span>;

  return (
    <Link
      href={href}
      aria-label="Mūlya home"
      className={`${frame} outline-none focus-visible:ring-2 focus-visible:ring-active`}
    >
      {mark}
    </Link>
  );
}
