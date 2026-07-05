import { DocumentCard } from "@/components/documents/DocumentCard";
import { DocumentsEmptyState } from "@/components/documents/documents-empty-state";
import { CreateDocumentForm } from "@/components/documents/create-document-form";
import { DocumentsGrid } from "@/components/documents/documents-grid";
import { auth } from "@/lib/auth";
import { documentListInclude } from "@/lib/documents/serializers";
import { db } from "@/lib/db";

export default async function DocumentsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const documents = userId
    ? await db.document.findMany({
        where: {
          OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
        },
        include: documentListInclude,
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const ownedDocuments = documents.filter((document) => document.ownerId === userId);
  const sharedDocuments = documents.filter((document) => document.ownerId !== userId);
  const hasAnyDocuments = documents.length > 0;

  return (
    <div className="w-full min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-10">
        <section className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Your documents
            </h1>
            <CreateDocumentForm />
          </div>

          {!hasAnyDocuments ? (
            <DocumentsEmptyState />
          ) : ownedDocuments.length > 0 ? (
            <DocumentsGrid documents={ownedDocuments} userId={userId!} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                No documents you own yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Create a document with the button above, or open one shared with
                you below.
              </p>
            </div>
          )}
        </section>

        {sharedDocuments.length > 0 ? (
          <section className="space-y-5">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Shared documents
            </h2>
            <DocumentsGrid documents={sharedDocuments} userId={userId!} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
