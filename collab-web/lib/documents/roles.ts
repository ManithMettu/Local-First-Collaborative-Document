import type { DocumentRole } from "@/lib/generated/prisma/enums";

const ROLE_RANK: Record<DocumentRole, number> = {
  OWNER: 3,
  EDITOR: 2,
  VIEWER: 1,
};

export function hasMinRole(
  role: DocumentRole,
  minimumRole: DocumentRole,
): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimumRole];
}

export function canEditDocument(role: DocumentRole): boolean {
  return hasMinRole(role, "EDITOR");
}

export function canManageCollaborators(role: DocumentRole): boolean {
  return role === "OWNER";
}

export function formatRoleLabel(role: DocumentRole): string {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "EDITOR":
      return "Editor";
    case "VIEWER":
      return "Viewer";
  }
}
