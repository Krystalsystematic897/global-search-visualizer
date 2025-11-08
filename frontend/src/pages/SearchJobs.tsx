import { useState, useEffect, useMemo } from "react";
import { useProxyStore } from "../stores/proxyStore";
import { useSearchStore } from "../stores/searchStore";
import Card, {
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import ProgressBar from "../components/ui/ProgressBar";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import {
  Search,
  Play,
  Download,
  Image as ImageIcon,
  StopCircle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Monitor,
  Key,
  Trash2,
  AlertTriangle,
  Filter,
  X,
} from "lucide-react";
import { formatDate } from "../lib/utils";
import { getApiBaseUrl } from "../lib/utils";
import api from "../services/api";

const SearchJobs = () => {
  const { proxies } = useProxyStore();
  const {
    currentJob,
    isCreating,
    startSearch,
    clearCurrentJob,
    disconnectWebSocket,
    updateJobStatus,
  } = useSearchStore();
  const [query, setQuery] = useState("");
  const [selectedEngines, setSelectedEngines] = useState<string[]>(["google"]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(
    null
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [screenshotType, setScreenshotType] = useState<"viewport" | "full">(
    "viewport"
  );
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [googleCseId, setGoogleCseId] = useState("");
  const [showGoogleConfig, setShowGoogleConfig] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedEngine, setSelectedEngine] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const engines = ["google", "bing", "duckduckgo", "yahoo"];

  const validProxies = proxies.filter((p) => p.status === "valid");

  const uniqueLocations = useMemo(() => {
    if (!currentJob?.results) return [];
    const locations = new Set<string>();
    currentJob.results.forEach((r) => {
      const location =
        r.city && r.city !== "Unknown" ? `${r.city}, ${r.country}` : r.country;
      if (location) locations.add(location);
    });
    return Array.from(locations).sort();
  }, [currentJob]);

  const uniqueEngines = useMemo(() => {
    if (!currentJob?.results) return [];
    const engines = new Set<string>();
    currentJob.results.forEach((r) => {
      if (r.engine) engines.add(r.engine);
    });
    return Array.from(engines).sort();
  }, [currentJob]);

  const uniqueStatuses = useMemo(() => {
    if (!currentJob?.results) return [];
    const statuses = new Set<string>();
    currentJob.results.forEach((r) => {
      if (r.status) statuses.add(r.status);
    });
    return Array.from(statuses).sort();
  }, [currentJob]);

  const filteredResults = useMemo(() => {
    if (!currentJob?.results) return [];

    return currentJob.results.filter((result) => {
      const resultLocation =
        result.city && result.city !== "Unknown"
          ? `${result.city}, ${result.country}`
          : result.country;
      const matchesLocation =
        selectedLocation === "all" || resultLocation === selectedLocation;

      const matchesEngine =
        selectedEngine === "all" || result.engine === selectedEngine;
      const matchesStatus =
        selectedStatus === "all" || result.status === selectedStatus;

      return matchesLocation && matchesEngine && matchesStatus;
    });
  }, [currentJob, selectedLocation, selectedEngine, selectedStatus]);

  const screenshotResults = useMemo(() => {
    return filteredResults.filter((r) => r.screenshot_path);
  }, [filteredResults]);

  const hasActiveFilters =
    selectedLocation !== "all" ||
    selectedEngine !== "all" ||
    selectedStatus !== "all";

  const resetFilters = () => {
    setSelectedLocation("all");
    setSelectedEngine("all");
    setSelectedStatus("all");
  };

  useEffect(() => {
    const savedApiKey = localStorage.getItem("google_api_key");
    const savedCseId = localStorage.getItem("google_cse_id");
    if (savedApiKey) setGoogleApiKey(savedApiKey);
    if (savedCseId) setGoogleCseId(savedCseId);
  }, []);

  const saveGoogleCredentials = () => {
    if (googleApiKey && googleCseId) {
      localStorage.setItem("google_api_key", googleApiKey);
      localStorage.setItem("google_cse_id", googleCseId);
    }
  };

  const removeGoogleCredentials = () => {
    setGoogleApiKey("");
    setGoogleCseId("");
    localStorage.removeItem("google_api_key");
    localStorage.removeItem("google_cse_id");
  };

  const handleStart = async () => {
    if (!query || validProxies.length === 0) return;

    try {
      clearCurrentJob();

      if (googleApiKey && googleCseId) {
        saveGoogleCredentials();
      }

      await startSearch({
        query,
        engines: selectedEngines,
        proxies: validProxies,
        google_api_key: googleApiKey || undefined,
        google_cse_id: googleCseId || undefined,
      });
    } catch (error) {
      console.error("Failed to start search:", error);
    }
  };

  const handleViewScreenshot = (screenshotPath: string) => {
    const apiUrl = getApiBaseUrl();
    const index = screenshotResults.findIndex(
      (r) => r.screenshot_path === screenshotPath
    );
    const fullUrl = `${apiUrl}/${screenshotPath}`;
    setSelectedIndex(index >= 0 ? index : 0);
    setSelectedScreenshot(fullUrl);
    setScreenshotType("viewport");
    setScreenshotModalOpen(true);
  };

  const goPrev = () => {
    if (!screenshotResults.length || selectedIndex === null) return;
    const apiUrl = getApiBaseUrl();
    const prevIndex =
      (selectedIndex - 1 + screenshotResults.length) % screenshotResults.length;
    setSelectedIndex(prevIndex);
    const result = screenshotResults[prevIndex];
    const path =
      screenshotType === "viewport"
        ? result.screenshot_path
        : result.screenshot_full_path;
    if (path) setSelectedScreenshot(`${apiUrl}/${path}`);
  };

  const goNext = () => {
    if (!screenshotResults.length || selectedIndex === null) return;
    const apiUrl = getApiBaseUrl();
    const nextIndex = (selectedIndex + 1) % screenshotResults.length;
    setSelectedIndex(nextIndex);
    const result = screenshotResults[nextIndex];
    const path =
      screenshotType === "viewport"
        ? result.screenshot_path
        : result.screenshot_full_path;
    if (path) setSelectedScreenshot(`${apiUrl}/${path}`);
  };

  const closeScreenshotModal = () => {
    setScreenshotModalOpen(false);
    setSelectedScreenshot(null);
    setSelectedIndex(null);
  };

  const handleStop = async () => {
    if (!currentJob?.job_id) return;
    try {
      setIsStopping(true);
      await api.stopJob(currentJob.job_id);

      await new Promise((resolve) => setTimeout(resolve, 500));

      updateJobStatus("stopped");

      disconnectWebSocket();

      setIsStopping(false);
    } catch (error) {
      console.error("Failed to stop job:", error);
      setIsStopping(false);
    }
  };

  useEffect(() => {
    if (!screenshotModalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screenshotModalOpen, selectedIndex, screenshotResults]);

  const handleDownload = async () => {
    if (!currentJob?.job_id) return;
    try {
      await api.downloadScreenshots(currentJob.job_id);
    } catch (error) {
      console.error("Failed to download screenshots:", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Configure Search Job</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              label="Search Query"
              placeholder="Enter search query or URL"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search Engines
              </label>
              <div className="flex gap-2 flex-wrap">
                {engines.map((engine) => (
                  <Button
                    key={engine}
                    variant={
                      selectedEngines.includes(engine) ? "primary" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setSelectedEngines((prev) =>
                        prev.includes(engine)
                          ? prev.filter((e) => e !== engine)
                          : [...prev, engine]
                      )
                    }
                  >
                    {engine.charAt(0).toUpperCase() + engine.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {}
            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowGoogleConfig(!showGoogleConfig)}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3 hover:text-slate-900"
              >
                <Key className="h-4 w-4" />
                Google API Credentials (Optional)
                <span className="text-xs text-slate-500">
                  {showGoogleConfig ? "▼" : "▶"}
                </span>
              </button>

              {showGoogleConfig && (
                <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2 text-sm text-amber-800 mb-3">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="mb-2">
                        <strong>Recommended:</strong> Add your own Google API
                        credentials to avoid rate limits. Without them, the
                        system will use shared credentials which may fail under
                        heavy use.
                      </p>
                      <a
                        href="https://developers.google.com/custom-search/v1/overview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline text-xs"
                      >
                        Learn how to create your own API keys →
                      </a>
                    </div>
                  </div>

                  <Input
                    label="Google API Key"
                    placeholder="AIzaSy..."
                    value={googleApiKey}
                    onChange={(e) => setGoogleApiKey(e.target.value)}
                    helperText="Your Google Custom Search API key"
                  />

                  <Input
                    label="Custom Search Engine ID (CX)"
                    placeholder="abc123def456..."
                    value={googleCseId}
                    onChange={(e) => setGoogleCseId(e.target.value)}
                    helperText="Your Google Custom Search Engine ID"
                  />

                  {googleApiKey && googleCseId && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Trash2 className="h-4 w-4" />}
                        onClick={removeGoogleCredentials}
                      >
                        Clear Credentials
                      </Button>
                      <span className="text-xs text-green-600">
                        ✓ Credentials saved locally
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600 mb-4">
                Valid Proxies: {validProxies.length} | Total Tasks:{" "}
                {validProxies.length * selectedEngines.length}
              </p>
              <Button
                onClick={handleStart}
                isLoading={isCreating}
                leftIcon={<Play />}
                disabled={
                  !query ||
                  validProxies.length === 0 ||
                  selectedEngines.length === 0 ||
                  !!(
                    currentJob &&
                    currentJob.status !== "completed" &&
                    currentJob.status !== "failed" &&
                    currentJob.status !== "stopped"
                  )
                }
              >
                Start Search
              </Button>
              {currentJob &&
                currentJob.status !== "completed" &&
                currentJob.status !== "failed" &&
                currentJob.status !== "stopped" && (
                  <p className="text-xs text-amber-600 mt-2">
                    Complete or stop the current job before starting a new one
                  </p>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      {currentJob && (
        <>
          <Card variant="bordered">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Job Progress: {currentJob.query}</CardTitle>
                  <CardDescription>
                    Created: {formatDate(currentJob.created_at)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {(currentJob.status === "running" ||
                    currentJob.status === "queued") && (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<StopCircle />}
                      onClick={handleStop}
                      isLoading={isStopping}
                      disabled={isStopping}
                    >
                      {isStopping ? "Stopping..." : "Stop Job"}
                    </Button>
                  )}
                  {currentJob.status === "completed" && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Download />}
                      onClick={handleDownload}
                    >
                      Download Screenshots
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge
                    variant={
                      currentJob.status === "completed"
                        ? "success"
                        : currentJob.status === "failed"
                        ? "error"
                        : currentJob.status === "stopped"
                        ? "warning"
                        : "warning"
                    }
                  >
                    {currentJob.status}
                  </Badge>
                  <span className="text-sm text-slate-600">
                    {currentJob.completed_tasks} / {currentJob.total_tasks}{" "}
                    tasks
                  </span>
                </div>
                <ProgressBar
                  value={currentJob.completed_tasks}
                  max={currentJob.total_tasks}
                  variant={
                    currentJob.status === "completed" ? "success" : "default"
                  }
                />
              </div>
            </CardContent>
          </Card>

          {currentJob.results && currentJob.results.length > 0 && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>
                  Search Results ({currentJob.results.length})
                </CardTitle>
                <CardDescription>
                  Screenshots captured from different locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-sm text-slate-600">Total Results</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {currentJob.results.length}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-slate-600">Successful</p>
                    <p className="text-2xl font-bold text-green-600">
                      {
                        currentJob.results.filter((r) => r.status === "success")
                          .length
                      }
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-slate-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">
                      {
                        currentJob.results.filter((r) => r.status === "failed")
                          .length
                      }
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-slate-600">Countries</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {new Set(currentJob.results.map((r) => r.country)).size}
                    </p>
                  </div>
                </div>

                {}
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filter Results
                    </h3>
                    {hasActiveFilters && (
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<X className="h-4 w-4" />}
                        onClick={resetFilters}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Location
                      </label>
                      <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        aria-label="Filter by location"
                      >
                        <option value="all">
                          All Locations ({uniqueLocations.length})
                        </option>
                        {uniqueLocations.map((location) => (
                          <option key={location} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                    </div>

                    {}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Search Engine
                      </label>
                      <select
                        value={selectedEngine}
                        onChange={(e) => setSelectedEngine(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        aria-label="Filter by search engine"
                      >
                        <option value="all">
                          All ({uniqueEngines.length})
                        </option>
                        {uniqueEngines.map((engine) => (
                          <option key={engine} value={engine}>
                            {engine.charAt(0).toUpperCase() + engine.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Status
                      </label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        aria-label="Filter by status"
                      >
                        <option value="all">
                          All ({uniqueStatuses.length})
                        </option>
                        {uniqueStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {}
                  <div className="mt-3 pt-3 border-t border-slate-300">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">
                        Showing{" "}
                        <span className="font-semibold">
                          {filteredResults.length}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold">
                          {currentJob.results.length}
                        </span>{" "}
                        results
                      </span>
                      {hasActiveFilters && (
                        <span className="text-blue-600 font-medium">
                          Filters Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {}
                <div className="space-y-4 mt-6">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Screenshots ({screenshotResults.length})
                  </h3>
                  {screenshotResults.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                      <Filter className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600">
                        {hasActiveFilters
                          ? "No screenshots match the selected filters"
                          : "No screenshots available yet"}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          leftIcon={<X className="h-4 w-4" />}
                          onClick={resetFilters}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {screenshotResults.map((result, index) => (
                        <div
                          key={index}
                          className="relative group cursor-pointer rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                          onClick={() =>
                            handleViewScreenshot(result.screenshot_path!)
                          }
                        >
                          <img
                            src={`${getApiBaseUrl()}/${result.screenshot_path}`}
                            alt={`${result.country} - ${result.engine}`}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              e.currentTarget.src =
                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <p className="text-white text-sm font-medium">
                                {result.country}
                              </p>
                              <p className="text-slate-300 text-xs">
                                {result.engine} · {result.city}
                              </p>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Badge
                              variant={
                                result.status === "success"
                                  ? "success"
                                  : "error"
                              }
                            >
                              {result.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Detailed Results ({filteredResults.length})
                  </h3>
                  {filteredResults.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-slate-600">
                        No results match the selected filters
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-4 py-2 text-left">Proxy</th>
                            <th className="px-4 py-2 text-left">Location</th>
                            <th className="px-4 py-2 text-left">Engine</th>
                            <th className="px-4 py-2 text-left">Status</th>
                            <th className="px-4 py-2 text-left">Screenshot</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredResults.map((result, index) => (
                            <tr
                              key={index}
                              className="border-b border-slate-200 hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 font-mono text-xs">
                                {result.proxy}
                              </td>
                              <td className="px-4 py-3">
                                {result.city}, {result.country}
                              </td>
                              <td className="px-4 py-3 capitalize">
                                {result.engine}
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant={
                                    result.status === "success"
                                      ? "success"
                                      : "error"
                                  }
                                  size="sm"
                                >
                                  {result.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                {result.screenshot_path ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={<ImageIcon className="h-4 w-4" />}
                                    onClick={() =>
                                      handleViewScreenshot(
                                        result.screenshot_path!
                                      )
                                    }
                                  >
                                    View
                                  </Button>
                                ) : (
                                  <span className="text-slate-400">N/A</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {}
      <Modal
        isOpen={screenshotModalOpen}
        onClose={closeScreenshotModal}
        title="Screenshot Preview"
        size="full"
      >
        {selectedScreenshot && (
          <div className="space-y-4">
            {}
            <div className="flex justify-center gap-2">
              <button
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  screenshotType === "viewport"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
                onClick={() => {
                  setScreenshotType("viewport");
                  const apiUrl = getApiBaseUrl();
                  if (
                    selectedIndex !== null &&
                    screenshotResults[selectedIndex]
                  ) {
                    const path =
                      screenshotResults[selectedIndex].screenshot_path;
                    if (path) setSelectedScreenshot(`${apiUrl}/${path}`);
                  }
                }}
              >
                <Monitor className="inline h-4 w-4 mr-1" />
                Viewport
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  screenshotType === "full"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
                onClick={() => {
                  setScreenshotType("full");
                  const apiUrl = getApiBaseUrl();
                  if (
                    selectedIndex !== null &&
                    screenshotResults[selectedIndex]
                  ) {
                    const path =
                      screenshotResults[selectedIndex].screenshot_full_path;
                    if (path) setSelectedScreenshot(`${apiUrl}/${path}`);
                  }
                }}
                disabled={
                  selectedIndex !== null &&
                  !screenshotResults[selectedIndex]?.screenshot_full_path
                }
              >
                <Maximize2 className="inline h-4 w-4 mr-1" />
                Full Page
              </button>
            </div>

            {}
            <div className="relative flex items-center justify-center">
              {}
              {screenshotResults.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 focus:outline-none z-10"
                    aria-label="Previous"
                    onClick={goPrev}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 focus:outline-none z-10"
                    aria-label="Next"
                    onClick={goNext}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              <img
                src={selectedScreenshot}
                alt="Screenshot"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.src =
                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23f1f5f9"/><text x="50%" y="50%" text-anchor="middle" fill="%2394a3b8" font-size="16">Screenshot not available</text></svg>';
                }}
              />
            </div>
          </div>
        )}

        {}
        {selectedIndex !== null && screenshotResults[selectedIndex] && (
          <div className="mt-4 text-center text-sm text-slate-600">
            <span className="font-medium">
              {selectedIndex + 1} / {screenshotResults.length}
            </span>{" "}
            - {screenshotResults[selectedIndex].country} •{" "}
            {screenshotResults[selectedIndex].engine}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SearchJobs;
