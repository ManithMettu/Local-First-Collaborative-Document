import type { z } from "zod";

import {
  createDocumentSchema,
  updateDocumentSchema,
} from "@/lib/validations/document";

import type { SerializedCollaborator } from "./collaborator";
import type { DocumentRole, UserSummary } from "./types";

export type CreateDocumentRequest = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentRequest = z.infer<typeof updateDocumentSchema>;

export type SerializedDocument = {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  role: DocumentRole;
  owner: UserSummary;
  collaborators: SerializedCollaborator[];
};

export type SerializedDocumentSummary = {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  role: DocumentRole;
  owner: UserSummary;
  collaboratorCount: number;
};

export type ListDocumentsResponse = {
  documents: SerializedDocumentSummary[];
};

export type CreateDocumentResponse = {
  document: SerializedDocument;
};

export type GetDocumentResponse = {
  document: SerializedDocument;
};

export type UpdateDocumentResponse = {
  document: SerializedDocument;
};

export type DocumentIdRouteContext = {
  params: Promise<{ id: string }>;
};
