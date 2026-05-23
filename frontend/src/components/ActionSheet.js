import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Icon } from './Icon';
export function ActionSheet({ title, options, cancelLabel = 'cancelar', onCancel }) {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape')
                onCancel();
        };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onCancel]);
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "sheet-scrim", onClick: onCancel, "aria-hidden": "true" }), _jsxs("div", { className: "action-sheet", role: "dialog", "aria-modal": "true", children: [_jsxs("div", { className: "action-sheet__group", children: [title && _jsx("div", { className: "action-sheet__title", children: title }), options.map((opt, i) => (_jsx("button", { type: "button", className: `action-sheet__btn${opt.variant === 'danger' ? ' danger' : ''}${opt.variant === 'bold' ? ' bold' : ''}`, onClick: () => {
                                    opt.onSelect();
                                }, children: opt.selected ? (_jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 8 }, children: [_jsx(Icon, { name: "check", size: 18, strokeWidth: 2.4 }), opt.label] })) : (opt.label) }, i)))] }), _jsx("button", { type: "button", className: "action-sheet__cancel", onClick: onCancel, children: cancelLabel })] })] }));
}
