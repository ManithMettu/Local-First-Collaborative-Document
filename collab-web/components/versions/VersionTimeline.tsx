"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DocumentRole } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { decodeStateBase64 } from "@/lib/yjs/restore";
import { useYDocStore } from "@/stores/ydocStore";

export type SnapshotListItem = {
  id: string;
  kind: "MANUAL" | "AUTO";
  label: string | null;
  changeSummary: string | null;
  previewText: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

type VersionTimelineProps = {
  documentId: string;
  role: DocumentRole;
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SnapshotKindBadge({ kind }: { kind: SnapshotListItem["kind"] }) {
  return (
    <Badge
      variant={kind === "MANUAL" ? "default" : "secondary"}
      className="shrink-0 text-[10px] uppercase tracking-wide"
    >
      {kind === "MANUAL" ? "Manual" : "Auto"}
    </Badge>
  );
}

export function VersionTimeline({ documentId, role }: VersionTimelineProps) {
  const applyUpdate = useYDocStore((state) => state.applyUpdate);
  const canRestore = role === "OWNER" || role === "EDITOR";
  const canCreateManual = canRestore;

  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadSnapshots = useCallback(
    async (options?: { silent?: boolean }) => {
      setError(null);
      if (!options?.silent) {
        setIsLoading(true);
      }

      const response = await fetch(`/api/documents/${documentId}/snapshots`);
      const data = (await response.json()) as {
        snapshots?: SnapshotListItem[];
        error?: string;
      };

      if (!options?.silent) {
        setIsLoading(false);
      }

      if (!response.ok) {
        setError(data.error ?? "Failed to load version history");
        return;
      }

      setSnapshots(data.snapshots ?? []);
    },
    [documentId],
  );

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  useEffect(() => {
    const fiveMinutesMs = 5 * 60 * 1000;
    const hasPendingSummary = snapshots.some((snapshot) => {
      if (snapshot.kind !== "AUTO" || snapshot.changeSummary) {
        return false;
      }

      const ageMs = Date.now() - new Date(snapshot.createdAt).getTime();
      return ageMs < fiveMinutesMs;
    });

    if (!hasPendingSummary) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadSnapshots({ silent: true });
    }, 15_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadSnapshots, snapshots]);

  async function handleRestore(snapshotId: string) {
    setRestoringId(snapshotId);
    setError(null);

    const response = await fetch(
      `/api/documents/${documentId}/snapshots/${snapshotId}/restore`,
      { method: "POST" },
    );

    const data = (await response.json()) as {
      update?: string;
      error?: string;
    };

    setRestoringId(null);

    if (!response.ok) {
      setError(data.error ?? "Failed to restore version");
      return;
    }

    if (data.update) {
      applyUpdate(decodeStateBase64(data.update));
    }

    await loadSnapshots();
  }

  async function handleCreateSnapshot() {
    setIsCreating(true);
    setError(null);

    const response = await fetch(`/api/documents/${documentId}/snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    setIsCreating(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed to create snapshot");
      return;
    }

    await loadSnapshots();
  }

  return (
    <aside className="surface-card flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight">Version history</h2>
        </div>
        {canCreateManual ? (
          <Button
            size="sm"
            variant="outline"
            disabled={isCreating}
            onClick={() => void handleCreateSnapshot()}
          >
            {isCreating ? "Saving…" : "Snapshot"}
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading versions">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <div className="mt-1 size-2.5 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && error ? (
          <p role="alert" className="rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!isLoading && !error && snapshots.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-2 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No versions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Snapshots are created automatically while you edit, or manually
              with the button above.
            </p>
          </div>
        ) : null}

        {!isLoading && !error && snapshots.length > 0 ? (
          <ol className="relative space-y-0">
            <span
              aria-hidden="true"
              className="absolute top-2 bottom-2 left-[4.5px] w-px bg-border"
            />

            {snapshots.map((snapshot, index) => {
              const isHovered = hoveredId === snapshot.id;
              const isLatest = index === 0;

              return (
                <li
                  key={snapshot.id}
                  className="relative pb-5 pl-6 last:pb-0"
                  onMouseEnter={() => setHoveredId(snapshot.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(snapshot.id)}
                  onBlur={() => setHoveredId(null)}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-1.5 left-0 size-2.5 rounded-full border-2 border-background transition-all duration-300",
                      isLatest
                        ? "bg-foreground scale-110"
                        : "bg-muted-foreground/50",
                      isHovered && "scale-125 bg-primary",
                    )}
                  />

                  <div
                    className={cn(
                      "rounded-xl border border-transparent p-3 transition-all duration-300",
                      isHovered &&
                        "border-border bg-muted/40 shadow-sm -translate-y-0.5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <time
                            dateTime={snapshot.createdAt}
                            className="text-xs font-medium text-foreground"
                          >
                            {formatTimestamp(snapshot.createdAt)}
                          </time>
                          <SnapshotKindBadge kind={snapshot.kind} />
                          {isLatest ? (
                            <Badge variant="outline" className="text-[10px]">
                              Current
                            </Badge>
                          ) : null}
                        </div>
                        {snapshot.label ? (
                          <p className="text-sm font-medium text-foreground">
                            {snapshot.label}
                          </p>
                        ) : null}
                        {snapshot.changeSummary ? (
                          <p className="text-xs leading-relaxed text-foreground/90">
                            {snapshot.changeSummary}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {snapshot.createdBy?.name ??
                            snapshot.createdBy?.email ??
                            "System"}
                        </p>
                      </div>

                      {canRestore && !isLatest ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          aria-label={`Restore version from ${formatTimestamp(snapshot.createdAt)}`}
                          disabled={restoringId === snapshot.id}
                          onClick={() => void handleRestore(snapshot.id)}
                          className={cn(
                            "shrink-0 opacity-0 transition-opacity duration-200",
                            isHovered && "opacity-100",
                          )}
                        >
                          {restoringId === snapshot.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3.5" />
                          )}
                          Restore
                        </Button>
                      ) : null}
                    </div>

                    <div
                      className={cn(
                        "mt-3 overflow-hidden rounded-lg border border-border/60 bg-background/80 text-xs leading-relaxed text-muted-foreground transition-all duration-300",
                        isHovered
                          ? "max-h-40 opacity-100"
                          : "max-h-0 opacity-0 border-transparent",
                      )}
                    >
                      <p className="p-3 whitespace-pre-wrap">
                        {snapshot.previewText}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </aside>
  );
}
