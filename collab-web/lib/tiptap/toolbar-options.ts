export const BLOCK_TYPES = [
  { label: "Paragraph", value: "paragraph" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
] as const;

export const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Sans", value: "var(--font-sans), sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "var(--font-mono), monospace" },
] as const;

export const FONT_SIZES = [
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "24", value: "24px" },
  { label: "32", value: "32px" },
] as const;

export const TEXT_COLORS = [
  "#111827",
  "#374151",
  "#6b7280",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#2563eb",
  "#7c3aed",
  "#db2777",
] as const;

export const HIGHLIGHT_COLORS = [
  "#fef08a",
  "#bbf7d0",
  "#bfdbfe",
  "#fbcfe8",
  "#e9d5ff",
  "#fed7aa",
] as const;
