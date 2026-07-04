import { Badge } from "@/components/ui/badge";
import { formatRoleLabel } from "@/lib/documents/roles";
import type { DocumentRole } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

type RoleBadgeProps = {
  role: DocumentRole;
  className?: string;
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <Badge
      variant={role === "VIEWER" ? "secondary" : "outline"}
      className={cn("text-[10px] uppercase tracking-wide", className)}
    >
      {formatRoleLabel(role)}
    </Badge>
  );
}
