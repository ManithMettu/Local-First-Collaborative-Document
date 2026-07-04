import { FileText } from "lucide-react";

export function DocumentsEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
        <FileText className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-4 text-base font-medium text-foreground">No documents yet</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Use the button above to create your first document. You can edit offline and
        sync when you reconnect.
      </p>
    </div>
  );
}
