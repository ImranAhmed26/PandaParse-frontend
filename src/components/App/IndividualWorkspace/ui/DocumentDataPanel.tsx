"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Crosshair, FileQuestion, Loader2 } from "lucide-react";
import { useUpdateDocumentResult, useUpdateDocumentResultStatus } from "../hooks";
import type { DocumentResultData, DocumentResultItem, OcrField, OcrTable, ParsedOcr } from "../types";

interface DocumentDataPanelProps {
  ocr: ParsedOcr | null;
  result: DocumentResultData | null;
  documentId: string;
  selectedFieldId: string | null;
  hoveredFieldId: string | null;
  onSelectField: (id: string) => void;
  onHoverField: (id: string | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
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

function needsReview(level: ConfidenceLevel): boolean {
  return level === "low" || level === "unknown";
}

function humanizeLabel(label: string | null): string {
  if (!label) return "Field";
  if (/^[A-Z0-9_]+$/.test(label)) {
    return label
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return label;
}

const inputClass =
  "w-full bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-400 rounded px-1.5 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400";

/**
 * Right-pane extracted-data view. Summary values and line items are editable and persist
 * via PATCH /document-results/:id; the review workflow (draft -> reviewed -> approved) is
 * driven from the footer. Detected fields (parsed OCR) stay read-only — they're the
 * immutable evidence with confidence + click-to-locate mapping.
 */
export function DocumentDataPanel({
  ocr,
  result,
  documentId,
  selectedFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
  onDirtyChange,
}: DocumentDataPanelProps) {
  const [onlyReview, setOnlyReview] = useState(false);

  // Editable drafts — reset when navigating to a different result.
  const [draftSummary, setDraftSummary] = useState<Record<string, unknown>>({});
  const [draftItems, setDraftItems] = useState<DocumentResultItem[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraftSummary(result?.summary ? { ...result.summary } : {});
    setDraftItems(result?.items ? result.items.map((it) => ({ ...it })) : []);
    setDirty(false);
    // Intentionally keyed on result.id only: reset drafts when switching to a different
    // result, not on refetches of the same one (which would clobber in-progress edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.id]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Warn before closing/reloading the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const updateResult = useUpdateDocumentResult(documentId);
  const updateStatus = useUpdateDocumentResultStatus(documentId);

  const setSummaryValue = (key: string, value: string) => {
    setDraftSummary((s) => ({ ...s, [key]: value }));
    setDirty(true);
  };
  const setItemName = (i: number, raw: string) => {
    setDraftItems((items) => items.map((it, idx) => (idx === i ? { ...it, name: raw === "" ? null : raw } : it)));
    setDirty(true);
  };
  const setItemNumber = (i: number, field: keyof DocumentResultItem, raw: string) => {
    const t = raw.trim();
    let val: number | null;
    if (t === "") val = null;
    else {
      const n = Number(t);
      if (Number.isNaN(n)) return;
      val = n;
    }
    setDraftItems((items) => items.map((it, idx) => (idx === i ? { ...it, [field]: val } : it)));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await updateResult.mutateAsync({ resultId: result.id, payload: { summary: draftSummary, items: draftItems } });
      setDirty(false);
    } catch {
      // error surfaced via updateResult.isError below
    }
  };

  const handleStatus = (status: "reviewed" | "approved") => {
    if (!result) return;
    updateStatus.mutate({ resultId: result.id, status });
  };

  const scrollSelectedIntoView = useCallback((node: HTMLElement | null) => {
    node?.scrollIntoView({ block: "nearest" });
  }, []);

  const ocrFields = useMemo(() => ocr?.fields ?? [], [ocr]);
  const lineItemFields = ocr?.lineItems ?? [];
  const tables = ocr?.tables ?? [];
  // Only string summary values are user-editable; numeric metadata (counts) is preserved
  // untouched in draftSummary and sent back on save.
  const summaryKeys = useMemo(
    () => Object.entries(draftSummary).filter(([, v]) => typeof v === "string").map(([k]) => k),
    [draftSummary],
  );

  const reviewCount = useMemo(
    () => ocrFields.filter((f) => needsReview(confidenceLevel(f.confidence))).length,
    [ocrFields],
  );
  const visibleFields = onlyReview
    ? ocrFields.filter((f) => needsReview(confidenceLevel(f.confidence)) || f.id === selectedFieldId)
    : ocrFields;

  const hasAnything =
    summaryKeys.length > 0 || draftItems.length > 0 || ocrFields.length > 0 || tables.length > 0;

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
            {summaryKeys.length > 0 && (
              <Section title="Summary">
                <div className="space-y-2">
                  {summaryKeys.map((key) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="text-xs text-gray-500 dark:text-gray-400 w-28 shrink-0">
                        {humanizeLabel(key)}
                      </label>
                      <input
                        value={String(draftSummary[key] ?? "")}
                        onChange={(e) => setSummaryValue(key, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {draftItems.length > 0 && (
              <Section title={`Line items (${draftItems.length})`}>
                <LineItemsTable
                  items={draftItems}
                  lineItemFields={lineItemFields}
                  selectedFieldId={selectedFieldId}
                  onSelectField={onSelectField}
                  onHoverField={onHoverField}
                  rowRefForId={scrollSelectedIntoView}
                  onNameChange={setItemName}
                  onNumberChange={setItemNumber}
                />
              </Section>
            )}

            {ocrFields.length > 0 && (
              <Section title="Detected fields">
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

            {tables.map((t, i) => (
              <Section key={`table-${i}`} title={tables.length > 1 ? `Table ${i + 1}` : "Table"}>
                <OcrTableView table={t} />
              </Section>
            ))}
          </>
        )}
      </div>

      {/* Footer: save + review workflow */}
      {result && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60">
          <div className="text-xs min-w-0">
            {updateResult.isError ? (
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" /> Failed to save
              </span>
            ) : dirty ? (
              <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
            ) : updateResult.isSuccess ? (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {result.status === "draft" && (
              <ReviewButton onClick={() => handleStatus("reviewed")} disabled={dirty || updateStatus.isPending}>
                Mark reviewed
              </ReviewButton>
            )}
            {result.status !== "approved" && (
              <ReviewButton onClick={() => handleStatus("approved")} disabled={dirty || updateStatus.isPending}>
                Approve
              </ReviewButton>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || updateResult.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {updateResult.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Save changes first" : undefined}
      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
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
  onNameChange,
  onNumberChange,
}: {
  items: DocumentResultItem[];
  lineItemFields: OcrField[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onHoverField: (id: string | null) => void;
  rowRefForId: (node: HTMLElement | null) => void;
  onNameChange: (i: number, raw: string) => void;
  onNumberChange: (i: number, field: keyof DocumentResultItem, raw: string) => void;
}) {
  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
          <tr>
            <th className="w-8" />
            <th className="text-left font-medium px-2 py-2">Name</th>
            <th className="text-right font-medium px-2 py-2 w-16">Qty</th>
            <th className="text-right font-medium px-2 py-2 w-24">Unit price</th>
            <th className="text-right font-medium px-2 py-2 w-24">Total</th>
            <th className="text-right font-medium px-2 py-2 w-20">Tax</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {items.map((item, i) => {
            const field = lineItemFields[i];
            const locatable = !!field?.box;
            const selected = !!field && field.id === selectedFieldId;
            return (
              <tr
                key={item.id ?? i}
                ref={selected ? rowRefForId : undefined}
                onMouseEnter={locatable ? () => onHoverField(field.id) : undefined}
                onMouseLeave={locatable ? () => onHoverField(null) : undefined}
                className={`text-gray-900 dark:text-gray-100 ${
                  selected ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                }`}
              >
                <td className="px-1 py-1 align-top text-center">
                  {locatable && (
                    <button
                      type="button"
                      onClick={() => onSelectField(field.id)}
                      title="Locate on document"
                      className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <Crosshair className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
                <td className="px-1 py-1 align-top">
                  <textarea
                    rows={1}
                    value={item.name ?? ""}
                    onChange={(e) => onNameChange(i, e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                </td>
                <NumberCell value={item.quantity} onChange={(v) => onNumberChange(i, "quantity", v)} />
                <NumberCell value={item.unitPrice} onChange={(v) => onNumberChange(i, "unitPrice", v)} />
                <NumberCell value={item.total} onChange={(v) => onNumberChange(i, "total", v)} />
                <NumberCell value={item.tax} onChange={(v) => onNumberChange(i, "tax", v)} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NumberCell({ value, onChange }: { value: number | null; onChange: (raw: string) => void }) {
  return (
    <td className="px-1 py-1 align-top">
      <input
        type="number"
        step="any"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} text-right`}
      />
    </td>
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
