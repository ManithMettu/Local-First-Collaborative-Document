import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DocumentNotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <FileQuestion className="size-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
        Document not found
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        This document does not exist or you do not have permission to open it.
      </p>
      <Button className="mt-8" render={<Link href="/documents" />}>
        Back to documents
      </Button>
    </div>
  );
}
