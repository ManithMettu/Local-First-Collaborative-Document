import { z } from "zod";

export const createSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
});

export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>;
