import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routes";
import { ErrorBoundary } from "~/components/error-boundary";
import { TrpcProvider } from "~/lib/trpc";
import "./style.css";

if (import.meta.env.DEV) {
  import("react-scan").then(({ scan }) => scan({ enabled: true }));
}

const hashHistory = createHashHistory();
const router = createRouter({ routeTree, history: hashHistory });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <TrpcProvider>
      <RouterProvider router={router} />
    </TrpcProvider>
  </ErrorBoundary>,
);
