// Workspace Types
export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  companyId?: string;
  documentCount?: number;
  jobsCount?: number;
}

export interface CreateWorkspaceRequest {
  name: string;
  addAllUsers?: boolean;
  userList?: string[];
}

export interface UpdateWorkspaceRequest {
  name?: string;
}

export interface WorkspaceFilters {
  search?: string;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface WorkspaceState {
  selectedWorkspace: Workspace | null;
  filters: WorkspaceFilters;
  isCreating: boolean;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type WorkspaceListResponse = PaginatedResponse<Workspace>;

// Re-export for convenience
export type { Workspace as WorkspaceType };
