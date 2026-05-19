import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routes";
import { ErrorBoundary } from "~/components/error-boundary";
import "./style.css";

const hashHistory = createHashHistory();
const router = createRouter({ routeTree, history: hashHistory });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <RouterProvider router={router} />
  </ErrorBoundary>,
);
