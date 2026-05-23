import { jsx as _jsx } from "react/jsx-runtime";
const SCOPES = [
    { id: 'years', label: 'años' },
    { id: 'months', label: 'meses' },
    { id: 'all', label: 'todas' },
];
export function ScopeBar({ value, onChange }) {
    return (_jsx("div", { className: "scope-bar", role: "tablist", "aria-label": "Vistas de biblioteca", children: SCOPES.map((s) => (_jsx("button", { type: "button", role: "tab", "aria-selected": value === s.id, className: value === s.id ? 'scope-bar__btn active' : 'scope-bar__btn', onClick: () => onChange(s.id), children: s.label }, s.id))) }));
}
