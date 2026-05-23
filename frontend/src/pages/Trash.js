import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useTrash } from '../hooks/useTrash';
import { useSelection } from '../hooks/useSelection';
import { useEmptyTrash, useRestoreMedia } from '../hooks/useMediaMutations';
import { PhotoGrid } from '../components/PhotoGrid';
import { Lightbox } from '../components/Lightbox';
import { SelectionBar } from '../components/gallery/SelectionBar';
import { Icon } from '../components/Icon';
import { ActionSheet } from '../components/ActionSheet';
const RETENTION_DAYS = 30;
function daysLeft(deletedAt) {
    if (!deletedAt)
        return RETENTION_DAYS;
    const d = new Date(deletedAt).getTime();
    const ms = d + RETENTION_DAYS * 24 * 3600 * 1000 - Date.now();
    return Math.max(0, Math.ceil(ms / (24 * 3600 * 1000)));
}
export function Trash() {
    const { items, hasNextPage, isFetchingNextPage, fetchNextPage, isLoading, isError, error } = useTrash();
    const selection = useSelection();
    const restoreMut = useRestoreMedia();
    const emptyMut = useEmptyTrash();
    const [activeIdx, setActiveIdx] = useState(null);
    const [confirmEmpty, setConfirmEmpty] = useState(false);
    const allIds = useMemo(() => items.map((i) => i.id), [items]);
    const allSelected = selection.count > 0 && selection.count === allIds.length;
    const performRestore = async () => {
        if (selection.count === 0)
            return;
        await restoreMut.mutateAsync(Array.from(selection.ids));
        selection.exit();
    };
    const performRestoreOne = async (id) => {
        await restoreMut.mutateAsync([id]);
        setActiveIdx(null);
    };
    const performEmpty = async () => {
        setConfirmEmpty(false);
        await emptyMut.mutateAsync();
        selection.exit();
    };
    const nextSoonest = items.length > 0 ? daysLeft(items[items.length - 1].deleted_at) : RETENTION_DAYS;
    if (isLoading)
        return _jsx("p", { className: "loading", children: "cargando papelera\u2026" });
    if (isError)
        return _jsxs("p", { className: "err", children: ["error: ", error.message] });
    return (_jsxs("section", { className: "page gallery-page", children: [_jsxs("header", { className: "page-header", children: [_jsxs("div", { children: [_jsx("h1", { className: "page-title", children: "papelera" }), _jsx("p", { className: "page-subtitle", children: items.length === 0
                                    ? 'la papelera está vacía'
                                    : `${items.length.toLocaleString('es-MX')} elementos · se borran en hasta ${nextSoonest} día${nextSoonest === 1 ? '' : 's'}` })] }), _jsx("div", { className: "page-actions", children: items.length > 0 && (_jsx("button", { type: "button", className: "btn danger", onClick: () => setConfirmEmpty(true), children: "vaciar" })) })] }), items.length === 0 ? (_jsxs("section", { className: "empty", children: [_jsx("div", { className: "empty__icon", "aria-hidden": "true", children: _jsx(Icon, { name: "trash", size: 26 }) }), _jsx("h2", { children: "todo limpio" }), _jsx("p", { className: "hint", children: "aqu\u00ED aparecer\u00E1n las fotos que muevas a la papelera." })] })) : (_jsxs("section", { className: "gallery", children: [_jsx(PhotoGrid, { items: items, sort: "desc", grid: "m", hasNextPage: hasNextPage, isFetchingNextPage: isFetchingNextPage, fetchNextPage: () => { fetchNextPage(); }, selectionMode: selection.active, isSelected: (id) => selection.has(id), onToggleSelect: (id) => selection.toggle(id), onLongPressItem: (id) => selection.enter(id), onOpen: setActiveIdx }), activeIdx !== null && items[activeIdx] && (_jsx(Lightbox, { media: items[activeIdx], onClose: () => setActiveIdx(null), onPrev: activeIdx > 0 ? () => setActiveIdx(activeIdx - 1) : undefined, onNext: activeIdx < items.length - 1 ? () => setActiveIdx(activeIdx + 1) : undefined, onRestore: () => performRestoreOne(items[activeIdx].id) }))] })), selection.active && (_jsx(SelectionBar, { count: selection.count, total: allIds.length, allSelected: allSelected, onCancel: selection.exit, onSelectAll: () => (allSelected ? selection.clear() : selection.setAll(allIds)), primary: { label: 'restaurar', busyLabel: 'restaurando…', variant: 'primary', onClick: performRestore }, busy: restoreMut.isPending })), confirmEmpty && (_jsx(ActionSheet, { title: `se borrarán ${items.length} elemento${items.length === 1 ? '' : 's'} permanentemente`, onCancel: () => setConfirmEmpty(false), options: [
                    {
                        label: emptyMut.isPending ? 'vaciando…' : 'vaciar papelera',
                        variant: 'danger',
                        onSelect: performEmpty,
                    },
                ] }))] }));
}
