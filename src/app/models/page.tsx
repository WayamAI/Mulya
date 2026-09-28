import type { Metadata } from "next";
import { ModelsView } from "@/components/models/models-view";

export const metadata: Metadata = {
  title: "3D Models · Mūlya",
  description:
    "Interactive CAD models of the sample parts (bearing housing, cab mount bracket and gearbox end cover) with STEP, STL and glTF downloads and their production tooling.",
};

/** /models: 3D CAD gallery. */
export default function ModelsPage() {
  return <ModelsView />;
}
