import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Server, Search, Menu, X, Globe } from "lucide-react";
import { cn } from "../../lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Proxies", href: "/proxies", icon: Server },
  { name: "Search Jobs", href: "/search", icon: Search },
];

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      {}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 text-white transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
          <Globe className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Global Search</h1>
            <p className="text-xs text-slate-400">Visualizer</p>
          </div>
        </div>

        {}
        <nav className="px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-800">
          <p className="text-xs text-slate-400">Version 2.0.0</p>
          <a
            href=""
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            API Documentation →
          </a>
        </div>
      </aside>

      {}
      <div className="lg:pl-64">
        {}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {sidebarOpen ? (
                <X className="h-6 w-6 text-slate-700" />
              ) : (
                <Menu className="h-6 w-6 text-slate-700" />
              )}
            </button>

            <div className="flex-1 lg:flex-none">
              <h2 className="text-lg font-semibold text-slate-900">
                {navigation.find((item) => item.href === location.pathname)
                  ?.name || "Global Search Visualizer"}
              </h2>
            </div>
          </div>
        </header>

        {}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
