import type { DocumentRole } from "@/lib/generated/prisma/enums";

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

export const documentListInclude = {
  owner: { select: userSummarySelect },
  collaborators: {
    include: {
      user: { select: userSummarySelect },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export type DocumentWithRelations = {
  id: string;
  title: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  collaborators: Array<{
    id: string;
    role: DocumentRole;
    userId: string;
    createdAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
};

export function serializeCollaborator(
  collaborator: DocumentWithRelations["collaborators"][number],
) {
  return {
    id: collaborator.id,
    role: collaborator.role,
    userId: collaborator.userId,
    createdAt: collaborator.createdAt.toISOString(),
    user: collaborator.user,
  };
}

export function serializeDocument(
  document: DocumentWithRelations,
  role: DocumentRole,
) {
  return {
    id: document.id,
    title: document.title,
    ownerId: document.ownerId,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    role,
    owner: document.owner,
    collaborators: document.collaborators.map(serializeCollaborator),
  };
}

export function serializeDocumentSummary(
  document: DocumentWithRelations,
  role: DocumentRole,
) {
  return {
    id: document.id,
    title: document.title,
    ownerId: document.ownerId,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    role,
    owner: document.owner,
    collaboratorCount: document.collaborators.length,
  };
}
