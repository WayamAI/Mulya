/**
 * Enterprise-system connectors and the role-based history views ("personas").
 *
 * original chunk: connectors-ByT_fzaP.js
 * original exports: a=PERSONAS, i=NUMERIC_COLUMNS, n=CONNECTORS, o=PERSONA_KEYS, r=CONNECTOR_STATUS, t=COLUMN_LABELS
 */

export type ConnectorStatus = "connected" | "available" | "planned";
export type ConnectorCategory = "PLM" | "ERP" | "Warehouse" | "File" | "API";

export interface Connector {
  name: string;
  vendor: string;
  category: ConnectorCategory;
  supplies: string;
  feeds: string;
  status: ConnectorStatus;
  /** Only on connected systems. */
  records?: string;
  method: string;
}

export type PersonaKey = "design" | "cost" | "purchasing" | "programme";

export type ColumnKey =
  | "part"
  | "revision"
  | "change"
  | "process"
  | "result"
  | "target"
  | "variance"
  | "actual"
  | "volume"
  | "region"
  | "annualSpend"
  | "tooling"
  | "programme"
  | "engineer"
  | "status"
  | "time";

export interface Persona {
  key: PersonaKey;
  role: string;
  question: string;
  focus: string;
  columns: ColumnKey[];
}

export const CONNECTOR_STATUS: Record<ConnectorStatus, { label: string; icon: string }> = {
  connected: { label: "Connected", icon: "●" },
  available: { label: "Available", icon: "○" },
  planned: { label: "Roadmap", icon: "◌" },
};

export const CONNECTORS: Connector[] = [
  {
    name: "Teamcenter",
    vendor: "Siemens",
    category: "PLM",
    supplies: "Part master, revisions, CAD documents, BOM structure, change records",
    feeds: "Part Library · Estimate History · Compare Revisions",
    status: "connected",
    records: "50 parts · 63 revisions",
    method: "SOA / Active Workspace REST",
  },
  {
    name: "Windchill",
    vendor: "PTC",
    category: "PLM",
    supplies: "Part master, revisions, CAD documents",
    feeds: "Part Library · Estimate History",
    status: "available",
    method: "Info*Engine REST",
  },
  {
    name: "SAP S/4HANA",
    vendor: "SAP",
    category: "ERP",
    supplies: "Purchase order history, actual paid prices, material master, vendor master",
    feeds: "Rate Master · estimate-vs-actual · Data & Model training set",
    status: "available",
    method: "OData / CDS views",
  },
  {
    name: "SAP Ariba",
    vendor: "SAP",
    category: "ERP",
    supplies: "RFQ responses, awarded prices, supplier capability",
    feeds: "Supplier pack responses · quoted price benchmark",
    status: "available",
    method: "Ariba Network API",
  },
  {
    name: "Snowflake",
    vendor: "Snowflake",
    category: "Warehouse",
    supplies: "Curated historical cost catalogue, cleaned and joined",
    feeds: "Data & Model · the trained model's training set",
    status: "available",
    method: "JDBC · key-pair auth",
  },
  {
    name: "PostgreSQL",
    vendor: "Self-hosted",
    category: "Warehouse",
    supplies: "Any tabular cost history you already maintain",
    feeds: "Data & Model",
    status: "available",
    method: "Direct connection · read-only role",
  },
  {
    name: "CSV / Excel",
    vendor: "File upload",
    category: "File",
    supplies: "One-off catalogue extract, no integration work",
    feeds: "Data & Model",
    status: "available",
    method: "Browser upload · column mapping on import",
  },
  {
    name: "Mūlya REST API",
    vendor: "Mūlya",
    category: "API",
    supplies: "Estimates out: into your own dashboards or a PLM property",
    feeds: "Outbound: writes the estimate back onto the part in PLM",
    status: "planned",
    method: "REST · OAuth 2.0 client credentials",
  },
];

export const PERSONAS: Record<PersonaKey, Persona> = {
  design: {
    key: "design",
    role: "Design Engineer",
    question: "What did I change, and did it help?",
    focus: "Cost movement against the previous revision",
    columns: ["part", "revision", "change", "process", "result", "status", "time"],
  },
  cost: {
    key: "cost",
    role: "Cost Engineer",
    question: "Where are we against target, and is the estimate holding up?",
    focus: "Variance to target and estimate against quoted actual",
    columns: ["part", "revision", "result", "target", "variance", "actual", "status", "engineer"],
  },
  purchasing: {
    key: "purchasing",
    role: "Purchasing",
    question: "What is this worth per year, and what are we committing to in tooling?",
    focus: "Annual spend and tooling commitment by part",
    columns: ["part", "process", "volume", "region", "result", "annualSpend", "tooling"],
  },
  programme: {
    key: "programme",
    role: "Programme Manager",
    question: "Which programmes are carrying cost risk?",
    focus: "Parts over target, by programme",
    columns: ["part", "programme", "process", "result", "target", "variance", "status"],
  },
};

export const PERSONA_KEYS: PersonaKey[] = ["design", "cost", "purchasing", "programme"];

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  part: "Part",
  revision: "Rev",
  change: "What changed",
  process: "Process",
  result: "Estimate",
  target: "Target",
  variance: "Variance",
  actual: "Quoted",
  volume: "Volume",
  region: "Region",
  annualSpend: "Annual spend",
  tooling: "Tooling",
  programme: "Programme",
  engineer: "Engineer",
  status: "Status",
  time: "Time",
};

/** Columns rendered as right-aligned figures. */
export const NUMERIC_COLUMNS: ColumnKey[] = ["result", "target", "variance", "actual", "volume", "annualSpend", "tooling"];
