import { api } from './client';

export type Media = {
  id: string;
  user_id: string;
  file_hash: string;
  original_path: string;
  thumbnail_path: string | null;
  file_type: string;
  mime_type: string;
  size_bytes: number;
  capture_date: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type Cursor = { date: string; id: string };

export type ListResponse = {
  items: Media[];
  next_cursor: Cursor | null;
};

export type VerifyBatchItem = {
  hash: string;
  exists: boolean;
  media_id: string | null;
};

export type VerifyBatchResponse = { results: VerifyBatchItem[] };

export type MediaListParams = {
  cursor?: Cursor;
  limit?: number;
  sort?: 'desc' | 'asc';
  type?: 'all' | 'image' | 'video';
  from?: string;
  to?: string;
  year?: number;
  month?: number;
  trashed?: boolean;
};

export type Bucket = {
  bucket: string;
  count: number;
  earliest: string;
  latest: string;
  cover_id: string | null;
};

export type BucketsResponse = {
  granularity: 'year' | 'month';
  buckets: Bucket[];
};

export type BucketsParams = {
  granularity: 'year' | 'month';
  type?: 'all' | 'image' | 'video';
};

export type DeleteResponse = { deleted: number; requested: number };
export type EmptyTrashResponse = { purged: number };

export const mediaApi = {
  list: (paramsIn: MediaListParams = {}) => {
    const params = new URLSearchParams();

    const sort = paramsIn.sort ?? 'desc';
    params.set('sort', sort);

    const cursor = paramsIn.cursor;
    if (cursor && cursor.date && cursor.id) {
      if (sort === 'asc') {
        params.set('after', cursor.date);
        params.set('after_id', cursor.id);
      } else {
        params.set('before', cursor.date);
        params.set('before_id', cursor.id);
      }
    }

    if (paramsIn.limit) params.set('limit', String(paramsIn.limit));

    const type = paramsIn.type ?? 'all';
    if (type !== 'all') params.set('type', type);

    if (paramsIn.from) params.set('from', paramsIn.from);
    if (paramsIn.to) params.set('to', paramsIn.to);

    if (paramsIn.year) params.set('year', String(paramsIn.year));
    if (paramsIn.month) params.set('month', String(paramsIn.month));

    if (paramsIn.trashed) params.set('trashed', 'true');

    const qs = params.toString();
    return api.get<ListResponse>(`/media${qs ? `?${qs}` : ''}`);
  },

  buckets: ({ granularity, type }: BucketsParams) => {
    const params = new URLSearchParams({ granularity });
    if (type && type !== 'all') params.set('type', type);
    return api.get<BucketsResponse>(`/media/buckets?${params.toString()}`);
  },

  verify: (hash: string) =>
    api.post<{ exists: boolean; media: Media | null }>('/media/verify', { hash }),
  verifyBatch: (hashes: string[]) =>
    api.post<VerifyBatchResponse>('/media/verify-batch', { hashes }),

  deleteOne: (id: string) =>
    api.del<DeleteResponse>(`/media/${id}`),
  deleteBatch: (ids: string[]) =>
    api.post<DeleteResponse>('/media/delete-batch', { ids }),
  restoreOne: (id: string) =>
    api.post<DeleteResponse>(`/media/${id}/restore`, {}),
  restoreBatch: (ids: string[]) =>
    api.post<DeleteResponse>('/media/restore-batch', { ids }),
  emptyTrash: () =>
    api.del<EmptyTrashResponse>('/media/trash'),
};
