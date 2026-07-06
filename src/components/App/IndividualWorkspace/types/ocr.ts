// Shared OCR / Document-Editor contract types.
// Mirrors the backend `GET /documents/:id/ocr` payload and the editable document result.
// These are the stable vocabulary the editor phases build on; the raw Textract JSON is
// normalized into `ParsedOcr` by a client-side function introduced in a later phase.

/** Textract-style normalized bounding box. All values are fractions (0..1) of the page. */
export interface NormalizedBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A single extracted field with its detected location and confidence. */
export interface OcrField {
  id: string;
  /** Field type / key text, e.g. "VENDOR_NAME" or a key/value key. */
  label: string | null;
  value: string | null;
  /** Confidence as reported by Textract (0..100), or null when unknown. */
  confidence: number | null;
  /** 1-based page number the field was detected on. */
  page: number;
  box: NormalizedBox | null;
}

export interface OcrTableCell {
  rowIndex: number;
  columnIndex: number;
  text: string | null;
  confidence: number | null;
  page: number;
  box: NormalizedBox | null;
}

export interface OcrTable {
  page: number;
  cells: OcrTableCell[];
}

/** Viewer-ready OCR data produced by normalizing the raw Textract JSON. */
export interface ParsedOcr {
  pageCount: number;
  fields: OcrField[];
  tables: OcrTable[];
  /**
   * One entry per detected expense line item, in the same order as the DB result
   * items — each carries the row's bounding box (Textract EXPENSE_ROW) so line-item
   * rows can be located on the document. Empty for document-analysis results.
   */
  lineItems: OcrField[];
}

/** Editable line item (mirrors the backend InvoiceItem). */
export interface DocumentResultItem {
  id?: string;
  name: string | null;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
  tax: number | null;
}

export type DocumentResultStatus = "draft" | "reviewed" | "approved";

/** Editable, DB-backed structured result for a document. */
export interface DocumentResultData {
  id: string;
  status: DocumentResultStatus;
  summary: Record<string, unknown> | null;
  items: DocumentResultItem[];
  reviewedAt: string | null;
  approvedAt: string | null;
}

/**
 * Response of `GET /documents/:id/ocr` — everything the editor needs in one call.
 * `fileUrl` is a short-lived presigned GET; `result` is null until processing produces one;
 * `parsed` is the raw Textract JSON (normalized into `ParsedOcr` client-side later).
 */
export interface DocumentOcrResponse {
  document: {
    id: string;
    fileName: string;
    type: string;
    status: string;
  };
  fileUrl: string | null;
  result: DocumentResultData | null;
  parsed: unknown | null;
}

/** Body for `PATCH /document-results/:id`. Provided fields replace stored values. */
export interface UpdateDocumentResultPayload {
  summary?: Record<string, unknown>;
  items?: DocumentResultItem[];
}
