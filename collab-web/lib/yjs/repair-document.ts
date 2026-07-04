import * as Y from "yjs";

import { YJS_DOCUMENT_FIELD } from "@/lib/yjs/constants";
import { repairDocumentMarkup } from "@/lib/yjs/repair-markup";

export function runDocumentMarkupRepair(
  doc: Y.Doc,
  field = YJS_DOCUMENT_FIELD,
): boolean {
  let repaired = false;

  Y.transact(
    doc,
    () => {
      repaired = repairDocumentMarkup(doc, field);
    },
    "repair-markup",
  );

  return repaired;
}
