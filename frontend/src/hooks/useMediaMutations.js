import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi } from '../api/media';
function invalidateMedia(qc) {
    qc.invalidateQueries({ queryKey: ['media'] });
}
export function useDeleteMedia() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (ids) => mediaApi.deleteBatch(ids),
        onSuccess: () => invalidateMedia(qc),
    });
}
export function useRestoreMedia() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (ids) => mediaApi.restoreBatch(ids),
        onSuccess: () => invalidateMedia(qc),
    });
}
export function useEmptyTrash() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => mediaApi.emptyTrash(),
        onSuccess: () => invalidateMedia(qc),
    });
}
