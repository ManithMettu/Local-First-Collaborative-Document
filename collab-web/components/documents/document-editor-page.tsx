"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { RoleBadge } from "@/components/collaborators/role-badge";
import { RoleManager } from "@/components/collaborators/role-manager";
import { DocumentActionsMenu } from "@/components/documents/document-actions-menu";
import { DocumentTitle } from "@/components/documents/document-title";
import { CollaboratorPresence } from "@/components/editor/CollaboratorPresence";
import { ConnectionStatus } from "@/components/editor/ConnectionStatus";
import { Editor } from "@/components/editor/Editor";
import { ReadOnlyBanner } from "@/components/editor/read-only-banner";
import { VersionTimeline } from "@/components/versions/VersionTimeline";
import { useDocumentRole } from "@/hooks/use-document-role";
import type { DocumentRole } from "@/lib/generated/prisma/enums";
import { useConnectionStore } from "@/stores/connectionStore";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DocumentEditorPageProps = {
  documentId: string;
  title: string;
  role: DocumentRole;
};

export function DocumentEditorPage({
  documentId,
  title,
  role: initialRole,
}: DocumentEditorPageProps) {
  const { role, canEdit, isViewer, isOwner, refreshRole } = useDocumentRole(
    documentId,
    { initialRole },
  );
  const connectionStatus = useConnectionStore((state) => state.status);
  const wasOnlineRef = useRef(connectionStatus === "online");

  useEffect(() => {
    const isOnline = connectionStatus === "online";

    if (!wasOnlineRef.current && isOnline) {
      void refreshRole();
    }

    wasOnlineRef.current = isOnline;
  }, [connectionStatus, refreshRole]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden sm:gap-4">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/documents"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "shrink-0 text-muted-foreground hover:text-foreground",
            )}
            aria-label="Back to documents"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <DocumentTitle
            documentId={documentId}
            initialTitle={title}
            editable={canEdit}
          />
          <RoleBadge role={role} />
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <ConnectionStatus />
          {isOwner ? (
            <DocumentActionsMenu
              documentId={documentId}
              initialTitle={title}
            />
          ) : null}
          <CollaboratorPresence />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden sm:gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,18%)]">
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          {isViewer ? <ReadOnlyBanner /> : null}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Editor documentId={documentId} editable={canEdit} />
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-hidden xl:max-h-full">
          <div className="min-h-0 flex-1 basis-0 overflow-hidden">
            <VersionTimeline documentId={documentId} role={role} />
          </div>
          {isOwner ? (
            <div className="min-h-0 flex-1 basis-0 overflow-hidden">
              <RoleManager documentId={documentId} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
