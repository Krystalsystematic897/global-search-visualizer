import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  APIInfo,
  HealthStatus,
  ProxyValidationRequest,
  ProxyValidationResponse,
  SearchRequest,
  StartSearchResponse,
  SearchJobStatus,
  SearchJob,
} from "../types";
import { getApiBaseUrl } from "../lib/utils";

class APIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 120000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async getAPIInfo(): Promise<APIInfo> {
    const response = await this.client.get<APIInfo>("/");
    return response.data;
  }

  async getHealth(): Promise<HealthStatus> {
    const response = await this.client.get<HealthStatus>("/health");
    return response.data;
  }

  async validateProxies(
    request: ProxyValidationRequest
  ): Promise<ProxyValidationResponse> {
    const response = await this.client.post<ProxyValidationResponse>(
      "/validate_proxies",
      request
    );
    return response.data;
  }

  async startSearch(request: SearchRequest): Promise<StartSearchResponse> {
    const response = await this.client.post<StartSearchResponse>(
      "/start_search",
      request
    );
    return response.data;
  }

  async getJobStatus(jobId: string): Promise<SearchJobStatus> {
    const response = await this.client.get<SearchJobStatus>(
      `/get_status/${jobId}`
    );
    return response.data;
  }

  async getJobResults(jobId: string): Promise<SearchJob> {
    const response = await this.client.get<SearchJob>(`/get_results/${jobId}`);
    return response.data;
  }

  async stopJob(
    jobId: string
  ): Promise<{ job_id: string; message: string; status: string }> {
    const response = await this.client.post(`/stop_job/${jobId}`);
    return response.data;
  }

  async downloadScreenshots(jobId: string): Promise<void> {
    const response = await this.client.get(`/download_screenshots/${jobId}`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `screenshots_${jobId}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  getScreenshotURL(path: string): string {
    return `${this.client.defaults.baseURL}/${path}`;
  }
}

export const api = new APIService();
export default api;
