import { useQuery } from '@tanstack/react-query';
import { mediaApi } from '../api/media';
export function useBuckets(params) {
    const q = useQuery({
        queryKey: ['media', 'buckets', params],
        queryFn: () => mediaApi.buckets(params),
        staleTime: 60_000,
    });
    const buckets = q.data?.buckets ?? [];
    const total = buckets.reduce((s, b) => s + b.count, 0);
    return {
        buckets,
        total,
        isLoading: q.isPending,
        isError: q.isError,
        error: q.error,
    };
}
