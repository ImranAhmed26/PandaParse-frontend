import type { NormalizedBox, OcrField, OcrTable, OcrTableCell, ParsedOcr } from "../types";

/**
 * Normalize the raw Textract JSON (as written to S3 by the result Lambda) into the
 * uniform `ParsedOcr` shape the editor consumes. Handles both pipelines:
 *  - Expense analysis  -> array of docs with `summaryFields` + `lineItems`
 *  - Document analysis -> array of pages with `keyValuePairs` + `tables`
 *
 * Pure and defensive: returns null for missing/unrecognized input so the editor can
 * fall back gracefully (e.g. to the DB summary) rather than crash.
 */
export function normalizeParsedOcr(parsed: unknown): ParsedOcr | null {
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const first = parsed[0] as Record<string, unknown> | null;
  if (!first || typeof first !== "object") return null;

  if (Array.isArray((first as any).summaryFields)) {
    return normalizeExpense(parsed as any[]);
  }
  if (Array.isArray((first as any).keyValuePairs) || typeof (first as any).page === "number") {
    return normalizeDocument(parsed as any[]);
  }
  return null;
}

// Textract raw box { Left, Top, Width, Height } (0..1) -> our { left, top, width, height }.
function toBox(b: any): NormalizedBox | null {
  if (!b || typeof b.Left !== "number" || typeof b.Top !== "number") return null;
  return { left: b.Left, top: b.Top, width: b.Width, height: b.Height };
}

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function normalizeExpense(docs: any[]): ParsedOcr {
  const fields: OcrField[] = [];
  const lineItems: OcrField[] = [];
  let liIndex = 0;

  docs.forEach((doc, di) => {
    (doc?.summaryFields || []).forEach((f: any, i: number) => {
      fields.push({
        id: `sf-${di}-${i}`,
        label: f?.type ?? null,
        value: f?.value ?? null,
        confidence: num(f?.confidence),
        // Expense summary fields aren't page-tagged by the current parser; default to
        // page 1 (multi-page expense overlay is a known follow-up).
        page: 1,
        box: toBox(f?.boundingBox),
      });
    });

    // One selectable box per line item — the EXPENSE_ROW spans the whole row; fall
    // back to the ITEM cell. Order matches the DB result items (both come from the
    // same doc.lineItems), so rows correlate by index.
    (doc?.lineItems || []).forEach((li: any) => {
      lineItems.push({
        id: `li-${liIndex++}`,
        label: null,
        value: li?.ITEM?.value ?? null,
        confidence: null,
        page: 1,
        box: toBox(li?.EXPENSE_ROW?.boundingBox) ?? toBox(li?.ITEM?.boundingBox),
      });
    });
  });

  return { pageCount: 1, fields, tables: [], lineItems };
}

function normalizeDocument(pages: any[]): ParsedOcr {
  const fields: OcrField[] = [];
  const tables: OcrTable[] = [];
  let pageCount = 1;

  pages.forEach((pg: any) => {
    const page = typeof pg?.page === "number" ? pg.page : 1;
    pageCount = Math.max(pageCount, page);

    (pg?.keyValuePairs || []).forEach((kv: any, i: number) => {
      fields.push({
        id: `kv-${page}-${i}`,
        label: kv?.key ?? null,
        value: kv?.value ?? null,
        confidence: num(kv?.confidence),
        page,
        box: toBox(kv?.boundingBox),
      });
    });

    (pg?.tables || []).forEach((t: any) => {
      const cells: OcrTableCell[] = (t?.cells || []).map((c: any) => ({
        rowIndex: c?.rowIndex,
        columnIndex: c?.columnIndex,
        text: c?.text ?? null,
        confidence: num(c?.confidence),
        page,
        box: toBox(c?.boundingBox),
      }));
      tables.push({ page, cells });
    });
  });

  // Document-analysis results have no expense line items.
  return { pageCount, fields, tables, lineItems: [] };
}
