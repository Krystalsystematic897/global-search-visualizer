import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../stores/sessionStore";
import Card, { CardContent } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { formatRelativeTime } from "../lib/utils";
import { FileText, ExternalLink } from "lucide-react";

const Sessions = () => {
  const navigate = useNavigate();
  const { sessions, isLoading, fetchSessions } = useSessionStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Search Sessions</h1>
        <p className="text-slate-600 mt-2">
          View all your previous search sessions
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card variant="bordered">
          <CardContent>
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Sessions Yet
              </h3>
              <p className="text-slate-600">
                Start a search job to create your first session
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.job_id} variant="bordered">
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {session.query}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{formatRelativeTime(session.created_at)}</span>
                      <span>•</span>
                      <span>{session.total_results} results</span>
                      <span>•</span>
                      <Badge
                        variant={
                          session.status === "completed"
                            ? "success"
                            : session.status === "failed"
                            ? "error"
                            : session.status === "stopped"
                            ? "warning"
                            : "warning"
                        }
                        size="sm"
                      >
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ExternalLink />}
                    onClick={() => navigate(`/sessions/${session.job_id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sessions;
