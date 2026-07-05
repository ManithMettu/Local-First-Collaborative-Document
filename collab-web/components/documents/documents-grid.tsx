import { DocumentCard } from "@/components/documents/DocumentCard";
import type { DocumentRole } from "@/lib/generated/prisma/enums";

export type DocumentListItem = {
  id: string;
  title: string;
  updatedAt: Date;
  ownerId: string;
  collaborators: Array<{ userId: string; role: DocumentRole }>;
};

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

type DocumentsGridProps = {
  documents: DocumentListItem[];
  userId: string;
};

export function DocumentsGrid({ documents, userId }: DocumentsGridProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          id={document.id}
          title={document.title}
          updatedAt={document.updatedAt}
          role={resolveRole(document.ownerId, userId, document.collaborators)}
          collaboratorCount={document.collaborators.length}
        />
      ))}
    </ul>
  );
}
