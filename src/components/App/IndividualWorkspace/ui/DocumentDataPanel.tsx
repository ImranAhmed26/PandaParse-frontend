"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Crosshair, FileQuestion, Loader2, Pencil, RotateCcw } from "lucide-react";
import { useUpdateDocumentResult, useUpdateDocumentResultStatus } from "../hooks";
import type { DocumentResultData, ExtractedField, LineItem, LineItemEdit } from "../types";

interface DocumentDataPanelProps {
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

/**
 * Locale-agnostic money/number parser — mirrors the backend `parseAmount` so the live
 * arithmetic check reads draft values the same way they'll be stored. Decides the decimal
 * separator by whichever of `.`/`,` appears last (handles "1,234.50" and "1.234,50").
 */
function parseAmount(v: string | null | undefined): number | null {
  if (v == null) return null;
  let cleaned = v.replace(/[^\d.,-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > lastDot) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  else cleaned = cleaned.replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function humanizeKey(key: string): string {
  return key
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function fieldLabel(field: ExtractedField): string {
  return field.label ?? humanizeKey(field.key);
}

const inputClass =
  "w-full bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-400 rounded px-1.5 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-400";

// Fields that must be present (non-empty) before a document can be approved. Keyed by
// canonical docType; unlisted types have no required fields.
const REQUIRED_BY_DOCTYPE: Record<string, { key: string; label: string }[]> = {
  INVOICE: [
    { key: "VENDOR_NAME", label: "Vendor" },
    { key: "INVOICE_NUMBER", label: "Invoice number" },
    { key: "INVOICE_DATE", label: "Invoice date" },
    { key: "TOTAL", label: "Total" },
  ],
  RECEIPT: [
    { key: "VENDOR_NAME", label: "Vendor" },
    { key: "TOTAL", label: "Total" },
  ],
};

/**
 * Right-pane extracted-data view. Header fields and line items are editable and mapped:
 * each carries its OCR confidence and (via its id) a bounding box on the document, so a
 * row can be located on the page and vice-versa. Edits persist via
 * PATCH /document-results/:id; the review workflow (draft -> reviewed -> approved) is
 * driven from the footer. Editing a value never moves its detected box.
 */
export function DocumentDataPanel({
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
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [draftItems, setDraftItems] = useState<LineItem[]>([]);
  const [itemsDirty, setItemsDirty] = useState(false);

  useEffect(() => {
    const values: Record<string, string> = {};
    for (const f of result?.fields ?? []) values[f.key] = f.value ?? "";
    setDraftValues(values);
    setDraftItems(result?.lineItems ? result.lineItems.map((li) => ({ ...li })) : []);
    setItemsDirty(false);
    // Keyed on result.id only: reset drafts when switching to a different result, not on
    // refetches/cache-patches of the same one (which would clobber in-progress edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.id]);

  const fields = useMemo(() => result?.fields ?? [], [result]);

  // Required fields for this docType, and the ones Textract didn't detect at all — those
  // get an empty, editable row so the reviewer can add them (otherwise approval is blocked
  // with nothing to fill in).
  const requiredDefs = useMemo(
    () => (result ? REQUIRED_BY_DOCTYPE[result.docType] ?? [] : []),
    [result],
  );
  const missingDefs = useMemo(() => {
    const present = new Set(fields.map((f) => f.key));
    return requiredDefs.filter((d) => !present.has(d.key));
  }, [fields, requiredDefs]);

  const fieldsDirty = useMemo(
    () =>
      fields.some((f) => (draftValues[f.key] ?? "") !== (f.value ?? "")) ||
      missingDefs.some((d) => (draftValues[d.key] ?? "").trim() !== ""),
    [fields, missingDefs, draftValues],
  );
  const dirty = fieldsDirty || itemsDirty;

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

  const setFieldValue = (key: string, value: string) => {
    setDraftValues((v) => ({ ...v, [key]: value }));
  };
  const setItemText = (i: number, field: "description" | "productCode", raw: string) => {
    setDraftItems((items) =>
      items.map((it, idx) => (idx === i ? { ...it, [field]: raw === "" ? null : raw } : it)),
    );
    setItemsDirty(true);
  };
  const setItemNumber = (
    i: number,
    field: "quantity" | "unitPrice" | "amount" | "tax" | "taxRate",
    raw: string,
  ) => {
    const t = raw.trim();
    let val: number | null;
    if (t === "") val = null;
    else {
      const n = Number(t);
      if (Number.isNaN(n)) return;
      val = n;
    }
    setDraftItems((items) => items.map((it, idx) => (idx === i ? { ...it, [field]: val } : it)));
    setItemsDirty(true);
  };

  const handleSave = async () => {
    if (!result) return;
    const fieldEdits = fields
      .filter((f) => (draftValues[f.key] ?? "") !== (f.value ?? ""))
      .map((f) => ({ key: f.key, value: draftValues[f.key] === "" ? null : draftValues[f.key] }));

    // Include newly-typed values for required fields that weren't detected (upserted server-side).
    for (const d of missingDefs) {
      const v = draftValues[d.key];
      if (v != null && v.trim() !== "") fieldEdits.push({ key: d.key, value: v });
    }

    const lineItems: LineItemEdit[] | undefined = itemsDirty
      ? draftItems.map((li) => ({
          rowIndex: li.rowIndex,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          amount: li.amount,
          tax: li.tax,
          taxRate: li.taxRate,
          productCode: li.productCode,
        }))
      : undefined;

    if (fieldEdits.length === 0 && lineItems === undefined) return;

    try {
      await updateResult.mutateAsync({
        resultId: result.id,
        payload: {
          ...(fieldEdits.length ? { fields: fieldEdits } : {}),
          ...(lineItems ? { lineItems } : {}),
        },
      });
      // Field drafts self-clean (they now equal the saved values); reset the items flag.
      setItemsDirty(false);
    } catch {
      // error surfaced via updateResult.isError below
    }
  };

  const handleStatus = (status: "reviewed" | "approved") => {
    if (!result) return;
    updateStatus.mutate({ resultId: result.id, status });
  };

  // Pre-approval validation. Required fields must be non-empty (errors, block approve);
  // low-confidence fields left unedited are surfaced as warnings (approve with confirm).
  const currentValue = (key: string): string => {
    if (key in draftValues) return draftValues[key];
    return fields.find((f) => f.key === key)?.value ?? "";
  };
  const missingRequired = requiredDefs.filter((d) => currentValue(d.key).trim() === "");
  const lowConfidenceCount = useMemo(
    () =>
      fields.filter((f) => {
        const edited = f.isEdited || (draftValues[f.key] ?? "") !== (f.value ?? "");
        return needsReview(confidenceLevel(f.confidence)) && !edited;
      }).length,
    [fields, draftValues],
  );
  const canApprove = missingRequired.length === 0;

  // Cross-field arithmetic sanity checks (invoices/receipts). Computed live from the draft
  // values so mismatches update as the reviewer edits. Non-blocking warnings — they flag
  // likely OCR errors (a mistyped digit that a human skims past) without gating approval.
  const arithmeticIssues = useMemo(() => {
    const num = (key: string) =>
      parseAmount(key in draftValues ? draftValues[key] : (fields.find((f) => f.key === key)?.value ?? null));
    const subtotal = num("SUBTOTAL");
    const tax = num("TAX");
    const discount = num("DISCOUNT");
    const total = num("TOTAL");
    const lineAmounts = draftItems.map((li) => li.amount).filter((a): a is number => a != null);
    const lineSum = lineAmounts.reduce((s, a) => s + a, 0);
    const tol = (ref: number) => Math.max(0.02, Math.abs(ref) * 0.005);
    const issues: string[] = [];

    // subtotal + tax − discount = total
    if (subtotal != null && total != null) {
      const expected = subtotal + (tax ?? 0) - (discount ?? 0);
      if (Math.abs(expected - total) > tol(total)) {
        const parts = [`Subtotal ${fmtMoney(subtotal)}`];
        if (tax != null) parts.push(`+ tax ${fmtMoney(tax)}`);
        if (discount != null) parts.push(`− discount ${fmtMoney(discount)}`);
        issues.push(`${parts.join(" ")} = ${fmtMoney(expected)}, but Total is ${fmtMoney(total)}`);
      }
    }

    // Σ line amounts ≈ subtotal (or Total when there's no separate subtotal/tax).
    if (lineAmounts.length > 0) {
      const ref = subtotal ?? (tax == null ? total : null);
      const refLabel = subtotal != null ? "Subtotal" : "Total";
      if (ref != null && Math.abs(lineSum - ref) > tol(ref)) {
        issues.push(`Line items sum to ${fmtMoney(lineSum)}, but ${refLabel} is ${fmtMoney(ref)}`);
      }
    }
    return issues;
  }, [draftValues, draftItems, fields]);

  const handleApprove = () => {
    if (!result || !canApprove) return;
    if (
      lowConfidenceCount > 0 &&
      !window.confirm(
        `${lowConfidenceCount} field(s) have low OCR confidence and weren't edited. Approve anyway?`,
      )
    ) {
      return;
    }
    handleStatus("approved");
  };

  const scrollSelectedIntoView = useCallback((node: HTMLElement | null) => {
    node?.scrollIntoView({ block: "nearest" });
  }, []);

  const reviewCount = useMemo(
    () => fields.filter((f) => needsReview(confidenceLevel(f.confidence))).length,
    [fields],
  );
  const visibleFields = onlyReview
    ? fields.filter((f) => needsReview(confidenceLevel(f.confidence)) || f.id === selectedFieldId)
    : fields;

  const hasAnything = fields.length > 0 || draftItems.length > 0 || missingDefs.length > 0;

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
            {(fields.length > 0 || missingDefs.length > 0) && (
              <Section title="Fields">
                <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {/* Required fields Textract didn't detect — empty rows so they can be added. */}
                  {missingDefs.map((d) => (
                    <FieldRow
                      key={`missing-${d.key}`}
                      field={{
                        id: `missing-${d.key}`,
                        key: d.key,
                        label: d.label,
                        dataType: "STRING",
                        detectedValue: null,
                        value: null,
                        numericValue: null,
                        confidence: null,
                        page: 1,
                        boundingBox: null,
                        isEdited: false,
                      }}
                      value={draftValues[d.key] ?? ""}
                      onChange={(v) => setFieldValue(d.key, v)}
                      selected={false}
                      hovered={false}
                      onSelect={onSelectField}
                      onHover={onHoverField}
                      missing
                    />
                  ))}
                  {visibleFields.map((f) => {
                    const selected = f.id === selectedFieldId;
                    return (
                      <FieldRow
                        key={f.id}
                        field={f}
                        value={draftValues[f.key] ?? ""}
                        onChange={(v) => setFieldValue(f.key, v)}
                        selected={selected}
                        hovered={f.id === hoveredFieldId}
                        onSelect={onSelectField}
                        onHover={onHoverField}
                        rowRef={selected ? scrollSelectedIntoView : undefined}
                      />
                    );
                  })}
                </div>
                {onlyReview && visibleFields.length === 0 && missingDefs.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">No fields match this filter.</p>
                )}
              </Section>
            )}

            {draftItems.length > 0 && (
              <Section title={`Line items (${draftItems.length})`}>
                <LineItemsTable
                  items={draftItems}
                  selectedFieldId={selectedFieldId}
                  onSelectField={onSelectField}
                  onHoverField={onHoverField}
                  rowRefForId={scrollSelectedIntoView}
                  onTextChange={setItemText}
                  onNumberChange={setItemNumber}
                />
              </Section>
            )}
          </>
        )}
      </div>

      {/* Footer: validation + save + review workflow */}
      {result && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60">
          {result.status !== "approved" &&
            (missingRequired.length > 0 || lowConfidenceCount > 0 || arithmeticIssues.length > 0) && (
              <div className="px-4 pt-2.5 text-xs space-y-0.5" aria-live="polite">
                {missingRequired.length > 0 && (
                  <p className="inline-flex items-start gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
                    <span>Required to approve: {missingRequired.map((d) => d.label).join(", ")}</span>
                  </p>
                )}
                {arithmeticIssues.map((msg) => (
                  <p key={msg} className="inline-flex items-start gap-1 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
                    <span>{msg}</span>
                  </p>
                ))}
                {lowConfidenceCount > 0 && (
                  <p className="text-amber-600 dark:text-amber-400">
                    {lowConfidenceCount} field{lowConfidenceCount > 1 ? "s" : ""} with low confidence — review recommended
                  </p>
                )}
              </div>
            )}

          <div className="flex items-center justify-between gap-2 px-4 py-3">
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
                <ReviewButton
                  onClick={handleApprove}
                  disabled={dirty || updateStatus.isPending || !canApprove}
                  title={!canApprove ? "Fill required fields to approve" : undefined}
                >
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
        </div>
      )}
    </div>
  );
}

function ReviewButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? (disabled ? "Save changes first" : undefined)}
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

/**
 * One editable + mapped header field. Hovering highlights its box on the document; the
 * locate button selects it (and scrolls the box into view). The detected value is shown
 * beneath the input once the value has been edited, as an audit reference.
 */
function FieldRow({
  field,
  value,
  onChange,
  selected,
  hovered,
  onSelect,
  onHover,
  rowRef,
  missing = false,
}: {
  field: ExtractedField;
  value: string;
  onChange: (value: string) => void;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  rowRef?: (node: HTMLElement | null) => void;
  missing?: boolean;
}) {
  const level = confidenceLevel(field.confidence);
  const review = needsReview(level);
  const locatable = !!field.boundingBox;
  const edited = !missing && (field.isEdited || value !== (field.value ?? ""));
  return (
    <div
      ref={rowRef}
      onMouseEnter={() => onHover(field.id)}
      onMouseLeave={() => onHover(null)}
      onClick={locatable ? () => onSelect(field.id) : undefined}
      className={`flex items-start gap-2 py-2 pl-1 pr-1 rounded-sm border-l-2 transition-colors ${
        locatable ? "cursor-pointer" : ""
      } ${
        selected
          ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400"
          : hovered
            ? "bg-gray-50 dark:bg-gray-700/40 border-transparent"
            : "border-transparent"
      } ${(review || missing) && !selected ? "border-red-400 dark:border-red-500/70" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSelect(field.id)}
        disabled={!locatable}
        aria-label={locatable ? `Locate ${fieldLabel(field)} on document` : undefined}
        aria-pressed={locatable ? selected : undefined}
        title={locatable ? "Locate on document" : "No location for this field"}
        className={`mt-5 p-1 disabled:opacity-30 disabled:hover:text-gray-400 ${
          selected ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        }`}
      >
        <Crosshair className="h-3.5 w-3.5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 dark:text-gray-400">{fieldLabel(field)}</label>
          {missing && (
            <span className="inline-flex items-center rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] px-1 py-0.5">
              required · not detected
            </span>
          )}
          {edited && (
            <>
              <span
                className="inline-flex items-center gap-0.5 text-[10px] text-indigo-500 dark:text-indigo-400"
                title={`Detected: ${field.detectedValue ?? "—"}`}
              >
                <Pencil className="h-2.5 w-2.5" /> edited
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(field.detectedValue ?? "");
                }}
                title={`Revert to OCR value: ${field.detectedValue ?? "—"}`}
                className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <RotateCcw className="h-2.5 w-2.5" /> revert
              </button>
            </>
          )}
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={missing ? "Enter value…" : "—"}
          className={inputClass}
        />
      </div>

      {!missing && <ConfidenceBadge confidence={field.confidence} />}
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
  const ariaLabel =
    confidence == null
      ? "OCR confidence unknown"
      : `OCR confidence ${Math.round(confidence)} percent, ${level}`;
  return (
    <span
      className={`mt-5 shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium tabular-nums ${styles[level]}`}
      title="OCR confidence"
      aria-label={ariaLabel}
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
  selectedFieldId,
  onSelectField,
  onHoverField,
  rowRefForId,
  onTextChange,
  onNumberChange,
}: {
  items: LineItem[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onHoverField: (id: string | null) => void;
  rowRefForId: (node: HTMLElement | null) => void;
  onTextChange: (i: number, field: "description" | "productCode", raw: string) => void;
  onNumberChange: (
    i: number,
    field: "quantity" | "unitPrice" | "amount" | "tax" | "taxRate",
    raw: string,
  ) => void;
}) {
  return (
    // Horizontal scroll: the table keeps a comfortable min width so every column stays
    // readable, and overflows/scrolls inside the panel rather than squashing.
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="w-full min-w-[46rem] text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
          <tr>
            <th className="w-8" />
            <th className="text-right font-medium px-2 py-2 w-10">#</th>
            <th className="text-left font-medium px-2 py-2 min-w-[16rem]">Description</th>
            <th className="text-right font-medium px-2 py-2 min-w-[5rem]">Qty</th>
            <th className="text-right font-medium px-2 py-2 min-w-[7rem]">Unit price</th>
            <th className="text-right font-medium px-2 py-2 min-w-[7rem]">Amount</th>
            <th className="text-right font-medium px-2 py-2 min-w-[6rem]">Tax</th>
            <th className="text-right font-medium px-2 py-2 min-w-[5rem]">Tax %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {items.map((item, i) => {
            const locatable = !!item.boundingBox;
            const selected = item.id === selectedFieldId;
            return (
              <tr
                key={item.id}
                ref={selected ? rowRefForId : undefined}
                onMouseEnter={locatable ? () => onHoverField(item.id) : undefined}
                onMouseLeave={locatable ? () => onHoverField(null) : undefined}
                className={`text-gray-900 dark:text-gray-100 ${
                  selected ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                }`}
              >
                <td className="px-1 py-1 align-top text-center">
                  {locatable && (
                    <button
                      type="button"
                      onClick={() => onSelectField(item.id)}
                      aria-label={`Locate line item ${item.rowIndex + 1} on document`}
                      aria-pressed={selected}
                      title="Locate on document"
                      className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <Crosshair className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
                <td className="px-2 py-1 align-top text-right text-gray-500 dark:text-gray-400 tabular-nums">
                  {item.rowIndex + 1}
                </td>
                <td className="px-1 py-1 align-top">
                  <AutoGrowTextarea
                    value={item.description ?? ""}
                    onChange={(v) => onTextChange(i, "description", v)}
                  />
                </td>
                <NumberCell value={item.quantity} onChange={(v) => onNumberChange(i, "quantity", v)} />
                <NumberCell value={item.unitPrice} onChange={(v) => onNumberChange(i, "unitPrice", v)} />
                <NumberCell value={item.amount} onChange={(v) => onNumberChange(i, "amount", v)} />
                <NumberCell value={item.tax} onChange={(v) => onNumberChange(i, "tax", v)} />
                <NumberCell value={item.taxRate} onChange={(v) => onNumberChange(i, "taxRate", v)} />
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
        className={`${inputClass} text-right tabular-nums`}
      />
    </td>
  );
}

/**
 * Textarea that grows to fit its content so long, wrapped line-item descriptions are
 * fully visible and editable in the cramped table cell (instead of a clipped single row).
 */
function AutoGrowTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={value || undefined}
      className={`${inputClass} resize-none overflow-hidden leading-snug`}
    />
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
