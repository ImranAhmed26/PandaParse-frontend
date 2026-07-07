"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileWarning,
  Loader2,
  PanelRight,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useDocumentOcr, useWorkspaceDocumentNav } from "../hooks";
import { useWorkspaceStore } from "../store/workspaceStore";
import type { OverlayBox } from "../types";
import { exportDocument, type ExportFormat } from "../lib/exportDocument";
import { DocumentDataPanel } from "./DocumentDataPanel";

// react-pdf / pdf.js touch browser-only APIs — load the viewer client-side only.
const DocumentFileViewer = dynamic(
  () => import("./DocumentFileViewer").then((m) => m.DocumentFileViewer),
  {
    ssr: false,
    loading: () => <ViewerLoadingPane />,
  },
);

interface DocumentEditorProps {
  workspaceId: string;
  documentId: string;
}

/**
 * Full-page Document Editor / Review.
 *
 * Phase 2 adds the left-pane document viewer (PDF/image) backed by the single
 * `GET /documents/:id/ocr` payload. The right-pane extracted-data panel, bounding-box
 * overlay, inline editing, cross-document prev/next, and export arrive in later phases;
 * their controls are rendered disabled so the layout stays stable.
 */
export function DocumentEditor({ workspaceId, documentId }: DocumentEditorProps) {
  const { data, isLoading, isError } = useDocumentOcr(documentId);
  const title = data?.document.fileName ?? "Document";

  const result = data?.result ?? null;

  // Boxes drawn on the document = header fields + line-item rows (both selectable). Ids
  // match the data-panel rows exactly, which is what makes selection sync work.
  const overlayBoxes = useMemo<OverlayBox[]>(() => {
    if (!result) return [];
    const fieldBoxes: OverlayBox[] = result.fields
      .filter((f) => f.boundingBox)
      .map((f) => ({ id: f.id, page: f.page, box: f.boundingBox!, label: f.label ?? f.key }));
    const rowBoxes: OverlayBox[] = result.lineItems
      .filter((li) => li.boundingBox)
      .map((li) => ({ id: li.id, page: 1, box: li.boundingBox!, label: li.description }));
    return [...fieldBoxes, ...rowBoxes];
  }, [result]);

  // Shared selection between the viewer overlay and the data panel — lifted here so both
  // stay in sync. Local state; no global store needed.
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [hoveredFieldId, setHoveredFieldId] = useState<string | null>(null);

  // Reset selection when navigating to a different document.
  useEffect(() => {
    setSelectedFieldId(null);
    setHoveredFieldId(null);
  }, [documentId]);

  // Unsaved-changes guard shared by the back button and cross-document navigation
  // (the panel reports its dirty state up here).
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const guardedNavigate = (path: string) => {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
    router.push(path);
  };
  const handleBack = () => guardedNavigate(`/workspace/${workspaceId}`);

  // Cross-document navigation: the ordered workspace list (same order as the table),
  // matched to the current document to compute Previous / Next and "N of M".
  const filters = useWorkspaceStore((s) => s.filters);
  const search = useWorkspaceStore((s) => s.search);
  const sort = useWorkspaceStore((s) => s.sort);
  const { data: navData } = useWorkspaceDocumentNav(workspaceId, { filters, search, sort });
  const navDocs = navData?.data ?? [];
  const currentIndex = navDocs.findIndex((d) => d.id === documentId);
  const total = navData?.total ?? navDocs.length;
  const prevDoc = currentIndex > 0 ? navDocs[currentIndex - 1] : null;
  const nextDoc =
    currentIndex >= 0 && currentIndex < navDocs.length - 1 ? navDocs[currentIndex + 1] : null;
  const goToDoc = (id: string) =>
    guardedNavigate(`/workspace/${workspaceId}/document/${id}`);

  // Export the current document's corrected values. Disabled while there are unsaved
  // edits so the export never silently omits them.
  const [exportOpen, setExportOpen] = useState(false);
  const canExport = !!data?.document && !!result && !dirty;
  const handleExport = (format: ExportFormat) => {
    if (!data?.document || !result) return;
    exportDocument(
      { id: data.document.id, fileName: data.document.fileName, type: data.document.type },
      result,
      format,
    );
    setExportOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header: back + title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors border border-gray-300 dark:border-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Workspace
          </button>
          <div className="min-w-0">
            <h1
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate"
              title={title}
            >
              {isLoading ? "Loading…" : title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Document review &amp; correction</p>
          </div>
        </div>

        {/* Export the current document's corrected values (JSON / CSV) */}
        <div
          className="relative self-start sm:self-auto"
          onKeyDown={(e) => {
            if (e.key === "Escape") setExportOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setExportOpen((o) => !o)}
            disabled={!canExport}
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            title={
              !result
                ? "No extracted data to export"
                : dirty
                  ? "Save changes to export"
                  : "Export corrected values"
            }
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {exportOpen && canExport && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <div
                role="menu"
                aria-label="Export format"
                className="absolute right-0 mt-1 z-20 w-44 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleExport("json")}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  JSON
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  CSV <span className="text-gray-400 dark:text-gray-500">(Excel)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toolbar: cross-document navigation */}
      <div className="flex items-center justify-between border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2">
        <button
          type="button"
          onClick={() => prevDoc && goToDoc(prevDoc.id)}
          disabled={!prevDoc}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-700 dark:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {currentIndex >= 0 ? `Document ${currentIndex + 1} of ${total}` : "Document"}
        </span>
        <button
          type="button"
          onClick={() => nextDoc && goToDoc(nextDoc.id)}
          disabled={!nextDoc}
          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-700 dark:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Two-pane layout: viewer (left, wider) + extracted data (right).
          The document is the focus of review, so it gets 3/5 of the width on desktop. */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* Left: document viewer */}
        <div className="min-w-0 lg:col-span-3">
          {isLoading ? (
            <ViewerLoadingPane />
          ) : isError ? (
            <ViewerMessagePane
              icon={<FileWarning className="h-8 w-8" />}
              title="Couldn't load this document"
              subtitle="Please go back and try again."
            />
          ) : data?.fileUrl ? (
            <DocumentFileViewer
              fileUrl={data.fileUrl}
              fileName={data.document.fileName}
              boxes={overlayBoxes}
              selectedFieldId={selectedFieldId}
              hoveredFieldId={hoveredFieldId}
              onSelectField={setSelectedFieldId}
              onHoverField={setHoveredFieldId}
            />
          ) : (
            <ViewerMessagePane
              icon={<FileWarning className="h-8 w-8" />}
              title="File unavailable"
              subtitle="No file is associated with this document."
            />
          )}
        </div>

        {/* Right: extracted data */}
        <div className="min-w-0 lg:col-span-2">
          {isLoading ? (
            <ViewerLoadingPane />
          ) : isError ? (
            <ViewerMessagePane
              icon={<PanelRight className="h-8 w-8" />}
              title="Data unavailable"
              subtitle="Couldn't load the extracted data for this document."
            />
          ) : (
            <DocumentDataPanel
              result={result}
              documentId={documentId}
              selectedFieldId={selectedFieldId}
              hoveredFieldId={hoveredFieldId}
              onSelectField={setSelectedFieldId}
              onHoverField={setHoveredFieldId}
              onDirtyChange={setDirty}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ViewerLoadingPane() {
  return (
    <div className="h-[75vh] border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/40 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
    </div>
  );
}

function ViewerMessagePane({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="h-[75vh] border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800/40 flex items-center justify-center">
      <div className="text-center px-6">
        <div className="mx-auto mb-3 text-gray-300 dark:text-gray-600 flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-xs">{subtitle}</p>
      </div>
    </div>
  );
}
