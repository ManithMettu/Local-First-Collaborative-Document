"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { colorForUser } from "@/lib/collaboration/colors";
import { cn } from "@/lib/utils";
import { useWsProviderStore } from "@/stores/wsProviderStore";

type AwarenessUser = {
  clientId: number;
  name?: string;
  color?: string;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

export function CollaboratorPresence({ className }: { className?: string }) {
  const provider = useWsProviderStore((state) => state.provider);
  const { data: session } = useSession();
  const [users, setUsers] = useState<AwarenessUser[]>([]);

  useEffect(() => {
    if (!provider?.awareness) {
      setUsers([]);
      return;
    }

    const awareness = provider.awareness;

    function readUsers(): void {
      const states: AwarenessUser[] = [];

      awareness.getStates().forEach((state, clientId) => {
        if (typeof state !== "object" || state === null) {
          return;
        }

        const record = state as Record<string, unknown>;
        if (typeof record.name !== "string") {
          return;
        }

        states.push({
          clientId,
          name: record.name,
          color: typeof record.color === "string" ? record.color : undefined,
        });
      });

      setUsers(states);
    }

    readUsers();
    awareness.on("change", readUsers);

    return () => {
      awareness.off("change", readUsers);
    };
  }, [provider]);

  useEffect(() => {
    if (!provider?.awareness || !session?.user) {
      return;
    }

    const userId = session.user.id ?? session.user.email ?? "anonymous";
    const name = session.user.name ?? session.user.email ?? "You";

    provider.awareness.setLocalStateField("name", name);
    provider.awareness.setLocalStateField("color", colorForUser(userId));
  }, [provider, session]);

  if (users.length <= 1) {
    return null;
  }

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      aria-label={`${users.length} collaborators editing`}
    >
      <span className="text-xs text-muted-foreground">Editing now</span>
      <div className="flex -space-x-2">
        {users.slice(0, 5).map((user) => {
          const name = user.name ?? "Collaborator";
          const color = user.color ?? "#6b7280";

          return (
            <Avatar
              key={user.clientId}
              size="sm"
              className="ring-2 ring-background"
              title={name}
            >
              <AvatarFallback
                className="text-[10px] font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>
      {users.length > 5 ? (
        <span className="text-xs text-muted-foreground">+{users.length - 5}</span>
      ) : null}
    </div>
  );
}
