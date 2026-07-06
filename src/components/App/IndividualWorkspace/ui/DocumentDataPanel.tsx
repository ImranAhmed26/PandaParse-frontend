"use client";

import { useCallback, useMemo, useState } from "react";
import { FileQuestion } from "lucide-react";
import type { DocumentResultData, DocumentResultItem, OcrField, OcrTable, ParsedOcr } from "../types";

interface DocumentDataPanelProps {
  ocr: ParsedOcr | null;
  result: DocumentResultData | null;
  selectedFieldId: string | null;
  hoveredFieldId: string | null;
  onSelectField: (id: string) => void;
  onHoverField: (id: string | null) => void;
}

type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

const HIGH_THRESHOLD = 95;
const MEDIUM_THRESHOLD = 85;

function confidenceLevel(confidence: number | null): ConfidenceLevel {
  if (confidence == null) return "unknown";
  if (confidence >= HIGH_THRESHOLD) return "high";
  if (confidence >= MEDIUM_THRESHOLD) return "medium";
  return "low";
}

// "Needs review" surfaces the fields worth a human check: low-confidence and those
// with no confidence score at all. Medium (amber) is considered acceptable.
function needsReview(level: ConfidenceLevel): boolean {
  return level === "low" || level === "unknown";
}

function humanizeLabel(label: string | null): string {
  if (!label) return "Field";
  // Textract expense types like VENDOR_NAME -> "Vendor Name"; leave human keys as-is.
  if (/^[A-Z0-9_]+$/.test(label)) {
    return label
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return label;
}

/**
 * Right-pane extracted-data view (read-only in Phase 3): OCR fields with confidence
 * indicators, the line-item table, and any detected tables. Fields are clickable and
 * sync with the document viewer's bounding-box overlay (Phase 4). Falls back to the DB
 * summary when the raw parsed JSON is unavailable.
 */
export function DocumentDataPanel({
  ocr,
  result,
  selectedFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
}: DocumentDataPanelProps) {
  const [onlyReview, setOnlyReview] = useState(false);

  const fields = useMemo<OcrField[]>(() => {
    if (ocr && ocr.fields.length > 0) return ocr.fields;
    // Fallback: derive fields from the DB summary (no confidence/box) when the parsed
    // Textract JSON isn't available.
    if (result?.summary) return summaryToFields(result.summary);
    return [];
  }, [ocr, result]);

  const items = result?.items ?? [];
  const tables = ocr?.tables ?? [];

  const reviewCount = useMemo(
    () => fields.filter((f) => needsReview(confidenceLevel(f.confidence))).length,
    [fields],
  );
  // Keep the selected field visible even while the "needs review" filter is on.
  const visibleFields = onlyReview
    ? fields.filter((f) => needsReview(confidenceLevel(f.confidence)) || f.id === selectedFieldId)
    : fields;

  const scrollSelectedIntoView = useCallback((node: HTMLElement | null) => {
    node?.scrollIntoView({ block: "nearest" });
  }, []);

  const lineItemFields = ocr?.lineItems ?? [];

  const hasAnything = fields.length > 0 || items.length > 0 || tables.length > 0;

  return (
    <div className="h-[75vh] flex flex-col border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Extracted data</h2>
          {result?.status && <StatusBadge status={result.status} />}
        </div>
        {reviewCount > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyReview}
              onChange={(e) => setOnlyReview(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Needs review ({reviewCount})
          </label>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {!hasAnything ? (
          <EmptyState />
        ) : (
          <>
            {fields.length > 0 && (
              <Section title="Fields">
                {visibleFields.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">No fields match this filter.</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {visibleFields.map((f) => {
                      const selected = f.id === selectedFieldId;
                      return (
                        <FieldRow
                          key={f.id}
                          field={f}
                          selected={selected}
                          hovered={f.id === hoveredFieldId}
                          onSelect={onSelectField}
                          onHover={onHoverField}
                          rowRef={selected ? scrollSelectedIntoView : undefined}
                        />
                      );
                    })}
                  </div>
                )}
              </Section>
            )}

            {items.length > 0 && (
              <Section title={`Line items (${items.length})`}>
                <LineItemsTable
                  items={items}
                  lineItemFields={lineItemFields}
                  selectedFieldId={selectedFieldId}
                  onSelectField={onSelectField}
                  onHoverField={onHoverField}
                  rowRefForId={scrollSelectedIntoView}
                />
              </Section>
            )}

            {tables.map((t, i) => (
              <Section key={`table-${i}`} title={tables.length > 1 ? `Table ${i + 1}` : "Table"}>
                <OcrTableView table={t} />
              </Section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FieldRow({
  field,
  selected,
  hovered,
  onSelect,
  onHover,
  rowRef,
}: {
  field: OcrField;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  rowRef?: (node: HTMLElement | null) => void;
}) {
  const level = confidenceLevel(field.confidence);
  const review = needsReview(level);
  const locatable = !!field.box;
  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(field.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(field.id);
        }
      }}
      onMouseEnter={() => onHover(field.id)}
      onMouseLeave={() => onHover(null)}
      title={locatable ? "Click to locate on the document" : undefined}
      className={`flex items-start justify-between gap-3 py-2 pl-2 pr-1 cursor-pointer rounded-sm outline-none border-l-2 transition-colors focus-visible:ring-1 focus-visible:ring-indigo-400 ${
        selected
          ? "bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-300 dark:ring-indigo-700"
          : hovered
            ? "bg-gray-50 dark:bg-gray-700/40"
            : ""
      } ${review ? "border-red-400 dark:border-red-500/70" : "border-transparent"}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{humanizeLabel(field.label)}</p>
        <p className="text-sm text-gray-900 dark:text-gray-100 break-words">
          {field.value || <span className="text-gray-400 dark:text-gray-500">—</span>}
        </p>
      </div>
      <ConfidenceBadge confidence={field.confidence} />
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  const level = confidenceLevel(confidence);
  const styles: Record<ConfidenceLevel, string> = {
    high: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    medium: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    low: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    unknown: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  };
  const label = confidence == null ? "—" : `${Math.round(confidence)}%`;
  return (
    <span
      className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium tabular-nums ${styles[level]}`}
      title="OCR confidence"
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    reviewed: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    approved: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  };
  return (
    <span
      className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
        styles[status] ?? styles.draft
      }`}
    >
      {status}
    </span>
  );
}

function LineItemsTable({
  items,
  lineItemFields,
  selectedFieldId,
  onSelectField,
  onHoverField,
  rowRefForId,
}: {
  items: DocumentResultItem[];
  lineItemFields: OcrField[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onHoverField: (id: string | null) => void;
  rowRefForId: (node: HTMLElement | null) => void;
}) {
  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
          <tr>
            <th className="text-left font-medium px-3 py-2">Name</th>
            <th className="text-right font-medium px-3 py-2 w-16">Qty</th>
            <th className="text-right font-medium px-3 py-2 w-24">Unit price</th>
            <th className="text-right font-medium px-3 py-2 w-24">Total</th>
            <th className="text-right font-medium px-3 py-2 w-20">Tax</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {items.map((item, i) => {
            // Correlate each DB item with its parsed line-item box by position.
            const field = lineItemFields[i];
            const locatable = !!field?.box;
            const selected = !!field && field.id === selectedFieldId;
            return (
              <tr
                key={item.id ?? i}
                ref={selected ? rowRefForId : undefined}
                onClick={locatable ? () => onSelectField(field.id) : undefined}
                onMouseEnter={locatable ? () => onHoverField(field.id) : undefined}
                onMouseLeave={locatable ? () => onHoverField(null) : undefined}
                title={locatable ? "Click to locate on the document" : undefined}
                className={`text-gray-900 dark:text-gray-100 transition-colors ${
                  locatable ? "cursor-pointer" : ""
                } ${selected ? "bg-indigo-50 dark:bg-indigo-900/20" : locatable ? "hover:bg-gray-50 dark:hover:bg-gray-700/40" : ""}`}
              >
                <td className="px-3 py-2 break-words">{item.name || <Dash />}</td>
                <td className="px-3 py-2 text-right tabular-nums">{numOrDash(item.quantity)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{numOrDash(item.unitPrice)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{numOrDash(item.total)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{numOrDash(item.tax)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OcrTableView({ table }: { table: OcrTable }) {
  const { rows, maxCol } = useMemo(() => buildGrid(table), [table]);
  if (rows.length === 0) {
    return <p className="text-xs text-gray-500 dark:text-gray-400">Empty table.</p>;
  }
  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {rows.map((cellsByCol, r) => (
            <tr key={r} className="text-gray-900 dark:text-gray-100">
              {Array.from({ length: maxCol }, (_, c) => (
                <td key={c} className="px-3 py-2 border-r border-gray-100 dark:border-gray-700/60 last:border-r-0">
                  {cellsByCol[c + 1] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 py-16">
      <FileQuestion className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-3" />
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No extracted data yet</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-xs">
        This document may still be processing, or it was flagged during OCR.
      </p>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function Dash() {
  return <span className="text-gray-400 dark:text-gray-500">—</span>;
}

function numOrDash(n: number | null) {
  return n == null ? <Dash /> : n;
}

function summaryToFields(summary: Record<string, unknown>): OcrField[] {
  return Object.entries(summary)
    .filter(([, v]) => v == null || typeof v === "string" || typeof v === "number")
    .map(([key, v], i) => ({
      id: `sum-${i}`,
      label: key,
      value: v == null ? null : String(v),
      confidence: null,
      page: 1,
      box: null,
    }));
}

// Group a table's cells into rows keyed by column index for grid rendering.
function buildGrid(table: OcrTable): { rows: Record<number, string>[]; maxCol: number } {
  const byRow = new Map<number, Record<number, string>>();
  let maxCol = 0;
  for (const cell of table.cells) {
    const r = cell.rowIndex ?? 0;
    const c = cell.columnIndex ?? 0;
    maxCol = Math.max(maxCol, c);
    if (!byRow.has(r)) byRow.set(r, {});
    byRow.get(r)![c] = cell.text ?? "";
  }
  const rows = Array.from(byRow.keys())
    .sort((a, b) => a - b)
    .map((r) => byRow.get(r)!);
  return { rows, maxCol };
}
