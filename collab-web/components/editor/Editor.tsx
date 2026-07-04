"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";
import type * as Y from "yjs";

import { useLocalYDoc } from "@/hooks/use-local-ydoc";
import { useWebSocketProvider } from "@/hooks/use-websocket-provider";
import { colorForUser } from "@/lib/collaboration/colors";
import { createEditorExtensions } from "@/lib/tiptap/extensions";
import { cn } from "@/lib/utils";
import { useWsProviderStore } from "@/stores/wsProviderStore";
import { useYDocStore } from "@/stores/ydocStore";

import { EditorSkeleton } from "./editor-skeleton";
import { EditorToolbar } from "./EditorToolbar";
import { SelectionSummarizeMenu } from "./selection-summarize-menu";

type EditorProps = {
  documentId: string;
  editable?: boolean;
};

function renderCollaborationCursor(user: Record<string, unknown>): HTMLElement {
  const cursor = document.createElement("span");
  cursor.classList.add("collaboration-cursor__caret");
  cursor.setAttribute(
    "style",
    `border-color: ${String(user.color ?? "#6b7280")}`,
  );

  const label = document.createElement("span");
  label.classList.add("collaboration-cursor__label");
  label.setAttribute(
    "style",
    `background-color: ${String(user.color ?? "#6b7280")}`,
  );
  label.textContent = String(user.name ?? "Collaborator");

  cursor.appendChild(label);
  return cursor;
}

function EditorSurface({
  ydoc,
  editable = true,
}: {
  ydoc: Y.Doc;
  editable?: boolean;
}) {
  const registerDoc = useYDocStore((state) => state.registerDoc);
  const provider = useWsProviderStore((state) => state.provider);
  const { data: session } = useSession();

  useEffect(() => registerDoc(ydoc), [registerDoc, ydoc]);

  const user = useMemo(() => {
    const userId = session?.user?.id ?? session?.user?.email ?? "anonymous";
    return {
      name: session?.user?.name ?? session?.user?.email ?? "You",
      color: colorForUser(userId),
    };
  }, [session]);

  const extensions = useMemo(
    () =>
      createEditorExtensions({
        ydoc,
        editable,
        provider,
        user,
        renderCollaborationCursor,
      }),
    [editable, provider, user, ydoc],
  );

  const editor = useEditor(
    {
      extensions,
      editable,
      editorProps: {
        attributes: {
          class: cn(
            "tiptap min-h-[8rem] w-full flex-1 px-1 py-2 text-base leading-relaxed outline-none sm:px-2",
            !editable && "cursor-default select-text",
          ),
          spellcheck: "true",
          "aria-readonly": editable ? "false" : "true",
        },
      },
    },
    [extensions, editable],
  );

  useEffect(() => {
    if (!editor || !provider) {
      return;
    }

    const { updateUser } = editor.commands;
    if (typeof updateUser === "function") {
      updateUser(user);
    }
  }, [editor, provider, user]);

  return (
    <div
      className={cn(
        "editor-surface surface-card flex min-h-0 flex-1 flex-col overflow-hidden transition-shadow duration-300",
        editable && "focus-within:ring-2 focus-within:ring-ring/30",
        !editable && "bg-muted/20",
      )}
    >
      {editable && editor ? <EditorToolbar editor={editor} /> : null}
      {editor ? <SelectionSummarizeMenu editor={editor} /> : null}
      <EditorContent
        editor={editor}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 sm:py-6"
      />
    </div>
  );
}

export function Editor({ documentId, editable = true }: EditorProps) {
  const ydocState = useLocalYDoc(documentId);
  const ydoc = ydocState.status === "ready" ? ydocState.ydoc : null;

  useWebSocketProvider(documentId, ydoc);

  if (ydocState.status === "loading") {
    return <EditorSkeleton />;
  }

  if (ydocState.status === "error") {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center"
      >
        <p className="text-sm font-medium text-destructive">
          Could not open local document storage
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {ydocState.message}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Try a private window without strict storage blocking, or clear site
          data for this origin and reload.
        </p>
      </div>
    );
  }

  return <EditorSurface ydoc={ydocState.ydoc} editable={editable} />;
}
