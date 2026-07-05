// Main Individual Workspace feature exports

// Types
export type * from "./types";

// Store
export { useWorkspaceStore, useWorkspaceSelectors } from "./store/workspaceStore";

// API
export { individualWorkspaceApi } from "./api";

// Hooks
export {
  useWorkspaceDetails,
  useWorkspaceDocuments,
  useDocument,
  useOCRResults,
  useProcessingJobs,
  useUploadDocuments,
  useDeleteDocument,
  useUpdateWorkspace,
  useCancelJob,
  useRetryJob,
  useReprocessDocument,
  useExportDocuments,
  useUpdateOCRResults,
  individualWorkspaceKeys,
} from "./hooks";

// Components
export { WorkspacePage } from "./ui/WorkspacePage";
export { WorkspaceHeader } from "./ui/WorkspaceHeader";
export { WorkspacePageSkeleton } from "./ui/WorkspacePageSkeleton";
export { DocumentTable } from "./ui/DocumentTable";
export { UploadZone } from "./ui/UploadZone";
export { TabNavigation } from "./ui/TabNavigation";
export type { TabType } from "./ui/TabNavigation";
export { DocumentEditor } from "./ui/DocumentEditor";
// Future components to be implemented:
// - ProcessingQueue: Component for monitoring document processing status
