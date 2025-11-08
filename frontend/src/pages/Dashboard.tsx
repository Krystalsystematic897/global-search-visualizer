import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Server,
  Search,
  ArrowRight,
  CheckCircle,
  Clock,
} from "lucide-react";
import Card, {
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import { api } from "../services/api";
import type { APIInfo, HealthStatus } from "../types";
import { formatDate } from "../lib/utils";
import { getApiBaseUrl } from "../lib/utils";

const Dashboard = () => {
  const [apiInfo, setApiInfo] = useState<APIInfo | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [infoData, healthData] = await Promise.all([
          api.getAPIInfo(),
          api.getHealth(),
        ]);
        setApiInfo(infoData);
        setHealth(healthData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const quickActions = [
    {
      title: "Validate Proxies",
      description: "Check proxy health and geolocation",
      icon: Server,
      href: "/proxies",
      color: "blue",
    },
    {
      title: "Start Search",
      description: "Create a new search job",
      icon: Search,
      href: "/search",
      color: "green",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Welcome to Global Search Visualizer
        </h1>
        <p className="text-lg text-slate-600 mb-8">
          Capture and analyze search engine results from different geographic
          locations
        </p>
        <div className="flex items-center justify-center gap-4">
          <Badge
            variant={health?.status === "healthy" ? "success" : "error"}
            size="lg"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            {health?.status === "healthy" ? "API Online" : "API Offline"}
          </Badge>
          <Badge variant="default" size="lg">
            <Activity className="h-4 w-4 mr-1" />
            Version {apiInfo?.version}
          </Badge>
          <Badge variant="info" size="lg">
            <Clock className="h-4 w-4 mr-1" />
            {health?.timestamp && formatDate(health.timestamp)}
          </Badge>
        </div>
      </div>

      {}
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((action) => (
            <Card
              key={action.title}
              variant="elevated"
              padding="lg"
              className="hover:shadow-xl transition-shadow cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 rounded-lg bg-${action.color}-100 text-${action.color}-600`}
                >
                  <action.icon className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {action.title}
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {action.description}
              </p>
              <Link to={action.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon={
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  }
                >
                  Get Started
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      {}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>API Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                Available Endpoints
              </h4>
              <div className="space-y-2">
                {apiInfo?.endpoints && (
                  <ul className="space-y-1 text-sm text-slate-600">
                    <li>✓ Proxy Validation</li>
                    <li>✓ Search Job Management</li>
                    <li>✓ Session History</li>
                    <li>✓ Screenshot Downloads</li>
                  </ul>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                Documentation
              </h4>
              <div className="space-y-2">
                <a
                  href={`${getApiBaseUrl()}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-600 hover:text-blue-700"
                >
                  Swagger UI →
                </a>
                <a
                  href={`${getApiBaseUrl()}/redoc`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-600 hover:text-blue-700"
                >
                  ReDoc →
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
