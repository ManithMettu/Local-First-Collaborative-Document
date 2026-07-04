import { z } from "zod";

export const collaboratorRoleSchema = z.enum(["EDITOR", "VIEWER"]);

export const addCollaboratorSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  role: collaboratorRoleSchema,
});

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  collaborators: z.array(addCollaboratorSchema).max(20).optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
});

export const updateCollaboratorSchema = z.object({
  role: collaboratorRoleSchema,
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type AddCollaboratorInput = z.infer<typeof addCollaboratorSchema>;
export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorSchema>;
