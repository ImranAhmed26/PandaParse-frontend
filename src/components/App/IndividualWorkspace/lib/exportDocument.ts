import type { DocumentResultData } from "../types";

/**
 * Client-side export of a document's corrected values. Dependency-free: JSON and CSV
 * are built as text and downloaded via a Blob. CSV opens directly in Excel/Sheets.
 */

interface ExportDoc {
  id: string;
  fileName: string;
  type: string;
}

function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  return stem.replace(/[^\w.-]+/g, "_") || "document";
}

/** Structured JSON: corrected header fields + line items, order preserved. */
export function buildJson(doc: ExportDoc, result: DocumentResultData): string {
  const payload = {
    document: { id: doc.id, fileName: doc.fileName, type: doc.type },
    docType: result.docType,
    fields: result.fields.map((f) => ({
      key: f.key,
      label: f.label,
      value: f.value,
      confidence: f.confidence,
    })),
    lineItems: result.lineItems.map((li) => ({
      rowIndex: li.rowIndex,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      amount: li.amount,
      tax: li.tax,
      productCode: li.productCode,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  // Quote if the cell contains a comma, quote, or newline; escape quotes by doubling.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

/**
 * CSV with two sections: header fields (Field/Value/Confidence) then line items as a
 * table. A blank line separates them — both open cleanly as sheets in Excel/Sheets.
 */
export function buildCsv(result: DocumentResultData): string {
  const lines: string[] = [];

  lines.push(csvRow(["Field", "Value", "Confidence"]));
  for (const f of result.fields) {
    lines.push(
      csvRow([f.label ?? f.key, f.value, f.confidence == null ? "" : Math.round(f.confidence)]),
    );
  }

  if (result.lineItems.length > 0) {
    lines.push("");
    lines.push("Line Items");
    lines.push(csvRow(["Row", "Description", "Quantity", "Unit Price", "Amount", "Tax", "Product Code"]));
    for (const li of result.lineItems) {
      lines.push(
        csvRow([
          li.rowIndex + 1,
          li.description,
          li.quantity,
          li.unitPrice,
          li.amount,
          li.tax,
          li.productCode,
        ]),
      );
    }
  }

  return lines.join("\r\n");
}

function download(fileName: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export type ExportFormat = "json" | "csv";

export function exportDocument(doc: ExportDoc, result: DocumentResultData, format: ExportFormat) {
  const stem = baseName(doc.fileName);
  if (format === "json") {
    download(`${stem}.json`, buildJson(doc, result), "application/json");
  } else {
    download(`${stem}.csv`, buildCsv(result), "text/csv");
  }
}
