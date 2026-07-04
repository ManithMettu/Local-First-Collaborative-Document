"use client";

import { cn } from "@/lib/utils";
import {
  useConnectionStore,
  type ConnectionStatus,
} from "@/stores/connectionStore";

const STATUS_META: Record<
  ConnectionStatus,
  {
    label: string;
    description: string;
    dotClass: string;
    badgeClass: string;
    pulse?: boolean;
  }
> = {
  online: {
    label: "Online",
    description: "Connected and synced with collaborators",
    dotClass: "bg-emerald-500",
    badgeClass:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  syncing: {
    label: "Syncing",
    description: "Applying remote changes",
    dotClass: "bg-amber-500",
    badgeClass:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    pulse: true,
  },
  connecting: {
    label: "Connecting",
    description: "Establishing a live connection",
    dotClass: "bg-sky-500",
    badgeClass:
      "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    pulse: true,
  },
  offline: {
    label: "Offline",
    description: "Editing locally — changes will sync when reconnected",
    dotClass: "bg-muted-foreground/70",
    badgeClass: "border-border bg-muted/60 text-muted-foreground",
  },
  error: {
    label: "Connection error",
    description: "Unable to reach the sync server",
    dotClass: "bg-destructive",
    badgeClass:
      "border-destructive/20 bg-destructive/10 text-destructive",
    pulse: true,
  },
};

export function ConnectionStatus() {
  const status = useConnectionStore((state) => state.status);
  const meta = STATUS_META[status];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${meta.label}. ${meta.description}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-500 ease-out",
        meta.badgeClass,
      )}
    >
      <span className="relative flex size-2 shrink-0">
        {meta.pulse ? (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-40",
              meta.dotClass,
            )}
          />
        ) : null}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full transition-colors duration-500",
            meta.dotClass,
          )}
        />
      </span>
      <span className="transition-opacity duration-300">{meta.label}</span>
    </div>
  );
}
