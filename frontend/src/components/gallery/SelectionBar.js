import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export function SelectionBar({ count, total, allSelected, selectingAll, onCancel, onSelectAll, primary, busy }) {
    const variant = primary.variant ?? 'danger';
    const selectAllLabel = selectingAll
        ? 'cargando…'
        : allSelected
            ? 'ninguno'
            : `todo (${total})`;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "selection-top", role: "toolbar", "aria-label": "Selecci\u00F3n", children: [_jsx("button", { type: "button", className: "chip", onClick: onCancel, disabled: busy || selectingAll, children: "cancelar" }), _jsx("span", { className: "selection-top__count", "aria-live": "polite", children: count > 0 ? `${count.toLocaleString('es-MX')} seleccionada${count === 1 ? '' : 's'}` : 'selecciona elementos' }), _jsx("button", { type: "button", className: "chip", onClick: onSelectAll, disabled: busy || selectingAll || total === 0, children: selectAllLabel })] }), _jsx("div", { className: "selection-bottom", role: "toolbar", "aria-label": "Acciones de selecci\u00F3n", children: _jsx("button", { type: "button", className: `selection-bottom__btn ${variant}`, onClick: primary.onClick, disabled: busy || selectingAll || count === 0, children: busy ? (primary.busyLabel ?? 'procesando…') : `${primary.label}${count > 0 ? ` (${count.toLocaleString('es-MX')})` : ''}` }) })] }));
}
