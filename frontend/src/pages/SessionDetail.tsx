import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSessionStore } from "../stores/sessionStore";
import Card, {
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import Modal from "../components/ui/Modal";
import { formatDate } from "../lib/utils";
import { getApiBaseUrl } from "../lib/utils";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Monitor,
  Filter,
  X,
} from "lucide-react";
import api from "../services/api";

const SessionDetail = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { currentSession, isLoading, fetchSession } = useSessionStore();
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(
    null
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [screenshotType, setScreenshotType] = useState<"viewport" | "full">(
    "viewport"
  );

  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedEngine, setSelectedEngine] = useState<string>("all");

  const apiUrl = useMemo(() => getApiBaseUrl(), []);

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    currentSession?.results.forEach((r) => {
      const location =
        r.city && r.city !== "Unknown" ? `${r.city}, ${r.country}` : r.country;
      if (location) locations.add(location);
    });
    return Array.from(locations).sort();
  }, [currentSession]);

  const uniqueEngines = useMemo(() => {
    const engines = new Set<string>();
    currentSession?.results.forEach((r) => {
      if (r.engine) engines.add(r.engine);
    });
    return Array.from(engines).sort();
  }, [currentSession]);

  const filteredResults = useMemo(() => {
    if (!currentSession) return [];

    return currentSession.results.filter((result) => {
      const resultLocation =
        result.city && result.city !== "Unknown"
          ? `${result.city}, ${result.country}`
          : result.country;
      const matchesLocation =
        selectedLocation === "all" || resultLocation === selectedLocation;

      const matchesEngine =
        selectedEngine === "all" || result.engine === selectedEngine;

      return matchesLocation && matchesEngine;
    });
  }, [currentSession, selectedLocation, selectedEngine]);

  const screenshotResults = useMemo(() => {
    return filteredResults.filter((r) => r.screenshot_path);
  }, [filteredResults]);

  const hasActiveFilters =
    selectedLocation !== "all" || selectedEngine !== "all";

  const resetFilters = () => {
    setSelectedLocation("all");
    setSelectedEngine("all");
  };

  useEffect(() => {
    if (jobId) {
      fetchSession(jobId);
    }
  }, [jobId, fetchSession]);

  const handleDownload = async () => {
    if (!jobId) return;
    try {
      await api.downloadScreenshots(jobId);
    } catch (error) {
      console.error("Failed to download screenshots:", error);
    }
  };

  const handleViewScreenshot = (screenshotPath: string) => {
    const index = screenshotResults.findIndex(
      (r) => r.screenshot_path === screenshotPath
    );
    const fullUrl = `${apiUrl}/${screenshotPath}`;
    setSelectedIndex(index >= 0 ? index : 0);
    setSelectedScreenshot(fullUrl);
    setScreenshotType("viewport");
    setScreenshotModalOpen(true);
  };

  const getCurrentScreenshotUrl = () => {
    if (selectedIndex === null || !screenshotResults[selectedIndex])
      return null;
    const result = screenshotResults[selectedIndex];
    const path =
      screenshotType === "viewport"
        ? result.screenshot_path
        : result.screenshot_full_path;
    return path ? `${apiUrl}/${path}` : null;
  };

  const goPrev = () => {
    if (!screenshotResults.length || selectedIndex === null) return;
    const prevIndex =
      (selectedIndex - 1 + screenshotResults.length) % screenshotResults.length;
    setSelectedIndex(prevIndex);
    const url = getCurrentScreenshotUrl();
    if (url) setSelectedScreenshot(url);
  };

  const goNext = () => {
    if (!screenshotResults.length || selectedIndex === null) return;
    const nextIndex = (selectedIndex + 1) % screenshotResults.length;
    setSelectedIndex(nextIndex);
    const url = getCurrentScreenshotUrl();
    if (url) setSelectedScreenshot(url);
  };

  const closeScreenshotModal = () => {
    setScreenshotModalOpen(false);
    setSelectedScreenshot(null);
    setSelectedIndex(null);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card variant="bordered">
          <CardContent>
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Session Not Found
              </h3>
              <p className="text-slate-600 mb-4">
                The requested session could not be found
              </p>
              <Button
                onClick={() => navigate("/sessions")}
                leftIcon={<ArrowLeft />}
              >
                Back to Sessions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate("/sessions")}
          leftIcon={<ArrowLeft />}
        >
          Back to Sessions
        </Button>
        <Button
          variant="primary"
          leftIcon={<Download />}
          onClick={handleDownload}
        >
          Download Screenshots
        </Button>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {currentSession.query}
              </h2>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>{formatDate(currentSession.created_at)}</span>
                <span>•</span>
                <Badge
                  variant={
                    currentSession.status === "completed"
                      ? "success"
                      : currentSession.status === "failed"
                      ? "error"
                      : currentSession.status === "stopped"
                      ? "warning"
                      : "warning"
                  }
                >
                  {currentSession.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
              <div>
                <p className="text-sm text-slate-600">Total Tasks</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {currentSession.total_tasks}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Completed</p>
                <p className="text-2xl font-semibold text-emerald-600">
                  {currentSession.completed_tasks}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Results</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {currentSession.total_results ||
                    currentSession.results.length}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card variant="bordered">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search Engine
              </label>
              <select
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Filter by search engine"
              >
                <option value="all">
                  All Engines ({uniqueEngines.length})
                </option>
                {uniqueEngines.map((engine) => (
                  <option key={engine} value={engine}>
                    {engine.charAt(0).toUpperCase() + engine.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                Showing {filteredResults.length} of{" "}
                {currentSession.results.length} results
              </span>
              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-600 font-medium">
                    Filters Active
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      {screenshotResults.length > 0 && (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>
              Screenshots Gallery ({screenshotResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {screenshotResults.map((result, index) => (
                <div
                  key={index}
                  className="relative group cursor-pointer rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                  onClick={() => handleViewScreenshot(result.screenshot_path!)}
                >
                  <img
                    src={`${getApiBaseUrl()}/${result.screenshot_path}`}
                    alt={`${result.country} - ${result.engine}`}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="%23f1f5f9"/><text x="50%" y="50%" text-anchor="middle" fill="%2394a3b8" font-size="12">No preview</text></svg>';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs font-medium truncate">
                      {result.city && result.city !== "Unknown"
                        ? `${result.city}, ${result.country}`
                        : result.country}{" "}
                      - {result.engine}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Search Results ({filteredResults.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Results Found
              </h3>
              <p className="text-slate-600 mb-4">
                Try adjusting your filters to see more results
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  leftIcon={<X className="h-4 w-4" />}
                  onClick={resetFilters}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResults.map((result, index) => (
                <div
                  key={index}
                  className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {result.title || "No title"}
                      </h3>
                      <p className="text-sm text-slate-600 mb-2">
                        {result.snippet || "No snippet available"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <Badge size="sm" variant="info">
                          {result.city && result.city !== "Unknown"
                            ? `${result.city}, ${result.country}`
                            : result.country}
                        </Badge>
                        <Badge size="sm">{result.engine}</Badge>
                        <Badge
                          size="sm"
                          variant={
                            result.status === "success" ? "success" : "error"
                          }
                        >
                          {result.status}
                        </Badge>
                        {result.screenshot_path && (
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<ImageIcon className="h-3 w-3" />}
                            onClick={() =>
                              handleViewScreenshot(result.screenshot_path!)
                            }
                          >
                            View Screenshot
                          </Button>
                        )}
                      </div>
                    </div>
                    {result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 text-blue-600 hover:text-blue-700"
                        title="Open link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
            -{" "}
            {screenshotResults[selectedIndex].city &&
            screenshotResults[selectedIndex].city !== "Unknown"
              ? `${screenshotResults[selectedIndex].city}, ${screenshotResults[selectedIndex].country}`
              : screenshotResults[selectedIndex].country}{" "}
            • {screenshotResults[selectedIndex].engine}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SessionDetail;
