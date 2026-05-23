import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { mediaApi } from '../api/media';
const PAGE_SIZE = 60;
export function useTrash() {
    const q = useInfiniteQuery({
        queryKey: ['media', 'trash', 'infinite'],
        queryFn: ({ pageParam }) => mediaApi.list({
            cursor: pageParam ?? undefined,
            limit: PAGE_SIZE,
            sort: 'desc',
            trashed: true,
        }),
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => {
            const c = lastPage.next_cursor;
            return c && c.date && c.id ? c : undefined;
        },
        staleTime: 30_000,
    });
    const items = useMemo(() => {
        if (!q.data)
            return [];
        const seen = new Set();
        const out = [];
        for (const page of q.data.pages) {
            for (const m of page.items) {
                if (seen.has(m.id))
                    continue;
                seen.add(m.id);
                out.push(m);
            }
        }
        return out;
    }, [q.data]);
    return {
        items,
        hasNextPage: q.hasNextPage,
        isFetchingNextPage: q.isFetchingNextPage,
        fetchNextPage: q.fetchNextPage,
        isLoading: q.isPending,
        isError: q.isError,
        error: q.error,
    };
}
