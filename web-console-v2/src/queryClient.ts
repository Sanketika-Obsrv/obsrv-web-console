import { QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            refetchOnMount: 'always',
            retry: (failureCount, error) => {
                if (error instanceof AxiosError && error.code !== 'ERR_NETWORK') {
                    // Retrying network errors only
                    return false;
                }
                // Retrying 3 times max (Tanstack Query default) in cause of network errors
                return failureCount < 3;
            }
        }
    }
});
