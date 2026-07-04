"use client";

import type { Editor } from "@tiptap/react";
import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MIN_SELECTION_LENGTH = 2;

type SelectionAnchor = {
  text: string;
  top: number;
  left: number;
};

type SelectionSummarizeMenuProps = {
  editor: Editor;
};

function truncateSelection(text: string, maxLength = 120): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

export function SelectionSummarizeMenu({ editor }: SelectionSummarizeMenuProps) {
  const [anchor, setAnchor] = useState<SelectionAnchor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateAnchor = useCallback(() => {
    if (isDialogOpen) {
      return;
    }

    const { from, to } = editor.state.selection;
    if (from === to) {
      setAnchor(null);
      return;
    }

    const text = editor.state.doc.textBetween(from, to, " ").trim();
    if (text.length < MIN_SELECTION_LENGTH) {
      setAnchor(null);
      return;
    }

    const { view } = editor;
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);

    setAnchor({
      text,
      top: Math.min(start.top, end.top),
      left: (start.left + end.right) / 2,
    });
  }, [editor, isDialogOpen]);

  useEffect(() => {
    editor.on("selectionUpdate", updateAnchor);
    editor.on("transaction", updateAnchor);

    return () => {
      editor.off("selectionUpdate", updateAnchor);
      editor.off("transaction", updateAnchor);
    };
  }, [editor, updateAnchor]);

  useEffect(() => {
    function handleScroll() {
      updateAnchor();
    }

    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [updateAnchor]);

  async function handleSummarize() {
    if (!anchor) {
      return;
    }

    const text = anchor.text;
    setSelectedText(text);
    setSummary(null);
    setError(null);
    setIsLoading(true);
    setIsDialogOpen(true);
    setAnchor(null);

    try {
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = (await response.json()) as {
        summary?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to generate summary");
        return;
      }

      setSummary(data.summary ?? null);
    } catch {
      setError("Failed to generate summary");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDialogOpenChange(open: boolean) {
    setIsDialogOpen(open);

    if (!open) {
      setSummary(null);
      setError(null);
      setIsLoading(false);
      setSelectedText("");
    }
  }

  const bubble =
    anchor && typeof document !== "undefined"
      ? createPortal(
          <div
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full"
            style={{
              top: anchor.top - 8,
              left: anchor.left,
            }}
          >
            <Button
              type="button"
              size="sm"
              className="pointer-events-auto h-8 gap-1.5 rounded-full px-3 shadow-md"
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => void handleSummarize()}
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              Summarize
            </Button>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {bubble}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Summary</DialogTitle>
            <DialogDescription className="text-left">
              <span className="font-medium text-foreground">Selected:</span>{" "}
              <span className="text-muted-foreground">
                &ldquo;{truncateSelection(selectedText)}&rdquo;
              </span>
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "min-h-[4.5rem] rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed",
              isLoading && "flex items-center justify-center",
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Generating summary…
              </div>
            ) : null}

            {!isLoading && error ? (
              <p className="text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            {!isLoading && !error && summary ? (
              <p className="text-foreground">{summary}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
