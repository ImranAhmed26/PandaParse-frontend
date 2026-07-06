"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileWarning,
  Loader2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { OcrField } from "../types";

// Bundle the pdf.js worker locally (no CDN — CSP-safe). Resolved by the bundler.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "tif"];
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

interface DocumentFileViewerProps {
  fileUrl: string;
  fileName: string;
  fields: OcrField[];
  selectedFieldId: string | null;
  hoveredFieldId: string | null;
  onSelectField: (id: string) => void;
  onHoverField: (id: string | null) => void;
}

type FileKind = "pdf" | "image";

function detectKind(fileName: string): FileKind {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  return "pdf"; // default to PDF — the common case for invoices/statements
}

/**
 * Left-pane document viewer: renders a PDF (via react-pdf) or an image with zoom and,
 * for multi-page PDFs, page navigation. Draws a bounding-box overlay of the OCR fields
 * on top of the current page — selecting a field highlights its box, and clicking a box
 * selects the field. Boxes are positioned in percentages of the page wrapper, so they
 * track zoom without any pixel math.
 */
export function DocumentFileViewer({
  fileUrl,
  fileName,
  fields,
  selectedFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
}: DocumentFileViewerProps) {
  const kind = useMemo(() => detectKind(fileName), [fileName]);

  const [scale, setScale] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // When a field is selected (e.g. from the data panel), jump to its page.
  useEffect(() => {
    if (!selectedFieldId) return;
    const f = fields.find((x) => x.id === selectedFieldId);
    if (f?.box) setPageNumber((p) => (f.page !== p ? f.page : p));
  }, [selectedFieldId, fields]);

  // Boxes to draw on the page currently in view (images are single-page → page 1).
  const currentPage = kind === "image" ? 1 : pageNumber;
  const pageFields = useMemo(
    () => fields.filter((f) => f.box && f.page === currentPage),
    [fields, currentPage],
  );

  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  const resetZoom = () => setScale(1);

  const goPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const goNextPage = () => setPageNumber((p) => Math.min(numPages || 1, p + 1));

  const overlay = (
    <BoxOverlay
      fields={pageFields}
      selectedFieldId={selectedFieldId}
      hoveredFieldId={hoveredFieldId}
      onSelectField={onSelectField}
      onHoverField={onHoverField}
    />
  );

  return (
    <div className="flex flex-col h-[75vh] border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/40">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60">
        {kind === "pdf" && numPages > 1 ? (
          <div className="flex items-center gap-1">
            <ToolbarButton onClick={goPrevPage} disabled={pageNumber <= 1} label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </ToolbarButton>
            <span className="text-xs text-gray-600 dark:text-gray-300 tabular-nums px-1">
              {pageNumber} / {numPages}
            </span>
            <ToolbarButton onClick={goNextPage} disabled={pageNumber >= numPages} label="Next page">
              <ChevronRight className="h-4 w-4" />
            </ToolbarButton>
          </div>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[50%]" title={fileName}>
            {fileName}
          </span>
        )}

        <div className="flex items-center gap-1">
          <ToolbarButton onClick={zoomOut} disabled={scale <= MIN_SCALE} label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </ToolbarButton>
          <button
            type="button"
            onClick={resetZoom}
            className="text-xs text-gray-600 dark:text-gray-300 tabular-nums px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[3rem]"
            title="Reset zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <ToolbarButton onClick={zoomIn} disabled={scale >= MAX_SCALE} label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </ToolbarButton>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Scrollable canvas area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center min-h-full">
          {kind === "image" ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={fileName}
                style={{ width: `${scale * 100}%`, maxWidth: "none" }}
                className="h-auto rounded shadow-sm"
              />
              {overlay}
            </div>
          ) : pdfError ? (
            <ViewerError message={pdfError} fileUrl={fileUrl} />
          ) : (
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages: n }) => {
                setNumPages(n);
                setPdfError(null);
                setPageNumber((p) => Math.min(p, n));
              }}
              onLoadError={(err) => setPdfError(err?.message || "Failed to load PDF")}
              loading={<ViewerLoading />}
              error={<ViewerError message="Failed to load PDF" fileUrl={fileUrl} />}
            >
              <div className="relative inline-block shadow-sm">
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={<ViewerLoading />}
                />
                {overlay}
              </div>
            </Document>
          )}
        </div>
      </div>
    </div>
  );
}

function BoxOverlay({
  fields,
  selectedFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
}: {
  fields: OcrField[];
  selectedFieldId: string | null;
  hoveredFieldId: string | null;
  onSelectField: (id: string) => void;
  onHoverField: (id: string | null) => void;
}) {
  // Stable callback ref: fires when a box becomes selected (or remounts after a page
  // switch), scrolling it into view — but not on unrelated re-renders (e.g. hover).
  const scrollIntoView = useCallback((node: HTMLButtonElement | null) => {
    node?.scrollIntoView({ block: "center", inline: "center" });
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {fields.map((f) => {
        const box = f.box;
        if (!box) return null;
        const selected = f.id === selectedFieldId;
        const hovered = f.id === hoveredFieldId;
        return (
          <button
            key={f.id}
            type="button"
            ref={selected ? scrollIntoView : undefined}
            onClick={() => onSelectField(f.id)}
            onMouseEnter={() => onHoverField(f.id)}
            onMouseLeave={() => onHoverField(null)}
            aria-label={f.label ?? "field"}
            style={{
              left: `${box.left * 100}%`,
              top: `${box.top * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
            }}
            className={`absolute pointer-events-auto rounded-[2px] border transition-colors ${
              selected
                ? "border-indigo-500 bg-indigo-500/25 ring-1 ring-indigo-500"
                : hovered
                  ? "border-indigo-400 bg-indigo-400/15"
                  : "border-amber-400/50 bg-amber-300/10 hover:bg-amber-300/25"
            }`}
          />
        );
      })}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="p-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function ViewerLoading() {
  return (
    <div className="flex items-center justify-center py-16 text-gray-400 dark:text-gray-500">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

function ViewerError({ message, fileUrl }: { message: string; fileUrl: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <FileWarning className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-3" />
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Couldn&apos;t display this file</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-xs">{message}</p>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open the file directly
      </a>
    </div>
  );
}
