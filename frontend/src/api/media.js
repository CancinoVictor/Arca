import { api } from './client';
export const mediaApi = {
    list: (paramsIn = {}) => {
        const params = new URLSearchParams();
        const sort = paramsIn.sort ?? 'desc';
        params.set('sort', sort);
        const cursor = paramsIn.cursor;
        if (cursor && cursor.date && cursor.id) {
            if (sort === 'asc') {
                params.set('after', cursor.date);
                params.set('after_id', cursor.id);
            }
            else {
                params.set('before', cursor.date);
                params.set('before_id', cursor.id);
            }
        }
        if (paramsIn.limit)
            params.set('limit', String(paramsIn.limit));
        const type = paramsIn.type ?? 'all';
        if (type !== 'all')
            params.set('type', type);
        if (paramsIn.from)
            params.set('from', paramsIn.from);
        if (paramsIn.to)
            params.set('to', paramsIn.to);
        if (paramsIn.year)
            params.set('year', String(paramsIn.year));
        if (paramsIn.month)
            params.set('month', String(paramsIn.month));
        if (paramsIn.trashed)
            params.set('trashed', 'true');
        const qs = params.toString();
        return api.get(`/media${qs ? `?${qs}` : ''}`);
    },
    buckets: ({ granularity, type }) => {
        const params = new URLSearchParams({ granularity });
        if (type && type !== 'all')
            params.set('type', type);
        return api.get(`/media/buckets?${params.toString()}`);
    },
    verify: (hash) => api.post('/media/verify', { hash }),
    verifyBatch: (hashes) => api.post('/media/verify-batch', { hashes }),
    deleteOne: (id) => api.del(`/media/${id}`),
    deleteBatch: (ids) => api.post('/media/delete-batch', { ids }),
    restoreOne: (id) => api.post(`/media/${id}/restore`, {}),
    restoreBatch: (ids) => api.post('/media/restore-batch', { ids }),
    emptyTrash: () => api.del('/media/trash'),
};
