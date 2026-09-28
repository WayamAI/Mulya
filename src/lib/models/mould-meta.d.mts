export type MouldKind = "pattern" | "die" | "progressive";

export declare const MOULD_KINDS: readonly ["pattern", "die", "progressive"];
export declare const MOULD_COLORS: Record<MouldKind, number>;
export declare const MOULD_MATERIAL_LABELS: Record<MouldKind, string>;
export declare const MOULD_DEFAULT_OPEN: number;
