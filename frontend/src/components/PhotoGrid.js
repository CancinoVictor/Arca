import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLongPress } from '../hooks/useLongPress';
import { Icon } from './Icon';
const GAP = 3;
const HEADER_H = 66;
function mediaDate(m) {
    return new Date(m.capture_date ?? m.created_at);
}
function monthKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}
function monthLabel(key) {
    const [y, m] = key.split('-').map((x) => Number(x));
    const d = new Date(y, (m ?? 1) - 1, 1);
    const fmt = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
    return fmt.format(d);
}
function baseCols(width) {
    if (width < 360)
        return 3;
    if (width < 480)
        return 4;
    if (width < 720)
        return 5;
    if (width < 980)
        return 6;
    if (width < 1220)
        return 7;
    return 8;
}
function adjustCols(cols, grid) {
    if (grid === 'l')
        return Math.max(2, cols - 2);
    if (grid === 's')
        return Math.min(10, cols + 1);
    return cols;
}
export const PhotoGrid = forwardRef(function PhotoGrid({ items, sort, grid, hasNextPage, isFetchingNextPage, fetchNextPage, onOpen, onLongPressItem, selectionMode, isSelected, onToggleSelect, onMonthChange, }, ref) {
    const parentRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);
    useLayoutEffect(() => {
        if (!parentRef.current)
            return;
        const el = parentRef.current;
        const update = () => setContainerWidth(el.clientWidth);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const cols = adjustCols(baseCols(containerWidth || 1024), grid);
    const cellSize = containerWidth > 0
        ? Math.floor((containerWidth - GAP * (cols - 1)) / cols)
        : 120;
    const rows = useMemo(() => {
        const out = [];
        let currentMonth = null;
        let bufferIndices = [];
        let bufferMedia = [];
        let rowCountInMonth = 0;
        const flushBuffer = () => {
            if (!currentMonth || bufferMedia.length === 0)
                return;
            out.push({
                type: 'grid',
                key: `g:${currentMonth}:${rowCountInMonth}`,
                monthKey: currentMonth,
                indices: bufferIndices,
                media: bufferMedia,
            });
            rowCountInMonth++;
            bufferIndices = [];
            bufferMedia = [];
        };
        for (let i = 0; i < items.length; i++) {
            const m = items[i];
            const mk = monthKey(mediaDate(m));
            if (mk !== currentMonth) {
                flushBuffer();
                currentMonth = mk;
                rowCountInMonth = 0;
                out.push({ type: 'header', key: `h:${mk}`, monthKey: mk, label: monthLabel(mk) });
            }
            bufferIndices.push(i);
            bufferMedia.push(m);
            if (bufferMedia.length === cols)
                flushBuffer();
        }
        flushBuffer();
        return out;
    }, [items, cols]);
    const monthByRowIndex = useMemo(() => rows.map((r) => r.monthKey), [rows]);
    const monthHeaderIndex = useMemo(() => {
        const map = new Map();
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (r.type === 'header')
                map.set(r.monthKey, i);
        }
        return map;
    }, [rows]);
    const virt = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (idx) => (rows[idx]?.type === 'header' ? HEADER_H : cellSize + GAP),
        overscan: 8,
        getItemKey: (idx) => rows[idx]?.key ?? String(idx),
    });
    useImperativeHandle(ref, () => ({
        scrollToMonth: (mk) => {
            const idx = monthHeaderIndex.get(mk);
            if (idx === undefined)
                return;
            virt.scrollToIndex(idx, { align: 'start' });
        },
    }), [monthHeaderIndex, virt]);
    const virtualItems = virt.getVirtualItems();
    const lastVisibleIndex = virtualItems.at(-1)?.index;
    const firstVisibleIndex = virtualItems[0]?.index;
    useEffect(() => {
        if (lastVisibleIndex === undefined)
            return;
        // Cargar siguiente página solo cuando estemos a 3 filas del final, y nunca con fetch ya en curso.
        if (lastVisibleIndex >= rows.length - 3 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [lastVisibleIndex, rows.length, hasNextPage, isFetchingNextPage, fetchNextPage]);
    const lastMonthLabelRef = useRef('');
    const [stickyLabel, setStickyLabel] = useState('');
    useEffect(() => {
        if (firstVisibleIndex === undefined)
            return;
        const mk = monthByRowIndex[firstVisibleIndex];
        if (!mk)
            return;
        const label = monthLabel(mk);
        if (label === lastMonthLabelRef.current)
            return;
        lastMonthLabelRef.current = label;
        setStickyLabel(label);
        onMonthChange?.(label);
    }, [firstVisibleIndex, monthByRowIndex, onMonthChange]);
    // Scrubber state
    const [scrubbing, setScrubbing] = useState(false);
    const [scrollState, setScrollState] = useState({ top: 0, height: 0, viewport: 0 });
    const scrubberRef = useRef(null);
    useEffect(() => {
        const el = parentRef.current;
        if (!el)
            return;
        const update = () => setScrollState({ top: el.scrollTop, height: el.scrollHeight, viewport: el.clientHeight });
        update();
        el.addEventListener('scroll', update, { passive: true });
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', update);
            ro.disconnect();
        };
    }, []);
    const scrollable = Math.max(0, scrollState.height - scrollState.viewport);
    const trackHeight = scrollState.viewport;
    const thumbHeight = Math.max(36, Math.min(96, trackHeight * (scrollState.viewport / Math.max(scrollState.height, 1))));
    const thumbTop = scrollable > 0
        ? (scrollState.top / scrollable) * (trackHeight - thumbHeight)
        : 0;
    const scrubFromClient = useCallback((clientY) => {
        const el = parentRef.current;
        const trackEl = scrubberRef.current;
        if (!el || !trackEl || scrollable <= 0)
            return;
        const rect = trackEl.getBoundingClientRect();
        const rel = clientY - rect.top - thumbHeight / 2;
        const ratio = Math.max(0, Math.min(1, rel / (rect.height - thumbHeight)));
        el.scrollTop = ratio * scrollable;
    }, [scrollable, thumbHeight]);
    const onScrubPointerDown = useCallback((e) => {
        e.preventDefault();
        setScrubbing(true);
        e.target.setPointerCapture?.(e.pointerId);
        scrubFromClient(e.clientY);
    }, [scrubFromClient]);
    const onScrubPointerMove = useCallback((e) => {
        if (!scrubbing)
            return;
        scrubFromClient(e.clientY);
    }, [scrubbing, scrubFromClient]);
    const stopScrub = useCallback(() => setScrubbing(false), []);
    // hide scrubber until there is meaningful scrollable content
    const showScrubber = items.length > 0 && scrollable > 80;
    return (_jsxs("div", { ref: parentRef, className: "photo-grid-scroll", "data-sort": sort, children: [_jsx("div", { className: "photo-grid-inner", style: { height: virt.getTotalSize() }, children: virt.getVirtualItems().map((vi) => {
                    const r = rows[vi.index];
                    if (!r)
                        return null;
                    if (r.type === 'header') {
                        return (_jsx("div", { className: "month-header", style: { transform: `translateY(${vi.start}px)`, height: HEADER_H }, children: _jsx("span", { className: "month-header__text", children: r.label }) }, r.key));
                    }
                    return (_jsx("div", { className: "grid-row", style: { transform: `translateY(${vi.start}px)`, height: cellSize + GAP }, children: _jsx("div", { className: "grid-row__inner", style: { gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP }, children: Array.from({ length: cols }).map((_, col) => {
                                const idx = r.indices[col];
                                const m = r.media[col];
                                if (idx === undefined || !m)
                                    return _jsx("div", {}, col);
                                return (_jsx(PhotoCell, { media: m, size: cellSize, selectionMode: !!selectionMode, selected: isSelected?.(m.id) ?? false, onOpen: () => onOpen(idx), onToggleSelect: () => onToggleSelect?.(m.id), onLongPress: () => onLongPressItem?.(m.id) }, m.id));
                            }) }) }, r.key));
                }) }), stickyLabel && (_jsx("div", { className: `sticky-month${scrubbing ? ' is-scrubbing' : ''}`, "aria-hidden": "true", children: stickyLabel })), showScrubber && (_jsx("div", { ref: scrubberRef, className: `scrubber${scrubbing ? ' active' : ''}`, onPointerDown: onScrubPointerDown, onPointerMove: onScrubPointerMove, onPointerUp: stopScrub, onPointerCancel: stopScrub, children: _jsx("div", { className: "scrubber__thumb", style: { height: thumbHeight, transform: `translateY(${thumbTop}px)` } }) })), isFetchingNextPage && _jsx("div", { className: "grid-loading", children: "cargando m\u00E1s\u2026" }), !hasNextPage && !isFetchingNextPage && items.length > 12 && (_jsxs("div", { className: "grid-loading", children: ["fin de la biblioteca \u00B7 ", items.length.toLocaleString('es-MX'), " elementos"] }))] }));
});
function PhotoCell({ media, size, selectionMode, selected, onOpen, onToggleSelect, onLongPress }) {
    const { handlers, didFire } = useLongPress({
        onLongPress,
        delay: 360,
    });
    const onClick = useCallback(() => {
        if (didFire())
            return; // long-press ya disparó
        if (selectionMode)
            onToggleSelect();
        else
            onOpen();
    }, [didFire, onOpen, onToggleSelect, selectionMode]);
    return (_jsxs("button", { type: "button", className: `photo-cell${selected ? ' is-selected' : ''}${selectionMode ? ' selecting' : ''}`, "aria-label": media.file_type === 'video' ? 'Video' : 'Foto', "aria-pressed": selectionMode ? selected : undefined, onClick: onClick, ...handlers, style: { width: size, height: size }, children: [_jsx(Thumb, { media: media, size: size }), selectionMode && (_jsx("span", { className: `select-mark${selected ? ' on' : ''}`, "aria-hidden": "true", children: selected && _jsx(Icon, { name: "check", size: 14, strokeWidth: 3 }) }))] }));
}
function Thumb({ media, size }) {
    const [errored, setErrored] = useState(false);
    const hasThumb = !!media.thumbnail_path && !errored;
    const isVideo = media.file_type === 'video';
    return (_jsxs("div", { className: "thumb", children: [hasThumb ? (_jsx("img", { src: `/api/media/${media.id}/thumbnail`, alt: "", loading: "lazy", width: size, height: size, draggable: false, onError: () => setErrored(true) })) : (_jsx("div", { className: "thumb-placeholder", children: _jsx(Icon, { name: isVideo ? 'play' : 'photo', size: 20 }) })), isVideo && hasThumb && (_jsxs("span", { className: "thumb-badge", children: [_jsx(Icon, { name: "play", size: 9, strokeWidth: 2.4 }), " video"] }))] }));
}
