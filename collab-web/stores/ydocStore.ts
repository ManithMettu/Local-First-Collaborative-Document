import * as Y from "yjs";
import { create } from "zustand";

import { YJS_DOCUMENT_FIELD } from "@/lib/yjs/constants";
import { runDocumentMarkupRepair } from "@/lib/yjs/repair-document";

type YDocStore = {
  doc: Y.Doc | null;
  registerDoc: (doc: Y.Doc) => () => void;
  applyUpdate: (update: Uint8Array) => void;
};

export const useYDocStore = create<YDocStore>((set, get) => ({
  doc: null,

  registerDoc: (doc) => {
    set({ doc });

    return () => {
      if (get().doc === doc) {
        set({ doc: null });
      }
    };
  },

  applyUpdate: (update) => {
    const doc = get().doc;
    if (!doc) {
      return;
    }

    Y.applyUpdate(doc, update, "restore");
    runDocumentMarkupRepair(doc, YJS_DOCUMENT_FIELD);
  },
}));
