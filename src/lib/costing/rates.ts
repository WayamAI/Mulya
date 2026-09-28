/**
 * Rate Master: material, machine, region and burden rates.
 *
 * original chunk: rates-C6qaj31p.js
 * original exports: i=REGION_FACTORS, n=MATERIAL_RATES, r=BURDEN_RATES, t=MACHINE_RATES
 */

import type { ProcessName, Region } from "./parts";

export interface MaterialRate {
  grade: string;
  standard: string;
  process: ProcessName;
  /** EUR per kg. */
  rate: number;
  /** Scrap credit, EUR per kg returned. */
  scrap: number;
}

export interface MachineRate {
  machine: string;
  /** EUR per hour. */
  rate: number;
  /** Setup, minutes. */
  setup: number;
  /** Utilisation, %. */
  utilisation: number;
}

export interface RegionFactor {
  region: Region;
  factor: number;
  /** Freight, EUR per piece. */
  freight: number;
}

export interface BurdenRate {
  key: string;
  value: number;
  unit: string;
  description: string;
}

export const MATERIAL_RATES: MaterialRate[] = [
  { grade: "DC04", standard: "EN 10130", process: "Stamping", rate: 1.1, scrap: 0.18 },
  { grade: "DC01", standard: "EN 10130", process: "Stamping", rate: 1.05, scrap: 0.18 },
  { grade: "HC340LA", standard: "EN 10268", process: "Stamping", rate: 1.25, scrap: 0.18 },
  { grade: "DP600", standard: "EN 10338", process: "Stamping", rate: 1.45, scrap: 0.18 },
  { grade: "Al 5754", standard: "EN 485", process: "Stamping", rate: 3.6, scrap: 1.05 },
  { grade: "1.4301", standard: "EN 10088", process: "Stamping", rate: 4.2, scrap: 0.95 },
  { grade: "GG25", standard: "EN-GJL-250", process: "Sand cast", rate: 0.95, scrap: 0.3 },
  { grade: "GGG40", standard: "EN-GJS-400-15", process: "Sand cast", rate: 1.25, scrap: 0.3 },
  { grade: "GS-52", standard: "EN 10293", process: "Sand cast", rate: 1.9, scrap: 0.42 },
  { grade: "AlSi10Mg", standard: "EN AC-43000", process: "Die cast", rate: 3.2, scrap: 1.1 },
  { grade: "AlSi9Cu3", standard: "EN AC-46000", process: "Die cast", rate: 2.95, scrap: 1.05 },
  { grade: "AZ91D", standard: "ASTM B93", process: "Die cast", rate: 4.8, scrap: 1.4 },
  { grade: "Zamak 5", standard: "EN 12844", process: "Die cast", rate: 3.4, scrap: 1.15 },
];

export const MACHINE_RATES: MachineRate[] = [
  { machine: "Press", rate: 62, setup: 45, utilisation: 82 },
  { machine: "Foundry moulding", rate: 48, setup: 90, utilisation: 74 },
  { machine: "Die cast machine", rate: 85, setup: 120, utilisation: 78 },
  { machine: "CNC machining", rate: 54, setup: 35, utilisation: 86 },
];

export const REGION_FACTORS: RegionFactor[] = [
  { region: "EU", factor: 1, freight: 0.42 },
  { region: "Turkey", factor: 0.72, freight: 0.68 },
  { region: "Mexico", factor: 0.68, freight: 0.94 },
  { region: "India", factor: 0.54, freight: 1.16 },
];

export const BURDEN_RATES: BurdenRate[] = [
  {
    key: "Overhead",
    value: 8,
    unit: "%",
    description: "Plant burden: energy, maintenance, indirect labour and depreciation.",
  },
  {
    key: "Margin",
    value: 5.5,
    unit: "%",
    description: "Supplier profit applied to the fully burdened conversion cost.",
  },
  {
    key: "Packaging",
    value: 1.2,
    unit: "%",
    description: "Returnable racks, dunnage and labelling allocated per piece.",
  },
];
