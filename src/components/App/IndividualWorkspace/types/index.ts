// Core data models for Individual Workspace feature

// Document Editor / OCR contract types (viewer, extracted data, editing, export).
export * from "./ocr";

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  stats: WorkspaceStats;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  email: string;
  name: string;
  joinedAt: string;
  lastActiveAt?: string;
}

export interface WorkspaceSettings {
  ocrLanguage: string;
  ocrQuality: "fast" | "balanced" | "accurate";
  autoProcess: boolean;
  retentionDays?: number;
  allowedFileTypes: string[];
  maxFileSize: number;
}

export interface WorkspaceStats {
  totalDocuments: number;
  processingDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  totalStorageUsed: number;
  processingTimeAvg: number;
  lastActivity?: string;
}

export interface Document {
  id: string;
  workspaceId: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  status: DocumentStatus;
  ocrResults?: OCRResult;
  thumbnailUrl?: string;
  downloadUrl: string;
  processingJobId?: string;
  uploadedBy: string;
}

export interface OCRResult {
  id: string;
  documentId: string;
  extractedText: string;
  confidence: number;
  processingTime: number;
  language: string;
  metadata: OCRMetadata;
  regions?: TextRegion[];
  createdAt: string;
  editedText?: string;
  lastEditedAt?: string;
  lastEditedBy?: string;
}

export interface OCRMetadata {
  pageCount: number;
  imageWidth: number;
  imageHeight: number;
  dpi: number;
  processingEngine: string;
  processingVersion: string;
}

export interface TextRegion {
  id: string;
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  wordCount: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessingJob {
  id: string;
  documentId: string;
  workspaceId: string;
  status: JobStatus;
  progress: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
  estimatedTimeRemaining?: number;
}

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  documentId?: string;
}

// Enums and Union Types
export type DocumentStatus = "uploading" | "queued" | "processing" | "completed" | "failed";
export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type UploadStatus = "pending" | "uploading" | "completed" | "failed";
export type WorkspaceRole = "owner" | "editor" | "viewer";
export type ExportFormat = "json" | "csv" | "txt";
export type SortOption = "name" | "date" | "uploaded" | "status" | "confidence" | "size";
export type SortDirection = "asc" | "desc";

// Filter and Search Types
export interface DocumentFilters {
  status?: DocumentStatus[];
  dateRange?: {
    start: string;
    end: string;
  };
  fileTypes?: string[];
  confidenceRange?: {
    min: number;
    max: number;
  };
  uploadedBy?: string[];
}

export interface DocumentSearch {
  query: string;
  searchIn: ("filename" | "content" | "metadata")[];
}

export interface DocumentSort {
  field: SortOption;
  direction: SortDirection;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

// Request Types
export interface GetDocumentsParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  filters?: DocumentFilters;
  search?: DocumentSearch;
  sort?: DocumentSort;
}

export interface UploadDocumentRequest {
  workspaceId: string;
  files: File[];
  autoProcess?: boolean;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface ExportRequest {
  documentIds: string[];
  format: ExportFormat;
  includeMetadata?: boolean;
  includeConfidence?: boolean;
}

// Bulk Delete Types
export interface BulkDeleteResponse {
  successful: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
  totalRequested: number;
  totalSuccessful: number;
  totalFailed: number;
}

export interface WorkspaceDeleteResponse {
  message: string;
  deletedCount: number;
}

// UI State Types
export interface WorkspaceUIState {
  selectedDocument: Document | null;
  selectedDocuments: string[];
  showUploadZone: boolean;
  showProcessingQueue: boolean;
  showSettings: boolean;
  sidebarCollapsed: boolean;
  activeTab: "upload" | "documents";
}

// Error Types
export interface WorkspaceError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface UploadError extends WorkspaceError {
  filename: string;
  fileSize: number;
}

export interface ProcessingError extends WorkspaceError {
  documentId: string;
  jobId: string;
  retryable: boolean;
}

// Component Props Types
export interface WorkspacePageProps {
  workspaceId: string;
}

export interface UploadZoneProps {
  workspaceId: string;
  onUploadStart: (files: File[]) => void;
  onUploadProgress: (progress: UploadItem[]) => void;
  onUploadComplete: (documents: Document[]) => void;
  onUploadError: (error: UploadError) => void;
  disabled?: boolean;
}
