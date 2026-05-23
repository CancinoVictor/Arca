import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGallery } from '../hooks/useGallery';
import { useBuckets } from '../hooks/useBuckets';
import { useSelection } from '../hooks/useSelection';
import { useDeleteMedia } from '../hooks/useMediaMutations';
import { PhotoGrid } from '../components/PhotoGrid';
import { Lightbox } from '../components/Lightbox';
import { ScopeBar } from '../components/gallery/ScopeBar';
import { YearsView } from '../components/gallery/YearsView';
import { MonthsView } from '../components/gallery/MonthsView';
import { SelectionBar } from '../components/gallery/SelectionBar';
import { ActionSheet } from '../components/ActionSheet';
import { Icon } from '../components/Icon';
function monthName(month) {
    return new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(2000, month - 1, 1));
}
export function Gallery() {
    const [scope, setScope] = useState('all');
    const [type, setType] = useState('all');
    const [sort, setSort] = useState('desc');
    const [grid, setGrid] = useState('m');
    const [year, setYear] = useState(undefined);
    const [month, setMonth] = useState(undefined);
    const [activeIdx, setActiveIdx] = useState(null);
    const [sortSheet, setSortSheet] = useState(false);
    const [typeSheet, setTypeSheet] = useState(false);
    const [selectingAll, setSelectingAll] = useState(false);
    const [pendingSelectAll, setPendingSelectAll] = useState(false);
    const selection = useSelection();
    const deleteMut = useDeleteMedia();
    const { items, hasNextPage, isFetchingNextPage, fetchNextPage, isLoading, isError, error } = useGallery({ type, sort, year, month });
    // Conteo real de la biblioteca (estable, independiente de la paginación cargada).
    const { total } = useBuckets({ granularity: 'year', type });
    const gridRef = useRef(null);
    useEffect(() => {
        setActiveIdx(null);
    }, [type, sort, year, month, scope]);
    const filterLabel = useMemo(() => {
        if (year && month)
            return `${monthName(month)} ${year}`;
        if (year)
            return `${year}`;
        return null;
    }, [year, month]);
    const clearDateFilter = () => {
        setYear(undefined);
        setMonth(undefined);
    };
    const goToMonth = (y, m) => {
        setYear(y);
        setMonth(m);
        setScope('all');
    };
    const goToYear = (y) => {
        setYear(y);
        setMonth(undefined);
        setScope('months');
    };
    const allIds = useMemo(() => items.map((i) => i.id), [items]);
    // Si tenemos el total real, "todos seleccionados" significa cubrir el total;
    // de lo contrario, los items cargados.
    const effectiveTotal = total > 0 ? total : allIds.length;
    const allSelected = selection.count > 0 && selection.count >= effectiveTotal;
    const performDelete = async () => {
        if (selection.count === 0)
            return;
        const ids = Array.from(selection.ids);
        await deleteMut.mutateAsync(ids);
        selection.exit();
    };
    const performSelectAll = async () => {
        if (allSelected) {
            selection.clear();
            return;
        }
        if (!hasNextPage) {
            selection.setAll(allIds);
            return;
        }
        // Precargar todas las páginas; al terminar, el effect de abajo aplicará setAll.
        setPendingSelectAll(true);
        setSelectingAll(true);
        try {
            while (true) {
                const r = await fetchNextPage();
                const last = r.data?.pages.at(-1);
                if (!last?.next_cursor)
                    break;
            }
        }
        finally {
            setSelectingAll(false);
        }
    };
    useEffect(() => {
        if (!pendingSelectAll || selectingAll)
            return;
        selection.setAll(items.map((i) => i.id));
        setPendingSelectAll(false);
    }, [pendingSelectAll, selectingAll, items, selection]);
    const performDeleteOne = async (id) => {
        await deleteMut.mutateAsync([id]);
        setActiveIdx(null);
    };
    if (isLoading && scope === 'all')
        return _jsx("p", { className: "loading", children: "cargando biblioteca\u2026" });
    if (isError && scope === 'all')
        return _jsxs("p", { className: "err", children: ["error: ", error.message] });
    const noFiltersActive = type === 'all' && !year && !month;
    if (scope === 'all' && items.length === 0 && noFiltersActive) {
        return (_jsxs("section", { className: "page", children: [_jsx("header", { className: "page-header", children: _jsxs("div", { children: [_jsx("h1", { className: "page-title", children: "biblioteca" }), _jsx("p", { className: "page-subtitle", children: "tu colecci\u00F3n est\u00E1 vac\u00EDa por ahora" })] }) }), _jsxs("section", { className: "empty", children: [_jsx("div", { className: "empty__icon", "aria-hidden": "true", children: _jsx(Icon, { name: "library", size: 28 }) }), _jsx("h2", { children: "biblioteca vac\u00EDa" }), _jsx("p", { className: "hint", children: "sube tus primeras fotos o videos para empezar." }), _jsx(Link, { to: "/upload", className: "cta", children: "subir mi primera foto" })] })] }));
    }
    const typeLabel = type === 'all' ? 'todo' : type === 'image' ? 'fotos' : 'videos';
    const sortLabel = sort === 'desc' ? 'más reciente' : 'más antigua';
    return (_jsxs("section", { className: "page gallery-page", children: [_jsx("header", { className: "page-header", children: _jsxs("div", { children: [_jsx("h1", { className: "page-title", children: "biblioteca" }), _jsx("p", { className: "page-subtitle", children: filterLabel ? (_jsxs(_Fragment, { children: [filterLabel, " \u00B7", ' ', _jsx("button", { type: "button", className: "linkish", onClick: clearDateFilter, children: "quitar filtro" })] })) : scope === 'all' ? (total > 0 ? `${total.toLocaleString('es-MX')} elementos` : 'biblioteca') : ('explora por fecha') })] }) }), _jsxs("div", { className: "gallery-controls", children: [_jsx(ScopeBar, { value: scope, onChange: setScope }), _jsxs("div", { className: "gallery-controls__right", children: [_jsxs("button", { type: "button", className: "chip", onClick: () => setTypeSheet(true), "aria-haspopup": "dialog", children: [type === 'image' && _jsx(Icon, { name: "photo", size: 14 }), type === 'video' && _jsx(Icon, { name: "video", size: 14 }), typeLabel, _jsx(Icon, { name: "chevron-down", size: 12 })] }), scope === 'all' && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: "chip", onClick: () => setSortSheet(true), "aria-haspopup": "dialog", "aria-label": `Orden: ${sortLabel}`, children: [_jsx(Icon, { name: "sort", size: 14 }), sortLabel, _jsx(Icon, { name: "chevron-down", size: 12 })] }), _jsxs("div", { className: "segmented", role: "group", "aria-label": "Tama\u00F1o", children: [_jsx("button", { type: "button", className: grid === 'l' ? 'segmented__btn active' : 'segmented__btn', onClick: () => setGrid('l'), "aria-label": "Grandes", children: _jsx(Icon, { name: "grid-large", size: 16 }) }), _jsx("button", { type: "button", className: grid === 'm' ? 'segmented__btn active' : 'segmented__btn', onClick: () => setGrid('m'), "aria-label": "Medianas", children: _jsx(Icon, { name: "grid-medium", size: 16 }) }), _jsx("button", { type: "button", className: grid === 's' ? 'segmented__btn active' : 'segmented__btn', onClick: () => setGrid('s'), "aria-label": "Peque\u00F1as", children: _jsx(Icon, { name: "grid-small", size: 16 }) })] })] }))] })] }), scope === 'years' && _jsx(YearsView, { type: type, onPick: goToYear }), scope === 'months' && _jsx(MonthsView, { type: type, year: year, onPick: goToMonth }), scope === 'all' && (_jsxs("section", { className: "gallery", children: [items.length === 0 ? (_jsxs("div", { className: "filter-empty", children: [_jsxs("p", { className: "hint", children: ["no hay ", type === 'video' ? 'videos' : type === 'image' ? 'fotos' : 'elementos', " en este filtro."] }), _jsxs("div", { className: "filter-empty__actions", children: [type !== 'all' && (_jsx("button", { type: "button", className: "chip", onClick: () => setType('all'), children: "ver todo" })), (year || month) && (_jsx("button", { type: "button", className: "chip", onClick: clearDateFilter, children: "quitar fechas" }))] })] })) : (_jsx(PhotoGrid, { ref: gridRef, items: items, sort: sort, grid: grid, hasNextPage: hasNextPage, isFetchingNextPage: isFetchingNextPage, fetchNextPage: () => { fetchNextPage(); }, selectionMode: selection.active, isSelected: (id) => selection.has(id), onToggleSelect: (id) => selection.toggle(id), onLongPressItem: (id) => selection.enter(id), onOpen: setActiveIdx })), activeIdx !== null && items[activeIdx] && (_jsx(Lightbox, { media: items[activeIdx], onClose: () => setActiveIdx(null), onPrev: activeIdx > 0 ? () => setActiveIdx(activeIdx - 1) : undefined, onNext: activeIdx < items.length - 1 ? () => setActiveIdx(activeIdx + 1) : undefined, onDelete: () => performDeleteOne(items[activeIdx].id) }))] })), selection.active && (_jsx(SelectionBar, { count: selection.count, total: effectiveTotal, allSelected: allSelected, selectingAll: selectingAll, onCancel: selection.exit, onSelectAll: performSelectAll, primary: { label: 'borrar', busyLabel: 'borrando…', variant: 'danger', onClick: performDelete }, busy: deleteMut.isPending })), sortSheet && (_jsx(ActionSheet, { title: "ordenar por", onCancel: () => setSortSheet(false), options: [
                    {
                        label: 'más reciente primero',
                        selected: sort === 'desc',
                        onSelect: () => { setSort('desc'); setSortSheet(false); },
                    },
                    {
                        label: 'más antigua primero',
                        selected: sort === 'asc',
                        onSelect: () => { setSort('asc'); setSortSheet(false); },
                    },
                ] })), typeSheet && (_jsx(ActionSheet, { title: "mostrar", onCancel: () => setTypeSheet(false), options: [
                    {
                        label: 'todo',
                        selected: type === 'all',
                        onSelect: () => { setType('all'); setTypeSheet(false); },
                    },
                    {
                        label: 'solo fotos',
                        selected: type === 'image',
                        onSelect: () => { setType('image'); setTypeSheet(false); },
                    },
                    {
                        label: 'solo videos',
                        selected: type === 'video',
                        onSelect: () => { setType('video'); setTypeSheet(false); },
                    },
                ] }))] }));
}
