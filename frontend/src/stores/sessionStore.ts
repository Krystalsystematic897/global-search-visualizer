import { create } from "zustand";
import type { SessionStore } from "../types";

export const useSessionStore = create<SessionStore>(() => ({
  sessions: [],
  currentSession: null,
  isLoading: false,
  error: null,

  fetchSessions: async () => {},

  fetchSession: async (_jobId: string) => {},

  clearCurrentSession: () => {},
}));
