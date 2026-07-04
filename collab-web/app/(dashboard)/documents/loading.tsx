import { DocumentsListSkeleton } from "@/components/documents/documents-list-skeleton";

export default function DocumentsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
      </div>
      <DocumentsListSkeleton />
    </div>
  );
}
