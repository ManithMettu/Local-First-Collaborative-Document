import type { WebsocketProvider } from "y-websocket";
import { create } from "zustand";

type WsProviderStore = {
  provider: WebsocketProvider | null;
  setProvider: (provider: WebsocketProvider | null) => void;
};

export const useWsProviderStore = create<WsProviderStore>((set) => ({
  provider: null,
  setProvider: (provider) => set({ provider }),
}));
