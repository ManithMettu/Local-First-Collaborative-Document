"use client";

import { useCallback, useState } from "react";

import {
  canEditDocument,
  canManageCollaborators,
  hasMinRole,
} from "@/lib/documents/roles";
import type { DocumentRole } from "@/lib/generated/prisma/enums";

type UseDocumentRoleOptions = {
  initialRole: DocumentRole;
};

export function useDocumentRole(
  documentId: string,
  { initialRole }: UseDocumentRoleOptions,
) {
  const [role, setRole] = useState<DocumentRole>(initialRole);

  const refreshRole = useCallback(async () => {
    const response = await fetch(`/api/documents/${documentId}`);

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      document?: { role?: DocumentRole };
    };

    if (data.document?.role) {
      setRole(data.document.role);
    }
  }, [documentId]);

  return {
    role,
    setRole,
    refreshRole,
    canEdit: canEditDocument(role),
    canRestore: hasMinRole(role, "EDITOR"),
    canManageCollaborators: canManageCollaborators(role),
    isViewer: role === "VIEWER",
    isOwner: role === "OWNER",
  };
}
