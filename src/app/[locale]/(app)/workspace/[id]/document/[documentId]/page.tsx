import { DocumentEditor } from "@/components/App/IndividualWorkspace";
import type { Metadata } from "next";

interface DocumentEditorRouteProps {
  params: Promise<{
    id: string;
    documentId: string;
    locale: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Document Editor | OCRParse",
    description: "Review and correct extracted document data",
  };
}

export default async function DocumentEditorRoute({ params }: DocumentEditorRouteProps) {
  const { id, documentId } = await params;

  return <DocumentEditor workspaceId={id} documentId={documentId} />;
}
