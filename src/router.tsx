import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PagePending } from "./components/site/PageNavigation";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    scrollRestorationBehavior: 'instant',
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 250,
    defaultPendingMinMs: 0,
    defaultPendingComponent: PagePending,
  });

  return router;
};
