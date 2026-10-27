import { formatDate } from "@/lib/format";

/** Categories every Household starts with, in order. "Other" is the fallback and can't be deleted. */
export const DEFAULT_VAULT_CATEGORIES = [
  "ID",
  "Insurance",
  "Bank",
  "Utility",
  "Vehicle",
  "Documents",
  "Taxes",
  "Warranty",
  "Other",
] as const;
export const FALLBACK_VAULT_CATEGORY = "Other";

/** Dashboard shows an expiry this many days ahead, and any that has already passed. */
export const VAULT_EXPIRY_WARNING_DAYS = 60;
/** The daily Notification mentions an Entry's date at exactly these many days ahead. */
export const VAULT_NOTIFY_DAYS = [60, 14] as const;

export const VAULT_FIELD_KINDS = ["text", "date", "secret"] as const;
export type VaultFieldKind = (typeof VAULT_FIELD_KINDS)[number];
export const VAULT_FIELD_KIND_LABELS: Record<VaultFieldKind, string> = {
  text: "Text",
  date: "Date",
  secret: "Secret",
};

export type VaultField = { label: string; kind: VaultFieldKind; value: string };

export const ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
export const ATTACHMENTS_PER_ENTRY = 10;
export const ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export type VaultTemplate = {
  key: string;
  label: string;
  hint: string;
  category: string;
  /** What the Entry's one main date is called; null when the Template has none. */
  dateLabel: string | null;
  fields: { label: string; kind: VaultFieldKind }[];
};

/** Built-in starting shapes for a new Entry. Everything on them can be changed or removed afterwards. */
export const VAULT_TEMPLATES: VaultTemplate[] = [
  { key: "passport", label: "Passport", hint: "Number and expiry", category: "ID", dateLabel: "Valid until", fields: [{ label: "Number", kind: "secret" }, { label: "Issued in", kind: "text" }] },
  { key: "drivers-licence", label: "Driver's licence", hint: "Number and expiry", category: "ID", dateLabel: "Valid until", fields: [{ label: "Number", kind: "secret" }, { label: "Categories", kind: "text" }] },
  { key: "insurance", label: "Insurance policy", hint: "Provider, policy number", category: "Insurance", dateLabel: "Renews on", fields: [{ label: "Provider", kind: "text" }, { label: "Policy number", kind: "secret" }, { label: "Claims phone", kind: "text" }] },
  { key: "warranty", label: "Warranty", hint: "Product and end date", category: "Warranty", dateLabel: "Warranty ends", fields: [{ label: "Product", kind: "text" }, { label: "Purchased", kind: "date" }, { label: "Serial number", kind: "text" }] },
  { key: "invoice", label: "Invoice", hint: "Supplier and amount", category: "Documents", dateLabel: null, fields: [{ label: "Supplier", kind: "text" }, { label: "Invoice date", kind: "date" }, { label: "Amount", kind: "text" }] },
  { key: "tax-return", label: "Tax return", hint: "Year and deadline", category: "Taxes", dateLabel: "File by", fields: [{ label: "Year", kind: "text" }, { label: "Reference", kind: "secret" }] },
  { key: "bank-account", label: "Bank account", hint: "IBAN and bank", category: "Bank", dateLabel: null, fields: [{ label: "Bank", kind: "text" }, { label: "IBAN", kind: "secret" }] },
];

export const BLANK_TEMPLATE: VaultTemplate = {
  key: "blank",
  label: "Blank",
  hint: "Start from nothing",
  category: FALLBACK_VAULT_CATEGORY,
  dateLabel: null,
  fields: [],
};

export function templateByKey(key: string | null | undefined): VaultTemplate {
  return VAULT_TEMPLATES.find((t) => t.key === key) ?? BLANK_TEMPLATE;
}

/** Whole days from today (local) to a date-only value; negative once it has passed. */
export function daysUntil(date: Date | string): number {
  const d = new Date(date);
  const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

/**
 * `text` is the headline. A custom label ("Valid until", "Renews on") ends in a preposition and takes a date, not
 * "in 40 days", so with a label the headline is label + date and `relative` carries the countdown separately.
 */
export function expiryLabel(
  date: Date | string,
  label?: string | null,
): { text: string; relative: string; critical: boolean } {
  const days = daysUntil(date);
  const relative =
    days < -1 ? `${-days} days ago` : days === -1 ? "yesterday" : days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`;
  const critical = days <= VAULT_EXPIRY_WARNING_DAYS;
  return { text: label ? `${label} ${formatDate(date)}` : `Expires ${relative}`, relative, critical };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
