import { createRootRoute, createRoute } from "@tanstack/react-router";
import Root from "./pages/Root";
import Onboarding from "./pages/Onboarding";

export const rootRoute = createRootRoute({ component: Root });

export const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Onboarding,
});

export const routeTree = rootRoute.addChildren([onboardingRoute]);
