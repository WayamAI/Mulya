import type { Metadata } from "next";
import { HistoryView } from "@/components/history/history-view";

export const metadata: Metadata = {
  title: "Estimate History · Mūlya",
  description:
    "Every estimate run, when and by whom: read from whichever point of view you work in. Open any record to see the full breakdown.",
};

/** /history: estimate runs by day, per role. */
export default function HistoryPage() {
  return <HistoryView />;
}
