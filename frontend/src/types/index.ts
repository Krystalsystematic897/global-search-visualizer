export interface APIInfo {
  name: string;
  version: string;
  status: string;
  timestamp: string;
  endpoints: Record<string, string>;
  description: string;
}

export interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
}

export interface ProxyInfo {
  proxy: string;
  public_ip?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  isp?: string;
  status: "pending" | "validating" | "valid" | "failed";
  error?: string;
  protocol?: "http" | "socks4" | "socks5";
  username?: string;
  password?: string;
}

export interface ProxyValidationRequest {
  proxy_list: string[];
  proxy_url?: string;
}

export interface ProxyValidationResponse {
  total: number;
  valid: number;
  failed: number;
  proxies: ProxyInfo[];
  source: string;
}

export interface SearchRequest {
  proxies: ProxyInfo[];
  query: string;
  engines: string[];
  google_api_key?: string;
  google_cse_id?: string;
}

export interface SearchResult {
  proxy: string;
  country: string;
  region: string;
  city: string;
  isp: string;
  engine: string;
  screenshot_path?: string;
  screenshot_full_path?: string;
  status: "pending" | "success" | "failed" | "blocked";
  blocked: boolean;
  error?: string;
  timestamp: string;
  source?: string;
  api_items?: number;
  html_path?: string;
  title?: string;
  snippet?: string;
  url?: string;
  has_screenshot?: boolean;
}

export interface SearchJob {
  job_id: string;
  query: string;
  engines: string[];
  status: "queued" | "running" | "completed" | "failed" | "stopped";
  created_at: string;
  completed_at?: string;
  total_tasks: number;
  completed_tasks: number;
  results: SearchResult[];
  google_credentials_provided?: boolean;
  total_results?: number;
}

export interface SearchJobStatus {
  job_id: string;
  status: string;
  total_tasks: number;
  completed_tasks: number;
  progress: number;
  results: SearchResult[];
}

export interface StartSearchResponse {
  job_id: string;
  status: string;
}

export interface SessionSummary {
  job_id: string;
  query: string;
  created_at: string;
  status: string;
  total_results: number;
}

export interface SessionsResponse {
  sessions: SessionSummary[];
}

export interface ProxyStore {
  proxies: ProxyInfo[];
  isValidating: boolean;
  validationError: string | null;
  setProxies: (proxies: ProxyInfo[]) => void;
  validateProxies: (request: ProxyValidationRequest) => Promise<void>;
  revalidateProxy: (proxy: string) => Promise<void>;
  revalidateAll: () => Promise<void>;
  deleteProxy: (proxy: string) => void;
  clearProxies: () => void;
}

export interface SearchStore {
  currentJob: SearchJob | null;
  jobs: Record<string, SearchJob>;
  isCreating: boolean;
  error: string | null;
  startSearch: (request: SearchRequest) => Promise<string>;
  connectWebSocket: (jobId: string) => void;
  disconnectWebSocket: () => void;
  pollJobStatus: (jobId: string) => Promise<void>;
  stopPolling: () => void;
  updateJobStatus: (status: SearchJob["status"]) => void;
  clearCurrentJob: () => void;
}

export interface SessionStore {
  sessions: SessionSummary[];
  currentSession: SearchJob | null;
  isLoading: boolean;
  error: string | null;
  fetchSessions: () => Promise<void>;
  fetchSession: (jobId: string) => Promise<void>;
  clearCurrentSession: () => void;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "bordered";
  padding?: "none" | "sm" | "md" | "lg";
}

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md" | "lg";
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export type SearchEngine = "google" | "bing" | "duckduckgo" | "yahoo";

export interface SelectOption {
  value: string;
  label: string;
}

export interface StatCardData {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
}
