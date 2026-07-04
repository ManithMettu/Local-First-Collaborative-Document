import { Eye } from "lucide-react";

export function ReadOnlyBanner() {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground"
    >
      <Eye className="size-4 shrink-0" aria-hidden="true" />
      <p>
        You have <span className="font-medium text-foreground">view-only</span>{" "}
        access. Changes sync live, but you cannot edit this document.
      </p>
    </div>
  );
}
