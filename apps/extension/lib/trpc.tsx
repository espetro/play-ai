import { useState } from "react";
import { createTRPCClient } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { chromeLink } from "@kstonekuan/trpc-chrome/link";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppRouter } from "~/background/router";

// Imperative client (for use inside stores / hooks)
let port: ReturnType<typeof browser.runtime.connect> | null = null;

const getOrCreatePort = () => {
  if (!port) {
    port = browser.runtime.connect();
  }
  return port;
};

export const trpcClient = createTRPCClient<AppRouter>({
  links: [chromeLink({ port: getOrCreatePort() })],
});

// React Query integration
export const trpc = createTRPCReact<AppRouter>();

// Provider component for React tree
export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClientInstance] = useState(() =>
    trpc.createClient({
      links: [chromeLink({ port: getOrCreatePort() })],
    }),
  );
  return (
    <trpc.Provider client={trpcClientInstance} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
