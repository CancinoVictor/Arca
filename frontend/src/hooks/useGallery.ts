import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { mediaApi, type Cursor, type Media } from '../api/media';
import { db } from '../lib/db';

const PAGE_SIZE = 60;

export type GalleryFilters = {
  type: 'all' | 'image' | 'video';
  sort: 'desc' | 'asc';
  year?: number;
  month?: number;
};

export function useGallery(filters: GalleryFilters) {
  const query = useInfiniteQuery({
    queryKey: ['media', 'infinite', filters],
    queryFn: ({ pageParam }) => mediaApi.list({
      cursor: pageParam ?? undefined,
      limit: PAGE_SIZE,
      type: filters.type,
      sort: filters.sort,
      year: filters.year,
      month: filters.month,
    }),
    initialPageParam: undefined as Cursor | undefined,
    getNextPageParam: (lastPage) => {
      const c = lastPage.next_cursor;
      return c && c.date && c.id ? c : undefined;
    },
    staleTime: 30_000,
  });

  // Dedup defensivo por id por si el backend devuelve solapamientos en la frontera de páginas.
  const items: Media[] = useMemo(() => {
    if (!query.data) return [];
    const seen = new Set<string>();
    const out: Media[] = [];
    for (const page of query.data.pages) {
      for (const m of page.items) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        out.push(m);
      }
    }
    return out;
  }, [query.data]);

  useEffect(() => {
    if (items.length === 0) return;
    db.media
      .bulkPut(
        items.map((m) => ({
          id: m.id,
          user_id: m.user_id,
          file_hash: m.file_hash,
          thumbnail_path: m.thumbnail_path,
          mime_type: m.mime_type,
          capture_date: m.capture_date,
          created_at: m.created_at,
        })),
      )
      .catch(() => {});
  }, [items]);

  return {
    items,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
