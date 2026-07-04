"use client";

import { Plus, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { RoleBadge } from "@/components/collaborators/role-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DocumentRole } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

type PendingCollaborator = {
  id: string;
  email: string;
  role: Exclude<DocumentRole, "OWNER">;
};

function resetFormState() {
  return {
    title: "",
    email: "",
    inviteRole: "EDITOR" as const,
    collaborators: [] as PendingCollaborator[],
    error: null as string | null,
  };
}

export function CreateDocumentForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<Exclude<DocumentRole, "OWNER">>("EDITOR");
  const [collaborators, setCollaborators] = useState<PendingCollaborator[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);

    if (!open) {
      const next = resetFormState();
      setTitle(next.title);
      setEmail(next.email);
      setInviteRole(next.inviteRole);
      setCollaborators(next.collaborators);
      setError(next.error);
    }
  }

  function handleAddCollaborator() {
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError("Enter a collaborator email");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address");
      return;
    }

    if (
      session?.user?.email &&
      trimmedEmail === session.user.email.toLowerCase()
    ) {
      setError("You cannot add yourself as a collaborator");
      return;
    }

    if (collaborators.some((entry) => entry.email === trimmedEmail)) {
      setError("This collaborator is already in the list");
      return;
    }

    setCollaborators((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        email: trimmedEmail,
        role: inviteRole,
      },
    ]);
    setEmail("");
    setInviteRole("EDITOR");
  }

  function handleRemoveCollaborator(id: string) {
    setCollaborators((current) => current.filter((entry) => entry.id !== id));
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Document name is required");
      return;
    }

    setIsLoading(true);

    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: trimmedTitle,
        collaborators: collaborators.map(({ email: collaboratorEmail, role }) => ({
          email: collaboratorEmail,
          role,
        })),
      }),
    });

    const data = (await response.json()) as {
      document?: { id: string };
      error?: string;
    };

    setIsLoading(false);

    if (!response.ok || !data.document) {
      setError(data.error ?? "Failed to create document");
      return;
    }

    handleOpenChange(false);
    router.push(`/documents/${data.document.id}`);
    router.refresh();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger className={cn(buttonVariants())}>
        <Plus className="size-4" />
        New document
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create document</DialogTitle>
          <DialogDescription>
            Name your document and optionally invite collaborators. They must
            already have an account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleCreate(event)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="document-title">Document name</Label>
            <Input
              id="document-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled document"
              aria-label="Document title"
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="collaborator-email">Collaborators</Label>
              <p className="text-xs text-muted-foreground">
                Add people by email. You can invite more from the document later.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="collaborator-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@example.com"
                autoComplete="email"
                className="sm:flex-1"
              />
              <select
                id="collaborator-role"
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(
                    event.target.value as Exclude<DocumentRole, "OWNER">,
                  )
                }
                aria-label="Collaborator role"
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-32"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleAddCollaborator}
            >
              <UserPlus className="size-3.5" />
              Add collaborator
            </Button>

            {collaborators.length > 0 ? (
              <ul className="space-y-2 rounded-xl border border-border bg-muted/20 p-2">
                {collaborators.map((collaborator) => (
                  <li
                    key={collaborator.id}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {collaborator.email}
                      </p>
                    </div>
                    <RoleBadge role={collaborator.role} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${collaborator.email}`}
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose
              type="button"
              className={cn(buttonVariants({ variant: "outline" }))}
              disabled={isLoading}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
