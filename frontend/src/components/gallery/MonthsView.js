import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useBuckets } from '../../hooks/useBuckets';
function monthName(month) {
    const fmt = new Intl.DateTimeFormat('es-MX', { month: 'long' });
    return fmt.format(new Date(2000, month - 1, 1));
}
export function MonthsView({ type, year, onPick }) {
    const { buckets, isLoading, isError, error } = useBuckets({ granularity: 'month', type });
    const grouped = useMemo(() => {
        const byYear = new Map();
        for (const b of buckets) {
            const [y, m] = b.bucket.split('-').map(Number);
            if (year && y !== year)
                continue;
            const arr = byYear.get(y) ?? [];
            arr.push(b);
            byYear.set(y, arr);
            void m;
        }
        return Array.from(byYear.entries()).sort((a, b) => b[0] - a[0]);
    }, [buckets, year]);
    if (isLoading)
        return _jsx("p", { className: "loading", children: "cargando meses\u2026" });
    if (isError)
        return _jsxs("p", { className: "err", children: ["error: ", error?.message ?? 'desconocido'] });
    if (grouped.length === 0)
        return _jsx("p", { className: "hint", children: "sin elementos todav\u00EDa." });
    return (_jsx("div", { className: "months-stack", children: grouped.map(([y, months]) => (_jsxs("section", { className: "months-section", children: [_jsx("h2", { className: "months-section__title", children: y }), _jsx("div", { className: "months-grid", children: months.map((b) => {
                        const [, mm] = b.bucket.split('-').map(Number);
                        return (_jsxs("button", { type: "button", className: "month-tile", onClick: () => onPick(y, mm), "aria-label": `${monthName(mm)} ${y}: ${b.count} elementos`, children: [b.cover_id ? (_jsx("img", { src: `/api/media/${b.cover_id}/thumbnail`, alt: "", loading: "lazy", className: "month-tile__img", draggable: false })) : (_jsx("div", { className: "month-tile__img month-tile__placeholder", "aria-hidden": "true", children: "\u25CC" })), _jsx("div", { className: "month-tile__overlay" }), _jsxs("div", { className: "month-tile__meta", children: [_jsx("span", { className: "month-tile__name", children: monthName(mm) }), _jsx("span", { className: "month-tile__count", children: b.count.toLocaleString('es-MX') })] })] }, b.bucket));
                    }) })] }, y))) }));
}
