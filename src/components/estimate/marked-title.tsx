/**
 * Section caption with a small leading 3D mark. The words carry the meaning;
 * the mark only adds identity, so it stays decorative (`alt=""`).
 */

import type { ReactNode } from "react";
import { Mark } from "@/components/ui/mark";
import type { MarkId } from "@/lib/marks";

export function MarkedTitle({ mark, size = 22, children }: { mark: MarkId; size?: number; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Mark id={mark} size={size} />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}
