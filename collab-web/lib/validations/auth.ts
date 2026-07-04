import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  image: z
    .union([
      z.string().trim().url("Enter a valid image URL").max(500),
      z.literal(""),
    ])
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
