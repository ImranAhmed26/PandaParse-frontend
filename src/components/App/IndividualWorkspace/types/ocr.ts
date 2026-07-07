// Shared OCR / Document-Editor contract types.
// Mirrors the backend `GET /documents/:id/ocr` payload and the editable document result.
// The backend now materializes a curated, canonical per-field model (ExtractedField +
// LineItem), each field carrying its own bounding box — so the client no longer needs to
// normalize raw Textract JSON.

/** Textract-style normalized bounding box. All values are fractions (0..1) of the page. */
export interface NormalizedBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type FieldDataType = "STRING" | "NUMBER" | "DATE" | "CURRENCY";

/**
 * One canonical header field (vendor, total, date, …). Carries the original OCR
 * detection (`detectedValue` + `confidence` + `boundingBox`) and the current/corrected
 * `value`. `isEdited` is true once `value` diverges from `detectedValue`.
 */
export interface ExtractedField {
  id: string;
  key: string;
  label: string | null;
  dataType: FieldDataType;
  detectedValue: string | null;
  value: string | null;
  confidence: number | null;
  page: number;
  boundingBox: NormalizedBox | null;
  isEdited: boolean;
}

/** One line-item row: typed, editable columns plus its row bounding box for mapping. */
export interface LineItem {
  id: string;
  rowIndex: number;
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
  tax: number | null;
  productCode: string | null;
  boundingBox: NormalizedBox | null;
  confidence: number | null;
  /** Raw per-cell OCR detail keyed by Textract type; opaque to the UI. */
  cells: Record<string, unknown> | null;
}

/** A selectable box drawn on the document — unifies header fields and line-item rows. */
export interface OverlayBox {
  id: string;
  page: number;
  box: NormalizedBox;
  label: string | null;
}

export type DocumentResultStatus = "draft" | "reviewed" | "approved";

/** Editable, DB-backed structured result for a document. */
export interface DocumentResultData {
  id: string;
  status: DocumentResultStatus;
  docType: string;
  fields: ExtractedField[];
  lineItems: LineItem[];
  reviewedAt: string | null;
  approvedAt: string | null;
}

/**
 * Response of `GET /documents/:id/ocr` — everything the editor needs in one call.
 * `fileUrl` is a short-lived presigned GET; `result` is null until processing produces one.
 * `parsed` (raw Textract JSON) is still returned as the archive but is no longer consumed
 * by the UI — fields carry their own boxes.
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

/** One corrected header field, matched/created by canonical key. */
export interface FieldEdit {
  key: string;
  value: string | null;
}

/** One corrected line-item row. Replaces the stored row at `rowIndex`. */
export interface LineItemEdit {
  rowIndex?: number;
  description?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  amount?: number | null;
  tax?: number | null;
  productCode?: string | null;
}

/** Body for `PATCH /document-results/:id`. Provided fields replace stored values. */
export interface UpdateDocumentResultPayload {
  fields?: FieldEdit[];
  lineItems?: LineItemEdit[];
}
