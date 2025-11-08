import { useState } from "react";
import { useProxyStore } from "../stores/proxyStore";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import Textarea from "../components/ui/Textarea";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import { Server, Upload, Trash2, RefreshCw } from "lucide-react";

const ProxyManagement = () => {
  const {
    proxies,
    isValidating,
    validateProxies,
    revalidateProxy,
    revalidateAll,
    deleteProxy,
    clearProxies,
  } = useProxyStore();
  const [proxyText, setProxyText] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");

  const handleValidate = async () => {
    const proxyList = proxyText
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p);

    try {
      await validateProxies({
        proxy_list: proxyList,
        proxy_url: proxyUrl || undefined,
      });
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "valid":
        return "success";
      case "failed":
        return "error";
      case "validating":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Proxy Validation</CardTitle>
          <CardDescription>
            Enter proxies to validate and check their geolocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              label="Proxy List"
              placeholder="Enter proxies (one per line)&#10;Example:&#10;127.0.0.1:8080&#10;socks5://192.168.1.1:1080&#10;user:pass@proxy.com:3128"
              value={proxyText}
              onChange={(e) => setProxyText(e.target.value)}
              rows={10}
              helperText="Supports HTTP, SOCKS4, SOCKS5 proxies with optional authentication"
            />
            <Input
              label="Proxy List URL (Optional)"
              placeholder="https://example.com/proxies.txt"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              helperText="Fetch proxies from a URL"
            />
            <Button
              onClick={handleValidate}
              isLoading={isValidating}
              leftIcon={<Upload />}
              disabled={!proxyText && !proxyUrl}
            >
              Validate Proxies
            </Button>
          </div>
        </CardContent>
      </Card>

      {proxies.length > 0 && (
        <Card variant="bordered">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Proxy List ({proxies.length})</CardTitle>
                <CardDescription>
                  Valid: {proxies.filter((p) => p.status === "valid").length} |
                  Failed: {proxies.filter((p) => p.status === "failed").length}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                  onClick={revalidateAll}
                  disabled={isValidating || proxies.length === 0}
                >
                  Revalidate All
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={clearProxies}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isValidating ? (
              <Spinner />
            ) : (
              <div className="space-y-2">
                {proxies.map((proxy, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 gap-3"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <Server className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-medium break-all">
                          {proxy.proxy}
                        </p>
                        {proxy.country && (
                          <p className="text-sm text-slate-600 break-words">
                            {proxy.city}, {proxy.region}, {proxy.country} |{" "}
                            {proxy.isp}
                          </p>
                        )}
                        {proxy.error && (
                          <p className="text-sm text-red-600 break-words">
                            {proxy.error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getStatusVariant(proxy.status)}>
                        {proxy.status}
                      </Badge>
                      {proxy.protocol && (
                        <Badge variant="default">
                          {proxy.protocol.toUpperCase()}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<RefreshCw className="h-4 w-4" />}
                        onClick={() => revalidateProxy(proxy.proxy)}
                        disabled={isValidating}
                      >
                        Revalidate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProxy(proxy.proxy)}
                        leftIcon={<Trash2 className="h-4 w-4" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProxyManagement;
