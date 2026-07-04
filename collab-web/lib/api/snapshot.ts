import type { z } from "zod";

import { createSnapshotSchema } from "@/lib/validations/snapshot";

import type { SnapshotAuthorSummary, SnapshotKind } from "./types";

export type CreateSnapshotRequest = z.infer<typeof createSnapshotSchema>;

export type SerializedSnapshot = {
  id: string;
  kind: SnapshotKind;
  label: string | null;
  changeSummary: string | null;
  previewText: string;
  createdAt: string;
  createdBy: SnapshotAuthorSummary | null;
};

export type ListSnapshotsResponse = {
  snapshots: SerializedSnapshot[];
};

export type CreateSnapshotResponse = {
  snapshot: SerializedSnapshot;
};

export type RestoreSnapshotResponse = {
  applied: true;
  update: string;
  message?: string;
};

export type DocumentSnapshotRestoreRouteContext = {
  params: Promise<{ id: string; snapshotId: string }>;
};

export type SummarizeSnapshotRequest = {
  documentId?: string;
  snapshotId?: string;
};

export type SummarizeSnapshotResponse = {
  summarized: boolean;
  changeSummary: string | null;
};
