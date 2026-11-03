import { MutationCache, QueryClient, QueryClientConfig } from "@tanstack/react-query";
import { getHttpStatus } from "@/lib/errors";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      // Opt a mutation out of the blanket invalidateQueries() below - for mutations that fire
      // repeatedly (e.g. background polling) and have no bearing on the rest of the app's data.
      skipGlobalInvalidate?: boolean;
    };
  }
}

const retryFunction = (failureCount: number, error: unknown) => {
  const status = getHttpStatus(error);
  if (status !== undefined && status >= 400 && status < 500) return false;
  if (failureCount > 1)
    return false;
  return true;
}

// Config object to be passed to queryClient on initialization
const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 10000,  // Prevents refetching to often because the APi blocks if too many requests arrive
      retry: retryFunction
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      if (mutation.options.meta?.skipGlobalInvalidate) return;
      queryClient.invalidateQueries()
    },
  })
};

export const queryClient = new QueryClient(queryConfig);
