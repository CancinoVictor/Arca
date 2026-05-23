import { useQuery } from '@tanstack/react-query';
import { mediaApi, type Bucket, type BucketsParams } from '../api/media';

export type UseBucketsResult = {
  buckets: Bucket[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export function useBuckets(params: BucketsParams): UseBucketsResult {
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
