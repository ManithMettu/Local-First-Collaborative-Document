"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type DocumentTitleProps = {
  documentId: string;
  initialTitle: string;
  editable: boolean;
};

export function DocumentTitle({
  documentId,
  initialTitle,
  editable,
}: DocumentTitleProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialTitle);

  useEffect(() => {
    setTitle(initialTitle);
    lastSavedRef.current = initialTitle;
  }, [initialTitle]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const saveTitle = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed === lastSavedRef.current) {
        return;
      }

      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!response.ok) {
        setTitle(lastSavedRef.current);
        return;
      }

      lastSavedRef.current = trimmed;
      setTitle(trimmed);
      router.refresh();
    },
    [documentId, router],
  );

  function scheduleSave(value: string) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void saveTitle(value);
    }, 600);
  }

  function handleBlur() {
    setIsEditing(false);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(lastSavedRef.current);
      return;
    }

    void saveTitle(trimmed);
  }

  const titleClassName =
    "min-w-0 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl";

  if (!editable) {
    return <h1 className={titleClassName}>{title}</h1>;
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          scheduleSave(event.target.value);
        }}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            setTitle(lastSavedRef.current);
            setIsEditing(false);
          }
        }}
        className={cn(
          titleClassName,
          "w-full rounded-md border border-border bg-background px-2 py-0.5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
        aria-label="Document title"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        titleClassName,
        "max-w-full rounded-md px-1 text-left transition-colors hover:bg-muted/60",
      )}
      title="Click to rename"
    >
      {title}
    </button>
  );
}
