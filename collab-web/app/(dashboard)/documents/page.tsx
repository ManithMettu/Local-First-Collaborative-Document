import { DocumentCard } from "@/components/documents/DocumentCard";
import { DocumentsEmptyState } from "@/components/documents/documents-empty-state";
import { CreateDocumentForm } from "@/components/documents/create-document-form";
import { auth } from "@/lib/auth";
import { documentListInclude } from "@/lib/documents/serializers";
import { db } from "@/lib/db";
import type { DocumentRole } from "@/lib/generated/prisma/enums";

function resolveRole(
  ownerId: string,
  userId: string,
  collaborators: Array<{ userId: string; role: DocumentRole }>,
): DocumentRole {
  if (ownerId === userId) {
    return "OWNER";
  }

  return collaborators.find((entry) => entry.userId === userId)?.role ?? "VIEWER";
}

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

  return (
    <div className="w-full min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Your documents
          </h1>
          
        </div>
        <CreateDocumentForm />
      </div>

      {documents.length === 0 ? (
        <DocumentsEmptyState />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {documents.map((document) => {
            const role = userId
              ? resolveRole(document.ownerId, userId, document.collaborators)
              : "VIEWER";

            return (
              <DocumentCard
                key={document.id}
                id={document.id}
                title={document.title}
                updatedAt={document.updatedAt}
                role={role}
                collaboratorCount={document.collaborators.length}
              />
            );
          })}
        </ul>
      )}
      </div>
    </div>
  );
}
