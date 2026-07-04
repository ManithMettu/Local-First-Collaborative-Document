"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { WebsocketProvider } from "y-websocket";
import type * as Y from "yjs";

import { YJS_DOCUMENT_FIELD } from "@/lib/yjs/constants";
import { runDocumentMarkupRepair } from "@/lib/yjs/repair-document";
import { getWsServerUrl } from "@/lib/ws/config";
import { useConnectionStore } from "@/stores/connectionStore";
import { useWsProviderStore } from "@/stores/wsProviderStore";

type ProviderStatus = "connecting" | "connected" | "disconnected";

function readProviderStatus(value: unknown): ProviderStatus | null {
  if (typeof value === "string") {
    if (
      value === "connecting" ||
      value === "connected" ||
      value === "disconnected"
    ) {
      return value;
    }
    return null;
  }

  if (
    value &&
    typeof value === "object" &&
    "status" in value &&
    typeof value.status === "string"
  ) {
    return readProviderStatus(value.status);
  }

  return null;
}

function readSynced(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "boolean") {
    return value[0];
  }

  return false;
}

export function useWebSocketProvider(
  documentId: string,
  ydoc: Y.Doc | null,
): void {
  const { status: sessionStatus } = useSession();
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindDocument = useConnectionStore((state) => state.bindDocument);
  const reset = useConnectionStore((state) => state.reset);
  const setProviderState = useConnectionStore((state) => state.setProviderState);
  const setNetworkOnline = useConnectionStore((state) => state.setNetworkOnline);
  const setError = useConnectionStore((state) => state.setError);
  const setWsProvider = useWsProviderStore((state) => state.setProvider);

  useEffect(() => {
    bindDocument(documentId);
    return () => {
      reset();
    };
  }, [bindDocument, documentId, reset]);

  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);

    setNetworkOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setNetworkOnline]);

  useEffect(() => {
    if (!ydoc || sessionStatus !== "authenticated") {
      return;
    }

    let cancelled = false;

    async function connect() {
      if (!ydoc) {
        return;
      }

      const doc = ydoc;

      setProviderState("connecting", false);
      setError(false);

      try {
        const tokenResponse = await fetch("/api/auth/ws-token");
        if (!tokenResponse.ok) {
          setError(true);
          return;
        }

        const payload = (await tokenResponse.json()) as { token?: string };
        if (!payload.token || cancelled) {
          if (!payload.token) {
            setError(true);
          }
          return;
        }

        const provider = new WebsocketProvider(
          getWsServerUrl(),
          documentId,
          doc,
          {
            params: { token: payload.token },
            connect: true,
          },
        );

        if (cancelled) {
          provider.destroy();
          return;
        }

        providerRef.current = provider;
        setWsProvider(provider);

        const repairSyncedDocument = () => {
          if (!provider.synced) {
            return;
          }

          runDocumentMarkupRepair(doc, YJS_DOCUMENT_FIELD);
        };

        const syncFromProvider = () => {
          setProviderState(
            provider.wsconnected ? "connected" : "disconnected",
            provider.synced,
          );
          repairSyncedDocument();
        };

        provider.on("status", (event: unknown) => {
          const status = readProviderStatus(event);
          if (!status) {
            return;
          }

          setProviderState(status, provider.synced);
        });

        provider.on("sync", (event: unknown) => {
          const isSynced = readSynced(event) || provider.synced;
          setProviderState(
            provider.wsconnected ? "connected" : "disconnected",
            isSynced,
          );

          if (isSynced) {
            repairSyncedDocument();
          }
        });

        provider.on("connection-error", () => {
          setError(true);
        });

        provider.on("connection-close", () => {
          setProviderState("disconnected", false);
        });

        syncFromProvider();
      } catch {
        setError(true);
      }
    }

    void connect();

    return () => {
      cancelled = true;
      providerRef.current?.destroy();
      providerRef.current = null;
      setWsProvider(null);
    };
  }, [documentId, sessionStatus, setError, setProviderState, setWsProvider, ydoc]);
}
