import type { z } from "zod";

import {
  addCollaboratorSchema,
  collaboratorRoleSchema,
  updateCollaboratorSchema,
} from "@/lib/validations/document";

import type { DocumentRole, UserSummary } from "./types";

export type CollaboratorRole = z.infer<typeof collaboratorRoleSchema>;

export type AddCollaboratorRequest = z.infer<typeof addCollaboratorSchema>;
export type UpdateCollaboratorRequest = z.infer<typeof updateCollaboratorSchema>;

export type SerializedCollaborator = {
  id: string;
  role: DocumentRole;
  userId: string;
  createdAt: string;
  user: UserSummary;
};

export type AddCollaboratorResponse = {
  collaborator: SerializedCollaborator;
};

export type UpdateCollaboratorResponse = {
  collaborator: SerializedCollaborator;
};

export type DocumentCollaboratorRouteContext = {
  params: Promise<{ id: string; collaboratorId: string }>;
};
