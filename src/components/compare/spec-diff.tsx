"use client";

import { Section } from "@/components/mulya/page";
import { cx, formatNumber } from "@/lib/format";
import { TOOL_NAME } from "./entries";
import type { CompareEntry } from "./types";

interface Attr {
  term: string;
  a: string | null;
  b: string | null;
}

const kg = (value: number | null) => (value == null ? null : `${formatNumber(value, 2)} kg`);

/** “What changed”: attributes side by side, changes highlighted, the rest muted. */
export function SpecDiff({ a, b }: { a: CompareEntry; b: CompareEntry }) {
  const attrs: Attr[] = [
    ...(a.partNumber !== b.partNumber
      ? [{ term: "Part", a: `${a.partName} · ${a.partNumber}`, b: `${b.partName} · ${b.partNumber}` }]
      : []),
    { term: "Revision", a: a.label, b: b.label },
    { term: "Process", a: a.process, b: b.process },
    { term: "Material", a: a.material, b: b.material },
    { term: "Wall / spec", a: a.spec, b: b.spec },
    ...(a.massKg != null || b.massKg != null ? [{ term: "Mass", a: kg(a.massKg), b: kg(b.massKg) }] : []),
    { term: "Tool", a: TOOL_NAME[a.toolKind], b: TOOL_NAME[b.toolKind] },
    { term: "Change note", a: a.note, b: b.note },
  ];

  const changed = attrs.filter((x) => x.a !== x.b).length;

  return (
    <Section title="What changed" count={`${changed} of ${attrs.length}`} bodyClassName="p-0">
      <dl className="grid gap-px bg-[var(--stroke-muted)] lg:grid-cols-2 lg:[&>*:last-child:nth-child(odd)]:col-span-2">
        {attrs.map((attr) => {
          const diff = attr.a !== attr.b;
          return (
            <div
              key={attr.term}
              className={cx(
                "grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-3 px-4 py-2.5",
                diff ? "bg-raised shadow-[inset_2px_0_0_var(--stroke-active)]" : "bg-container",
              )}
            >
              <dt className={cx("text-body-sm", diff ? "text-secondary" : "text-quaternary")}>{attr.term}</dt>
              <dd className="min-w-0 text-body-sm">
                {diff ? (
                  <span className="flex flex-wrap items-baseline gap-x-1.5">
                    {attr.a ? (
                      <s className="text-quaternary decoration-[var(--stroke-default)]">
                        <span className="sr-only">was </span>
                        {attr.a}
                      </s>
                    ) : (
                      <span className="text-quaternary">not recorded</span>
                    )}
                    <span aria-hidden className="text-quaternary">→</span>
                    <span className="text-label-md text-primary">
                      <span className="sr-only">now </span>
                      {attr.b ?? "not recorded"}
                    </span>
                  </span>
                ) : (
                  <span className="text-tertiary">{attr.a ?? "not recorded"}</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </Section>
  );
}
