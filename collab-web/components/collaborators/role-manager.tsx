"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MoreHorizontal, UserPlus, Users } from "lucide-react";

import { RoleBadge } from "@/components/collaborators/role-badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRoleLabel } from "@/lib/documents/roles";
import type { DocumentRole } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

type CollaboratorUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

type Collaborator = {
  id: string;
  role: Exclude<DocumentRole, "OWNER">;
  userId: string;
  createdAt: string;
  user: CollaboratorUser;
};

type DocumentAccessDetails = {
  id: string;
  title: string;
  ownerId: string;
  role: DocumentRole;
  owner: CollaboratorUser;
  collaborators: Collaborator[];
};

type RoleManagerProps = {
  documentId: string;
  onCollaboratorsChange?: () => void;
};

function getInitials(user: CollaboratorUser): string {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function CollaboratorRow({
  name,
  email,
  image,
  role,
  menu,
}: {
  name: string | null;
  email: string;
  image: string | null;
  role: DocumentRole;
  menu?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5">
      <Avatar size="sm">
        {image ? <AvatarImage src={image} alt="" /> : null}
        <AvatarFallback>{getInitials({ id: "", name, email, image })}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {name ?? email}
        </p>
        {name ? (
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <RoleBadge role={role} />
        {menu}
      </div>
    </div>
  );
}

export function RoleManager({
  documentId,
  onCollaboratorsChange,
}: RoleManagerProps) {
  const [document, setDocument] = useState<DocumentAccessDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<Exclude<DocumentRole, "OWNER">>("EDITOR");
  const [isInviting, setIsInviting] = useState(false);
  const [pendingCollaboratorId, setPendingCollaboratorId] = useState<
    string | null
  >(null);

  const loadDocument = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    const response = await fetch(`/api/documents/${documentId}`);
    const data = (await response.json()) as {
      document?: DocumentAccessDetails;
      error?: string;
    };

    setIsLoading(false);

    if (!response.ok || !data.document) {
      setError(data.error ?? "Failed to load collaborators");
      return;
    }

    setDocument(data.document);
  }, [documentId]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument]);

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsInviting(true);

    const response = await fetch(`/api/documents/${documentId}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role: inviteRole }),
    });

    const data = (await response.json()) as { error?: string };

    setIsInviting(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to add collaborator");
      return;
    }

    setEmail("");
    setInviteRole("EDITOR");
    setIsDialogOpen(false);
    await loadDocument();
    onCollaboratorsChange?.();
  }

  async function handleRoleChange(
    collaboratorId: string,
    role: Exclude<DocumentRole, "OWNER">,
  ) {
    setPendingCollaboratorId(collaboratorId);
    setError(null);

    const response = await fetch(
      `/api/documents/${documentId}/collaborators/${collaboratorId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      },
    );

    const data = (await response.json()) as { error?: string };
    setPendingCollaboratorId(null);

    if (!response.ok) {
      setError(data.error ?? "Failed to update role");
      return;
    }

    await loadDocument();
    onCollaboratorsChange?.();
  }

  async function handleRemove(collaboratorId: string) {
    setPendingCollaboratorId(collaboratorId);
    setError(null);

    const response = await fetch(
      `/api/documents/${documentId}/collaborators/${collaboratorId}`,
      { method: "DELETE" },
    );

    setPendingCollaboratorId(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed to remove collaborator");
      return;
    }

    await loadDocument();
    onCollaboratorsChange?.();
  }

  return (
    <aside className="surface-card flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight">Access</h2>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            <UserPlus className="size-3.5" />
            Invite
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite collaborator</DialogTitle>
              <DialogDescription>
                Add someone by email. They must already have an account.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={(event) => void handleInvite(event)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="collaborator-email">Email</Label>
                <Input
                  id="collaborator-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="colleague@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collaborator-role">Role</Label>
                <select
                  id="collaborator-role"
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(
                      event.target.value as Exclude<DocumentRole, "OWNER">,
                    )
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="EDITOR">Editor — can edit and restore versions</option>
                  <option value="VIEWER">Viewer — read-only access</option>
                </select>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? "Sending invite…" : "Add collaborator"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading access list">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : null}

        {!isLoading && error ? (
          <p
            role="alert"
            className="rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {!isLoading && document ? (
          <div className="space-y-2">
            <CollaboratorRow
              name={document.owner.name}
              email={document.owner.email}
              image={document.owner.image}
              role="OWNER"
            />

            {document.collaborators.length === 0 ? (
              <p className="px-1 py-2 text-sm text-muted-foreground">
                No collaborators yet. Invite editors or viewers above.
              </p>
            ) : (
              document.collaborators.map((collaborator) => {
                const isPending = pendingCollaboratorId === collaborator.id;

                return (
                  <CollaboratorRow
                    key={collaborator.id}
                    name={collaborator.user.name}
                    email={collaborator.user.email}
                    image={collaborator.user.image}
                    role={collaborator.role}
                    menu={
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(
                            buttonVariants({ size: "icon-sm", variant: "ghost" }),
                          )}
                          aria-label={`Manage access for ${collaborator.user.email}`}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <MoreHorizontal className="size-3.5" />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Change role</DropdownMenuLabel>
                            {(["EDITOR", "VIEWER"] as const).map((role) => (
                              <DropdownMenuItem
                                key={role}
                                disabled={collaborator.role === role}
                                onClick={() =>
                                  void handleRoleChange(collaborator.id, role)
                                }
                              >
                                {formatRoleLabel(role)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => void handleRemove(collaborator.id)}
                          >
                            Remove access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                  />
                );
              })
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
