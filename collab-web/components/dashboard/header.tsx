"use client";

import Link from "next/link";
import { useState } from "react";

import { UserProfileDialog } from "@/components/dashboard/user-profile-dialog";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { useSession } from "next-auth/react";

function getInitials(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function DashboardHeader() {
  const { data: session } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const displayEmail = session?.user?.email ?? "";

  return (
    <>
      <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-[90%] max-w-none items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/documents"
              className="text-2xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
            >
              Collab
            </Link>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Documents
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label="Open profile"
            >
              <Avatar size="sm">
                {session?.user?.image ? (
                  <AvatarImage src={session.user.image} alt="" />
                ) : null}
                <AvatarFallback>
                  {getInitials(session?.user?.name, displayEmail)}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </header>

      <UserProfileDialog
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
      />
    </>
  );
}
