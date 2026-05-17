import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { getConfig } from "~/lib/storage";

export default function Root() {
  const navigate = useNavigate();
  const [, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConfig().then((cfg) => {
      setConfig(cfg);
      if (!cfg) {
        navigate({ to: "/settings" });
      }
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <nav className="flex gap-2 border-b border-gray-200 p-3">
        <a href="#/" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100">
          Chat
        </a>
        <a href="#/settings" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100">
          Settings
        </a>
      </nav>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
