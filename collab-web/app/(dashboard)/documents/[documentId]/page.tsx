import { notFound } from "next/navigation";

import { DocumentEditorPage } from "@/components/documents/document-editor-page";
import { requireDocumentAccess } from "@/lib/documents/access";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

type DocumentPageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function DocumentPage({ params }: DocumentPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const { documentId } = await params;

  const access = await requireDocumentAccess(session.user.id, documentId);
  if (!access.ok) {
    notFound();
  }

  const document = await db.document.findUnique({
    where: { id: documentId },
    select: { id: true, title: true },
  });

  if (!document) {
    notFound();
  }

  return (
    <DocumentEditorPage
      documentId={document.id}
      title={document.title}
      role={access.role}
    />
  );
}
