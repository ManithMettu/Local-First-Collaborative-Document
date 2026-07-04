import { create } from "zustand";

export type ConnectionStatus =
  | "offline"
  | "connecting"
  | "online"
  | "syncing"
  | "error";

type ProviderStatus = "connecting" | "connected" | "disconnected" | null;

type ConnectionState = {
  documentId: string | null;
  providerStatus: ProviderStatus;
  isSynced: boolean;
  isNetworkOnline: boolean;
  hasError: boolean;
  status: ConnectionStatus;
};

function computeStatus(state: Omit<ConnectionState, "status">): ConnectionStatus {
  if (state.hasError) {
    return "error";
  }

  if (!state.isNetworkOnline) {
    return "offline";
  }

  if (state.providerStatus === "connecting") {
    return "connecting";
  }

  if (state.providerStatus === "disconnected" || state.providerStatus === null) {
    return "offline";
  }

  if (state.providerStatus === "connected" && !state.isSynced) {
    return "syncing";
  }

  return "online";
}

const initialState: ConnectionState = {
  documentId: null,
  providerStatus: null,
  isSynced: false,
  isNetworkOnline: true,
  hasError: false,
  status: "offline",
};

type ConnectionStore = ConnectionState & {
  bindDocument: (documentId: string) => void;
  setProviderState: (
    providerStatus: ProviderStatus,
    isSynced: boolean,
  ) => void;
  setNetworkOnline: (online: boolean) => void;
  setError: (hasError: boolean) => void;
  reset: () => void;
};

export const useConnectionStore = create<ConnectionStore>((set) => ({
  ...initialState,

  bindDocument: (documentId) =>
    set((state) => {
      const next = {
        ...state,
        documentId,
        providerStatus: null as ProviderStatus,
        isSynced: false,
        hasError: false,
      };
      return { ...next, status: computeStatus(next) };
    }),

  setProviderState: (providerStatus, isSynced) =>
    set((state) => {
      const next = {
        ...state,
        providerStatus,
        isSynced,
        hasError: providerStatus === "connected" ? false : state.hasError,
      };
      return { ...next, status: computeStatus(next) };
    }),

  setNetworkOnline: (isNetworkOnline) =>
    set((state) => {
      const next = { ...state, isNetworkOnline };
      return { ...next, status: computeStatus(next) };
    }),

  setError: (hasError) =>
    set((state) => {
      const next = { ...state, hasError };
      return { ...next, status: computeStatus(next) };
    }),

  reset: () => set(initialState),
}));
