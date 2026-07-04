import type {
  DocumentRole,
  SnapshotKind,
} from "@/lib/generated/prisma/enums";

export type { DocumentRole, SnapshotKind };

export type ApiErrorResponse = {
  error: string;
};

export type UserSummary = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export type SnapshotAuthorSummary = {
  id: string;
  name: string | null;
  email: string;
};

