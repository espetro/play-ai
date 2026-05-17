import * as React from "react";
import { cn } from "~/lib/utils";

interface ConnectionProps {
  status?: "idle" | "connecting" | "connected" | "error";
  error?: string;
}

const Connection = React.forwardRef<HTMLDivElement, ConnectionProps>(
  ({ status = "idle", error }, ref) => {
    if (status === "idle") return null;

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md border px-4 py-3 text-sm",
          status === "connecting" && "border-blue-200 bg-blue-50 text-blue-900",
          status === "connected" && "border-green-200 bg-green-50 text-green-900",
          status === "error" && "border-red-200 bg-red-50 text-red-900",
        )}
      >
        {status === "connecting" && (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Testing connection...
          </div>
        )}
        {status === "connected" && (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent" />✓
            Connection tested
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-current" />
            {error || "Connection failed"}
          </div>
        )}
      </div>
    );
  },
);

Connection.displayName = "Connection";

export { Connection };
