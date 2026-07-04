import { EditorSkeleton } from "@/components/editor/editor-skeleton";

export default function DocumentLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <EditorSkeleton />
        <div className="surface-card h-[420px] animate-pulse" />
      </div>
    </div>
  );
}
