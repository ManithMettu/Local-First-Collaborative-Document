import Link from "next/link";
import { FileText } from "lucide-react";

import { RoleBadge } from "@/components/collaborators/role-badge";
import type { DocumentRole } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

type DocumentCardProps = {
  id: string;
  title: string;
  updatedAt: Date;
  role: DocumentRole;
  collaboratorCount: number;
};

function formatRelativeDate(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Updated today";
  }

  if (diffDays === 1) {
    return "Updated yesterday";
  }

  if (diffDays < 7) {
    return `Updated ${diffDays} days ago`;
  }

  return `Updated ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function DocumentCard({
  id,
  title,
  updatedAt,
  role,
  collaboratorCount,
}: DocumentCardProps) {
  return (
    <li>
      <Link
        href={`/documents/${id}`}
        className={cn(
          "surface-card group flex h-full flex-col p-5 transition-all duration-300",
          "hover:-translate-y-0.5 hover:border-border/80 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <FileText className="size-5" aria-hidden="true" />
          </div>
          <RoleBadge role={role} />
        </div>

        <div className="mt-4 min-w-0 flex-1 space-y-2">
          <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {formatRelativeDate(updatedAt)}
          </p>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {collaboratorCount === 0
            ? "Only you"
            : `${collaboratorCount + 1} people with access`}
        </p>
      </Link>
    </li>
  );
}
