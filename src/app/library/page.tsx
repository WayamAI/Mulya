import type { Metadata } from "next";
import { LibraryView } from "@/components/library/library-view";

export const metadata: Metadata = {
  title: "Part Library · Mūlya",
  description:
    "Browse 50 truck parts with their latest cost estimate, target, variance and status. Filter by process, material, programme, status and region.",
  openGraph: {
    title: "Part Library · Mūlya",
    description: "Every part with its latest should-cost estimate and target variance.",
  },
};

/** /library: the part catalogue. */
export default function LibraryPage() {
  return <LibraryView />;
}
