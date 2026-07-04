import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/react";
import type * as Y from "yjs";

import { YJS_DOCUMENT_FIELD } from "@/lib/yjs/constants";

import { FontSize } from "./font-size";

type CreateEditorExtensionsOptions = {
  ydoc: Y.Doc;
  editable: boolean;
  provider: unknown | null;
  user: {
    name: string;
    color: string;
  };
  renderCollaborationCursor: (
    user: Record<string, unknown>,
  ) => HTMLElement;
};

export function createEditorExtensions({
  ydoc,
  editable,
  provider,
  user,
  renderCollaborationCursor,
}: CreateEditorExtensionsOptions): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      history: false,
      blockquote: false,
    }),
    TextStyle,
    Color,
    FontFamily.configure({
      types: ["textStyle"],
    }),
    FontSize,
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Underline,
    Highlight.configure({
      multicolor: true,
    }),
    Subscript,
    Superscript,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Collaboration.configure({
      document: ydoc,
      field: YJS_DOCUMENT_FIELD,
    }),
    Placeholder.configure({
      placeholder: editable
        ? "Start writing — your changes save locally and sync live…"
        : "View-only document",
      emptyEditorClass: "is-editor-empty",
    }),
  ];

  if (provider) {
    extensions.push(
      CollaborationCursor.configure({
        provider,
        user,
        render: renderCollaborationCursor,
      }),
    );
  }

  return extensions;
}
