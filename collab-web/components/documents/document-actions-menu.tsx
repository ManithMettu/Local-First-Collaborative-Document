"use client";

import { Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type DocumentActionsMenuProps = {
  documentId: string;
  initialTitle: string;
};

export function DocumentActionsMenu({
  documentId,
  initialTitle,
}: DocumentActionsMenuProps) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState(initialTitle);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);

  const canDelete = confirmation.trim() === documentTitle.trim();

  async function openDeleteDialog() {
    setIsDeleteOpen(true);
    setConfirmation("");
    setError(null);
    setDocumentTitle(initialTitle);
    setIsLoadingTitle(true);

    try {
      const response = await fetch(`/api/documents/${documentId}`);
      const data = (await response.json()) as {
        document?: { title?: string };
        error?: string;
      };

      if (response.ok && data.document?.title) {
        setDocumentTitle(data.document.title);
      }
    } catch {
      // Keep initial title if refresh fails.
    } finally {
      setIsLoadingTitle(false);
    }
  }

  function handleDeleteOpenChange(open: boolean) {
    setIsDeleteOpen(open);

    if (!open) {
      setConfirmation("");
      setError(null);
      setIsDeleting(false);
    }
  }

  async function handleDelete() {
    if (!canDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Failed to delete document");
        setIsDeleting(false);
        return;
      }

      router.push("/documents");
      router.refresh();
    } catch {
      setError("Failed to delete document");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "shrink-0 text-muted-foreground hover:text-foreground",
          )}
          aria-label="Document options"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => void openDeleteDialog()}
            >
              <Trash2 className="size-4" />
              Delete document
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDeleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              This permanently deletes{" "}
              <span className="font-medium text-foreground">
                {documentTitle}
              </span>{" "}
              and all version history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="delete-confirmation">
              Type{" "}
              <span className="font-medium text-foreground">{documentTitle}</span>{" "}
              to confirm
            </Label>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={isLoadingTitle ? "Loading…" : documentTitle}
              disabled={isDeleting || isLoadingTitle}
              autoComplete="off"
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!canDelete || isDeleting || isLoadingTitle}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
