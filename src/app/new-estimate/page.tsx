import type { Metadata } from "next";
import { NewEstimateView } from "@/components/new-estimate/new-estimate-view";

export const metadata: Metadata = {
  title: "New Estimate · Mūlya",
  description:
    "Upload a STEP file or pick a sample part. Seven agents read the model, recommend a process, and cost the route you confirm.",
  openGraph: {
    title: "New Estimate · Mūlya",
    description: "Read a part, confirm the process, and cost it: tooling, confidence and a supplier pack included.",
  },
};

/** /new-estimate: the core estimating flow. */
export default function NewEstimatePage() {
  return <NewEstimateView />;
}
