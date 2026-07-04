"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
};

type UserProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getInitials(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function UserProfileDialog({
  open,
  onOpenChange,
}: UserProfileDialogProps) {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setError(null);
      return;
    }

    async function loadProfile() {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/user");
      const data = (await response.json()) as {
        user?: UserProfile;
        error?: string;
      };

      setIsLoading(false);

      if (!response.ok || !data.user) {
        setError(data.error ?? "Failed to load profile");
        return;
      }

      setProfile(data.user);
      setName(data.user.name ?? "");
      setImage(data.user.image ?? "");
    }

    void loadProfile();
  }, [open]);

  function handleCancelEdit() {
    if (profile) {
      setName(profile.name ?? "");
      setImage(profile.image ?? "");
    }

    setIsEditing(false);
    setError(null);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const response = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        image: image.trim(),
      }),
    });

    const data = (await response.json()) as {
      user?: UserProfile;
      error?: string;
    };

    setIsSaving(false);

    if (!response.ok || !data.user) {
      setError(data.error ?? "Failed to update profile");
      return;
    }

    setProfile(data.user);
    setName(data.user.name ?? "");
    setImage(data.user.image ?? "");
    setIsEditing(false);

    await update({
      name: data.user.name ?? undefined,
      image: data.user.image,
    });
  }

  const displayName =
    profile?.name ?? session?.user?.name ?? session?.user?.email ?? "User";
  const displayEmail = profile?.email ?? session?.user?.email ?? "";
  const displayImage = profile?.image ?? session?.user?.image ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your profile</DialogTitle>
          <DialogDescription>
            View and update your account details.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4" aria-busy="true" aria-label="Loading profile">
            <div className="flex items-center gap-3">
              <div className="size-12 animate-pulse rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-40 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        ) : null}

        {!isLoading && error && !profile ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!isLoading && profile ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
              <Avatar size="lg">
                {displayImage ? (
                  <AvatarImage src={displayImage} alt="" />
                ) : null}
                <AvatarFallback>
                  {getInitials(displayName, displayEmail)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {displayName}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {displayEmail}
                </p>
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={(event) => void handleSave(event)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Name</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    value={displayEmail}
                    disabled
                    className="bg-muted/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-image">Profile image URL</Label>
                  <Input
                    id="profile-image"
                    type="url"
                    value={image}
                    onChange={(event) => setImage(event.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving…" : "Save changes"}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div className="space-y-4">
                <dl className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="text-right font-medium text-foreground">
                      {profile.name ?? "—"}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="text-right font-medium text-foreground">
                      {profile.email}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-muted-foreground">Member since</dt>
                    <dd className="text-right font-medium text-foreground">
                      {new Date(profile.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                </dl>

                <DialogFooter className={cn("sm:justify-between")}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    Sign out
                  </Button>
                  <Button type="button" onClick={() => setIsEditing(true)}>
                    Edit profile
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
