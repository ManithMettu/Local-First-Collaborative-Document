export function EditorSkeleton() {
  return (
    <div
      className="editor-surface surface-card px-4 py-6 sm:px-8 sm:py-10"
      aria-busy="true"
      aria-label="Loading editor"
    >
      <div className="space-y-4">
        <div className="h-4 w-2/5 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-11/12 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-3/5 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
