import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useBuckets } from '../../hooks/useBuckets';
export function YearsView({ type, onPick }) {
    const { buckets, isLoading, isError, error } = useBuckets({ granularity: 'year', type });
    if (isLoading)
        return _jsx("p", { className: "loading", children: "cargando a\u00F1os\u2026" });
    if (isError)
        return _jsxs("p", { className: "err", children: ["error: ", error?.message ?? 'desconocido'] });
    if (buckets.length === 0)
        return _jsx("p", { className: "hint", children: "sin elementos todav\u00EDa." });
    return (_jsx("div", { className: "years-grid", children: buckets.map((b) => {
            const year = Number(b.bucket);
            return (_jsxs("button", { type: "button", className: "year-tile", onClick: () => onPick(year), "aria-label": `${year}: ${b.count} elementos`, children: [b.cover_id ? (_jsx("img", { src: `/api/media/${b.cover_id}/thumbnail`, alt: "", className: "year-tile__img", loading: "lazy", draggable: false })) : (_jsx("div", { className: "year-tile__img year-tile__placeholder", "aria-hidden": "true", children: "\u25CC" })), _jsx("div", { className: "year-tile__overlay" }), _jsxs("div", { className: "year-tile__meta", children: [_jsx("span", { className: "year-tile__year", children: year }), _jsxs("span", { className: "year-tile__count", children: [b.count.toLocaleString('es-MX'), " elementos"] })] })] }, b.bucket));
        }) }));
}
