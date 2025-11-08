import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../services/api";
import type { ProxyInfo, ProxyStore, ProxyValidationRequest } from "../types";

export const useProxyStore = create<ProxyStore>()(
  persist(
    (set, get) => ({
      proxies: [],
      isValidating: false,
      validationError: null,

      setProxies: (proxies) => set({ proxies }),

      validateProxies: async (request: ProxyValidationRequest) => {
        set({ isValidating: true, validationError: null });
        try {
          const response = await api.validateProxies(request);

          const existingProxies = get().proxies;
          const incoming = response.proxies;
          const merged: ProxyInfo[] = existingProxies.map((p) => {
            const updated = incoming.find((i) => i.proxy === p.proxy);
            return updated ? updated : p;
          });

          incoming.forEach((i) => {
            if (!merged.some((p) => p.proxy === i.proxy)) merged.push(i);
          });
          set({ proxies: merged, isValidating: false });
        } catch (error) {
          set({
            validationError:
              error instanceof Error
                ? error.message
                : "Failed to validate proxies",
            isValidating: false,
          });
          throw error;
        }
      },

      revalidateProxy: async (proxy: string) => {
        set((state) => ({
          proxies: state.proxies.map((p) =>
            p.proxy === proxy ? { ...p, status: "validating" } : p
          ),
        }));
        try {
          const response = await api.validateProxies({ proxy_list: [proxy] });
          const updated = response.proxies[0];
          if (updated) {
            set((state) => ({
              proxies: state.proxies.map((p) =>
                p.proxy === proxy ? { ...p, ...updated } : p
              ),
            }));
          }
        } catch (error) {
          set((state) => ({
            proxies: state.proxies.map((p) =>
              p.proxy === proxy
                ? {
                    ...p,
                    status: "failed",
                    error:
                      error instanceof Error
                        ? error.message
                        : "Revalidation failed",
                  }
                : p
            ),
          }));
          throw error;
        }
      },

      revalidateAll: async () => {
        const list = get()
          .proxies.map((p) => p.proxy)
          .filter(Boolean);
        if (list.length === 0) return;
        set({ isValidating: true, validationError: null });

        set((state) => ({
          proxies: state.proxies.map((p) => ({ ...p, status: "validating" })),
        }));
        try {
          const response = await api.validateProxies({ proxy_list: list });
          const incoming = response.proxies;
          set((state) => {
            const merged: ProxyInfo[] = state.proxies.map((p) => {
              const updated = incoming.find((i) => i.proxy === p.proxy);
              return updated ? updated : p;
            });
            incoming.forEach((i) => {
              if (!merged.some((p) => p.proxy === i.proxy)) merged.push(i);
            });
            return { proxies: merged, isValidating: false };
          });
        } catch (error) {
          set({
            validationError:
              error instanceof Error ? error.message : "Revalidate all failed",
            isValidating: false,
          });
          throw error;
        }
      },

      deleteProxy: (proxy: string) => {
        set((state) => ({
          proxies: state.proxies.filter((p) => p.proxy !== proxy),
        }));
      },

      clearProxies: () => set({ proxies: [], validationError: null }),
    }),
    {
      name: "proxy-storage",
      partialize: (state) => ({ proxies: state.proxies }),
    }
  )
);
