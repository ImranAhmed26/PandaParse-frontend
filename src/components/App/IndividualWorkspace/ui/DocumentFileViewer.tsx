"use client";

import { useMemo, useState } from "react";
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
}

type FileKind = "pdf" | "image";

function detectKind(fileName: string): FileKind {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  // Default to PDF — the common case for invoices/statements.
  return "pdf";
}

/**
 * Left-pane document viewer: renders a PDF (via react-pdf) or an image with zoom and,
 * for multi-page PDFs, page navigation. The rendered page sits in a positioned wrapper
 * so a bounding-box overlay can be layered on top in a later phase.
 */
export function DocumentFileViewer({ fileUrl, fileName }: DocumentFileViewerProps) {
  const kind = useMemo(() => detectKind(fileName), [fileName]);

  const [scale, setScale] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  const resetZoom = () => setScale(1);

  const goPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const goNextPage = () => setPageNumber((p) => Math.min(numPages || 1, p + 1));

  return (
    <div className="flex flex-col h-[75vh] border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/40">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60">
        {/* PDF page navigation */}
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

        {/* Zoom + open */}
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
              </div>
            </Document>
          )}
        </div>
      </div>
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
