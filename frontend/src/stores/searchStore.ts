import { create } from "zustand";
import { api } from "../services/api";
import type { SearchStore, SearchRequest, SearchJob } from "../types";

let wsConnection: WebSocket | null = null;

export const useSearchStore = create<SearchStore>((set, get) => ({
  currentJob: null,
  jobs: {},
  isCreating: false,
  error: null,

  startSearch: async (request: SearchRequest) => {
    set({ isCreating: true, error: null });
    try {
      const response = await api.startSearch(request);

      const initialJob: SearchJob = {
        job_id: response.job_id,
        query: request.query,
        engines: request.engines,
        status: "queued",
        created_at: new Date().toISOString(),
        total_tasks: 0,
        completed_tasks: 0,
        results: [],
      };

      set({
        isCreating: false,
        currentJob: initialJob,
      });

      get().connectWebSocket(response.job_id);

      return response.job_id;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to start search",
        isCreating: false,
      });
      throw error;
    }
  },

  connectWebSocket: (jobId: string) => {
    get().disconnectWebSocket();

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;

      const wsPort = import.meta.env.DEV
        ? "8000"
        : window.location.port || "80";
      const wsUrl = `${protocol}//${host}:${wsPort}/ws/job/${jobId}`;

      console.log("Connecting to WebSocket:", wsUrl);
      wsConnection = new WebSocket(wsUrl);

      wsConnection.onopen = () => {
        console.log("WebSocket connected for job:", jobId);
      };

      wsConnection.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "ping") {
            return;
          }

          if (message.type === "stop_requested") {
            console.log("Stop requested for job:", jobId);
            return;
          }

          console.log("WebSocket message:", message);

          if (message.data) {
            const jobUpdate: Partial<SearchJob> = {
              status: message.data.status,
              total_tasks: message.data.total_tasks,
              completed_tasks: message.data.completed_tasks,
            };

            if (message.data.results) {
              jobUpdate.results = message.data.results;
            }

            if (message.data.latest_result) {
              set((state) => {
                const currentResults = state.currentJob?.results || [];
                const newResults = [
                  ...currentResults,
                  message.data.latest_result,
                ];
                return {
                  currentJob: state.currentJob
                    ? {
                        ...state.currentJob,
                        ...jobUpdate,
                        results: newResults,
                      }
                    : null,
                };
              });
            } else {
              set((state) => ({
                currentJob: state.currentJob
                  ? {
                      ...state.currentJob,
                      ...jobUpdate,
                    }
                  : null,
              }));
            }

            if (
              message.data.status === "completed" ||
              message.data.status === "failed" ||
              message.data.status === "stopped"
            ) {
              console.log("Job finished, closing WebSocket");
              get().disconnectWebSocket();
            }
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsConnection.onerror = (error) => {
        console.error("WebSocket error:", error);
        set({ error: "WebSocket connection error" });
      };

      wsConnection.onclose = () => {
        console.log("WebSocket disconnected");
        wsConnection = null;
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      set({ error: "Failed to establish real-time connection" });
    }
  },

  disconnectWebSocket: () => {
    if (wsConnection) {
      wsConnection.close();
      wsConnection = null;
    }
  },

  pollJobStatus: async (jobId: string) => {
    console.warn("Using polling fallback - WebSocket may not be available");
    try {
      const job = await api.getJobStatus(jobId);
      const fullJob = {
        ...job,
        job_id: jobId,
        query: get().currentJob?.query || "",
        engines: get().currentJob?.engines || [],
        created_at: new Date().toISOString(),
      } as SearchJob;

      set((state) => ({
        currentJob: fullJob,
        jobs: { ...state.jobs, [jobId]: fullJob },
      }));
    } catch (error) {
      console.error("Failed to fetch job status:", error);
    }
  },

  stopPolling: () => {
    get().disconnectWebSocket();
  },

  updateJobStatus: (status: SearchJob["status"]) => {
    set((state) => ({
      currentJob: state.currentJob ? { ...state.currentJob, status } : null,
    }));
  },

  clearCurrentJob: () => {
    get().disconnectWebSocket();
    set({ currentJob: null, error: null });
  },
}));
