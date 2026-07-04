import { z } from "zod";

export const summarizeSelectionSchema = z.object({
  text: z.string().trim().min(2).max(4_000),
});

export type SummarizeSelectionInput = z.infer<typeof summarizeSelectionSchema>;
