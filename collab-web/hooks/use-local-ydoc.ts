"use client";

import { useEffect, useState } from "react";
import type * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Yjs from "yjs";

import { getIndexedDbName, YJS_DOCUMENT_FIELD } from "@/lib/yjs/constants";
import { runDocumentMarkupRepair } from "@/lib/yjs/repair-document";

type LocalYDocState =
  | { status: "loading" }
  | { status: "ready"; ydoc: Y.Doc }
  | { status: "error"; message: string };

export function useLocalYDoc(documentId: string): LocalYDocState {
  const [state, setState] = useState<LocalYDocState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const ydoc = new Yjs.Doc();
    let persistence: IndexeddbPersistence | null = null;

    try {
      persistence = new IndexeddbPersistence(getIndexedDbName(documentId), ydoc);
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to open local storage",
      });
      ydoc.destroy();
      return;
    }

    const handleAfterTransaction = (transaction: Y.Transaction) => {
      if (transaction.origin === "repair-markup") {
        return;
      }

      runDocumentMarkupRepair(ydoc, YJS_DOCUMENT_FIELD);
    };

    const handleSynced = () => {
      if (!cancelled) {
        runDocumentMarkupRepair(ydoc, YJS_DOCUMENT_FIELD);
        setState({ status: "ready", ydoc });
      }
    };

    ydoc.on("afterTransaction", handleAfterTransaction);
    persistence.on("synced", handleSynced);

    return () => {
      cancelled = true;
      ydoc.off("afterTransaction", handleAfterTransaction);
      persistence?.off("synced", handleSynced);
      persistence?.destroy();
      ydoc.destroy();
    };
  }, [documentId]);

  return state;
}
