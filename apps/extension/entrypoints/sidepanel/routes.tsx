import { lazy, Suspense } from "react";
import { createRootRoute, createRoute } from "@tanstack/react-router";
import Root from "./pages/Root";
import Chat from "./pages/Chat";

const Settings = lazy(() => import("./pages/Settings"));

export const rootRoute = createRootRoute({ component: Root });

export const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Chat,
});

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <Suspense fallback={null}>
      <Settings />
    </Suspense>
  ),
});

export const routeTree = rootRoute.addChildren([chatRoute, settingsRoute]);
