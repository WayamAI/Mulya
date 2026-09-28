import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "@/components/compare/compare-view";

export const metadata: Metadata = {
  title: "Compare Estimates · Mūlya",
  description:
    "Compare any two estimates: revision against revision, or a new estimate against what is on file. See the verdict, the cost walk and every line.",
};

/** /compare?a=<id>&b=<id>: baseline A against candidate B. */
export default function ComparePage() {
  return (
    <Suspense>
      <CompareView />
    </Suspense>
  );
}
