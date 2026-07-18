import { WorkspacePage } from "@/components/App/IndividualWorkspace";
import type { Metadata } from "next";

interface WorkspacePageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateMetadata({ params }: WorkspacePageProps): Promise<Metadata> {
  // const { id } = await params;

  // TODO: Fetch workspace name from API to show in title
  // For now, use a generic title instead of showing the workspace ID
  return {
    title: `Workspace | OCRParse`,
    description: "Individual workspace for document processing and OCR management",
  };
}

export default async function WorkspacePageRoute({ params }: WorkspacePageProps) {
  const { id } = await params;

  return <WorkspacePage workspaceId={id} />;
}
