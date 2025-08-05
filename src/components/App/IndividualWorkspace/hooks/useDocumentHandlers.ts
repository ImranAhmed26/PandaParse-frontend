import { useWorkspaceStore } from "../store/workspaceStore";
import {
  useDeleteDocument,
  useBulkDeleteDocuments,
  useDeleteAllWorkspaceDocuments,
  useReprocessDocument,
  useExportDocuments,
} from "./index";

/**
 * Custom hook that provides all document-related handlers
 * Centralizes document operations and reduces component complexity
 */
export function useDocumentHandlers() {
  const documents = useWorkspaceStore((state) => state.documents);
  const selectedDocuments = useWorkspaceStore((state) => state.ui.selectedDocuments);
  const setActiveTab = useWorkspaceStore((state) => state.setActiveTab);
  const toggleDocumentSelection = useWorkspaceStore((state) => state.toggleDocumentSelection);
  const selectAllDocuments = useWorkspaceStore((state) => state.selectAllDocuments);
  const clearSelection = useWorkspaceStore((state) => state.clearSelection);

  const deleteDocumentMutation = useDeleteDocument();
  const bulkDeleteDocumentsMutation = useBulkDeleteDocuments();
  const deleteAllWorkspaceDocumentsMutation = useDeleteAllWorkspaceDocuments();
  const reprocessDocumentMutation = useReprocessDocument();
  const exportDocumentsMutation = useExportDocuments();

  // Handle document selection
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDocumentSelect = (_document: any) => {
    // TODO: Open document viewer
  };

  // Handle document deletion with confirmation
  const handleDocumentDelete = async (documentId: string) => {
    const document = documents.find((doc) => doc.id === documentId);
    if (!document) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${document.originalName}"?\n\nThis action cannot be undone.`
    );

    if (confirmed) {
      try {
        await deleteDocumentMutation.mutateAsync(documentId);
      } catch (error) {
        console.error("Failed to delete document:", error);
      }
    }
  };

  // Handle document reprocessing
  const handleDocumentReprocess = async (documentId: string) => {
    try {
      await reprocessDocumentMutation.mutateAsync(documentId);
    } catch (error) {
      console.error("Failed to reprocess document:", error);
    }
  };

  // Handle document download
  const handleDocumentDownload = (documentId: string) => {
    const document = documents.find((doc) => doc.id === documentId);
    if (document?.downloadUrl) {
      window.open(document.downloadUrl, "_blank");
    }
  };

  // Handle upload completion
  const handleUploadComplete = () => {
    // Switch to documents tab after successful upload
    setActiveTab("documents");
  };

  // Handle individual document selection toggle
  const handleDocumentToggle = (documentId: string) => {
    toggleDocumentSelection(documentId);
  };

  // Handle select all toggle
  const handleSelectAll = () => {
    const allSelected = documents.length > 0 && selectedDocuments.length === documents.length;
    if (allSelected) {
      clearSelection();
    } else {
      selectAllDocuments();
    }
  };

  // Handle bulk delete operation
  const handleBulkDelete = async () => {
    if (selectedDocuments.length === 0) return;

    // Validate maximum limit (100 documents as per backend)
    if (selectedDocuments.length > 100) {
      alert(`Cannot delete more than 100 documents at once. You have selected ${selectedDocuments.length} documents.`);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedDocuments.length} selected document(s)?\n\nThis action cannot be undone.`
    );

    if (confirmed) {
      try {
        const result = await bulkDeleteDocumentsMutation.mutateAsync(selectedDocuments);

        // Show detailed results to user
        if (result.totalFailed > 0) {
          const failedMessages = result.failed.map((f) => `• ${f.id}: ${f.error}`).join("\n");
          alert(
            `Bulk delete completed with some failures:\n\n` +
              `✅ Successfully deleted: ${result.totalSuccessful} documents\n` +
              `❌ Failed to delete: ${result.totalFailed} documents\n\n` +
              `Failed documents:\n${failedMessages}`
          );
        } else {
          // All successful - no need for alert, the success message will show via toast/notification
        }

        // Clear selection after operation (regardless of partial failures)
        clearSelection();
      } catch (error) {
        console.error("Failed to bulk delete documents:", error);
        // Keep selection intact for retry
      }
    }
  };

  // Handle bulk reprocess operation
  const handleBulkReprocess = async () => {
    if (selectedDocuments.length === 0) return;

    const confirmed = window.confirm(`Are you sure you want to reprocess ${selectedDocuments.length} selected document(s)?`);

    if (confirmed) {
      try {
        // Reprocess documents one by one
        for (const documentId of selectedDocuments) {
          await reprocessDocumentMutation.mutateAsync(documentId);
        }
        // Clear selection after successful bulk reprocess
        clearSelection();
      } catch (error) {
        console.error("Failed to reprocess documents:", error);
        // Keep selection intact for retry
      }
    }
  };

  // Handle bulk export operation
  const handleBulkExport = async () => {
    if (selectedDocuments.length === 0) return;

    try {
      await exportDocumentsMutation.mutateAsync({
        documentIds: selectedDocuments,
        format: "json",
        includeMetadata: true,
        includeConfidence: true,
      });

      // The export hook will handle opening the download URL
      console.log(`Export completed for ${selectedDocuments.length} documents`);

      // Clear selection after successful export
      clearSelection();
    } catch (error) {
      console.error("Failed to export documents:", error);
    }
  };

  // Handle export all operation
  const handleExportAll = async () => {
    if (documents.length === 0) return;

    const allDocumentIds = documents.map((doc) => doc.id);

    try {
      await exportDocumentsMutation.mutateAsync({
        documentIds: allDocumentIds,
        format: "json",
        includeMetadata: true,
        includeConfidence: true,
      });

      console.log(`Export completed for all ${documents.length} documents`);
    } catch (error) {
      console.error("Failed to export all documents:", error);
    }
  };

  // Handle delete all workspace documents
  const handleDeleteAllWorkspaceDocuments = async (workspaceId: string) => {
    if (documents.length === 0) return;

    const confirmed = window.confirm(
      `⚠️ DANGER: Delete ALL documents in this workspace?\n\n` +
        `This will permanently delete all ${documents.length} documents in this workspace.\n\n` +
        `This action cannot be undone!\n\n` +
        `Type "DELETE ALL" in the next prompt to confirm.`
    );

    if (confirmed) {
      const confirmText = prompt(`To confirm deletion of ALL ${documents.length} documents, type "DELETE ALL" (case sensitive):`);

      if (confirmText === "DELETE ALL") {
        try {
          await deleteAllWorkspaceDocumentsMutation.mutateAsync(workspaceId);
          console.log(`All documents deleted from workspace: ${workspaceId}`);
        } catch (error) {
          console.error("Failed to delete all workspace documents:", error);
        }
      } else {
        alert("Deletion cancelled - confirmation text did not match.");
      }
    }
  };

  return {
    handleDocumentSelect,
    handleDocumentDelete,
    handleDocumentReprocess,
    handleDocumentDownload,
    handleUploadComplete,
    handleDocumentToggle,
    handleSelectAll,
    handleBulkDelete,
    handleBulkReprocess,
    handleBulkExport,
    handleExportAll,
    handleDeleteAllWorkspaceDocuments,
  };
}
