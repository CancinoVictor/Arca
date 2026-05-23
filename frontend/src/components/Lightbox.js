import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
const SWIPE_THRESHOLD = 70;
function formatPhotoDate(iso, fallbackIso) {
    const d = new Date(iso ?? fallbackIso);
    const now = new Date();
    const sameDay = d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.getFullYear() === yesterday.getFullYear() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getDate() === yesterday.getDate();
    const sameYear = d.getFullYear() === now.getFullYear();
    let day;
    if (sameDay)
        day = 'hoy';
    else if (isYesterday)
        day = 'ayer';
    else if (sameYear) {
        day = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'long' }).format(d);
    }
    else {
        day = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    }
    const time = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' }).format(d);
    return { day, time };
}
export function Lightbox({ media, onClose, onPrev, onNext, onDelete, onRestore }) {
    const [confirming, setConfirming] = useState(false);
    const startRef = useRef(null);
    const [drag, setDrag] = useState(null);
    useEffect(() => {
        function onKey(e) {
            if (e.key === 'Escape')
                onClose();
            else if (e.key === 'ArrowLeft' && onPrev)
                onPrev();
            else if (e.key === 'ArrowRight' && onNext)
                onNext();
            else if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete)
                setConfirming(true);
        }
        window.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose, onPrev, onNext, onDelete]);
    // Reset confirm state when navigating to another item.
    useEffect(() => {
        setConfirming(false);
    }, [media.id]);
    const isVideo = media.file_type === 'video';
    const src = `/api/media/${media.id}/file`;
    const { day, time } = formatPhotoDate(media.capture_date, media.created_at);
    const onPointerDown = useCallback((e) => {
        if (e.pointerType === 'mouse' && e.button !== 0)
            return;
        startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        e.target.setPointerCapture?.(e.pointerId);
    }, []);
    const onPointerMove = useCallback((e) => {
        if (!startRef.current)
            return;
        const dx = e.clientX - startRef.current.x;
        const dy = e.clientY - startRef.current.y;
        setDrag({ dx, dy });
    }, []);
    const onPointerUp = useCallback(() => {
        const d = drag;
        setDrag(null);
        startRef.current = null;
        if (!d)
            return;
        const absX = Math.abs(d.dx);
        const absY = Math.abs(d.dy);
        if (absX > absY && absX > SWIPE_THRESHOLD) {
            if (d.dx < 0 && onNext)
                onNext();
            else if (d.dx > 0 && onPrev)
                onPrev();
        }
        else if (absY > absX && d.dy > SWIPE_THRESHOLD) {
            onClose();
        }
    }, [drag, onClose, onNext, onPrev]);
    const transform = drag
        ? `translate3d(${drag.dx}px, ${Math.max(0, drag.dy)}px, 0)`
        : undefined;
    const fadeBg = drag ? Math.max(0.55, 1 - Math.min(Math.abs(drag.dy), 240) / 480) : 1;
    return (_jsxs("div", { className: "lightbox", role: "dialog", "aria-modal": "true", onClick: onClose, style: { background: `rgba(0,0,0,${0.92 * fadeBg})` }, children: [_jsxs("div", { className: "lightbox-top", onClick: (e) => e.stopPropagation(), children: [_jsx("button", { className: "lightbox-close", onClick: onClose, "aria-label": "cerrar", type: "button", children: _jsx(Icon, { name: "close", size: 20 }) }), _jsxs("div", { className: "lightbox-meta", children: [_jsx("span", { className: "lightbox-meta__day", children: day }), _jsxs("span", { className: "lightbox-meta__time", children: [time, isVideo ? ' · video' : ''] })] }), _jsxs("div", { className: "lightbox-actions", children: [_jsx("a", { className: "lightbox-action", href: src, download: true, "aria-label": "descargar", children: _jsx(Icon, { name: "download", size: 18 }) }), onRestore && (_jsx("button", { className: "lightbox-action", type: "button", onClick: onRestore, "aria-label": "restaurar", title: "restaurar", children: _jsx(Icon, { name: "restore", size: 18 }) })), onDelete && (_jsx("button", { className: "lightbox-action danger", type: "button", onClick: () => setConfirming(true), "aria-label": "borrar", children: _jsx(Icon, { name: "trash", size: 18 }) }))] })] }), onPrev && (_jsx("button", { className: "lightbox-nav prev", onClick: (e) => { e.stopPropagation(); onPrev(); }, "aria-label": "anterior", type: "button", children: _jsx(Icon, { name: "chevron-left", size: 22 }) })), onNext && (_jsx("button", { className: "lightbox-nav next", onClick: (e) => { e.stopPropagation(); onNext(); }, "aria-label": "siguiente", type: "button", children: _jsx(Icon, { name: "chevron-right", size: 22 }) })), _jsx("div", { className: "lightbox-stage", onClick: (e) => e.stopPropagation(), onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp, style: { transform, transition: drag ? 'none' : 'transform 220ms ease' }, children: isVideo ? (_jsx("video", { src: src, controls: true, autoPlay: true, className: "lightbox-media" })) : (_jsx("img", { src: src, alt: "", className: "lightbox-media", draggable: false })) }), confirming && (_jsxs("div", { className: "confirm-sheet", onClick: (e) => e.stopPropagation(), children: [_jsx("p", { className: "confirm-sheet__text", children: "\u00BFmover a la papelera?" }), _jsxs("div", { className: "confirm-sheet__actions", children: [_jsx("button", { type: "button", className: "chip", onClick: () => setConfirming(false), children: "cancelar" }), _jsx("button", { type: "button", className: "chip danger", onClick: () => {
                                    setConfirming(false);
                                    onDelete?.();
                                }, children: "mover a papelera" })] })] }))] }));
}
