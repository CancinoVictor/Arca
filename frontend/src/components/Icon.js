import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * SF-Symbols-inspired stroke icons. All draws use round joins and 1.9 stroke width
 * to match the visual weight of Apple's default "medium" symbols.
 */
export function Icon({ name, size = 22, ...rest }) {
    const props = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.9,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        ...rest,
    };
    switch (name) {
        case 'close':
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M6 6l12 12M18 6L6 18" }) }));
        case 'chevron-left':
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M15 5l-7 7 7 7" }) }));
        case 'chevron-right':
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M9 5l7 7-7 7" }) }));
        case 'chevron-down':
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M5 9l7 7 7-7" }) }));
        case 'chevron-up':
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M5 15l7-7 7 7" }) }));
        case 'trash':
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M4 7h16" }), _jsx("path", { d: "M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" }), _jsx("path", { d: "M6 7l1 12.5A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.5L18 7" }), _jsx("path", { d: "M10 11v6M14 11v6" })] }));
        case 'download':
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M12 4v12" }), _jsx("path", { d: "M7 11l5 5 5-5" }), _jsx("path", { d: "M5 20h14" })] }));
        case 'restore':
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M3 12a9 9 0 1 0 3-6.7" }), _jsx("path", { d: "M3 4v5h5" })] }));
        case 'check':
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M5 12.5l4.5 4.5L19 7" }) }));
        case 'check-circle':
            return (_jsxs("svg", { ...props, children: [_jsx("circle", { cx: "12", cy: "12", r: "9" }), _jsx("path", { d: "M8 12.5l3 3 5-6" })] }));
        case 'plus':
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M12 5v14M5 12h14" }) }));
        case 'ellipsis':
            return (_jsxs("svg", { ...props, children: [_jsx("circle", { cx: "6", cy: "12", r: "1.2", fill: "currentColor", stroke: "none" }), _jsx("circle", { cx: "12", cy: "12", r: "1.2", fill: "currentColor", stroke: "none" }), _jsx("circle", { cx: "18", cy: "12", r: "1.2", fill: "currentColor", stroke: "none" })] }));
        case 'sort':
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M7 4v15" }), _jsx("path", { d: "M4 16l3 3 3-3" }), _jsx("path", { d: "M17 20V5" }), _jsx("path", { d: "M14 8l3-3 3 3" })] }));
        case 'grid-large':
            return (_jsxs("svg", { ...props, children: [_jsx("rect", { x: "4", y: "4", width: "7.5", height: "7.5", rx: "1.6" }), _jsx("rect", { x: "12.5", y: "4", width: "7.5", height: "7.5", rx: "1.6" }), _jsx("rect", { x: "4", y: "12.5", width: "7.5", height: "7.5", rx: "1.6" }), _jsx("rect", { x: "12.5", y: "12.5", width: "7.5", height: "7.5", rx: "1.6" })] }));
        case 'grid-medium':
            return (_jsxs("svg", { ...props, children: [_jsx("rect", { x: "4", y: "4", width: "4.5", height: "4.5", rx: "1" }), _jsx("rect", { x: "9.75", y: "4", width: "4.5", height: "4.5", rx: "1" }), _jsx("rect", { x: "15.5", y: "4", width: "4.5", height: "4.5", rx: "1" }), _jsx("rect", { x: "4", y: "9.75", width: "4.5", height: "4.5", rx: "1" }), _jsx("rect", { x: "9.75", y: "9.75", width: "4.5", height: "4.5", rx: "1" }), _jsx("rect", { x: "15.5", y: "9.75", width: "4.5", height: "4.5", rx: "1" }), _jsx("rect", { x: "4", y: "15.5", width: "4.5", height: "4.5", rx: "1" }), _jsx("rect", { x: "9.75", y: "15.5", width: "4.5", height: "4.5", rx: "1" }), _jsx("rect", { x: "15.5", y: "15.5", width: "4.5", height: "4.5", rx: "1" })] }));
        case 'grid-small':
            return (_jsx("svg", { ...props, children: [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => (_jsx("rect", { x: 4 + c * 4.2, y: 4 + r * 4.2, width: "3.2", height: "3.2", rx: "0.6" }, `${r}-${c}`)))) }));
        case 'photo':
            return (_jsxs("svg", { ...props, children: [_jsx("rect", { x: "3", y: "5", width: "18", height: "14", rx: "2.5" }), _jsx("circle", { cx: "9", cy: "11", r: "1.6" }), _jsx("path", { d: "M21 17l-5-5-7 7" })] }));
        case 'video':
            return (_jsxs("svg", { ...props, children: [_jsx("rect", { x: "3", y: "6", width: "13", height: "12", rx: "2.5" }), _jsx("path", { d: "M16 10l5-3v10l-5-3z" })] }));
        case 'play':
            return (_jsx("svg", { ...props, children: _jsx("path", { d: "M7 5l13 7-13 7z", fill: "currentColor", stroke: "none" }) }));
        case 'library':
            return (_jsxs("svg", { ...props, children: [_jsx("rect", { x: "3", y: "3", width: "8", height: "8", rx: "2" }), _jsx("rect", { x: "13", y: "3", width: "8", height: "8", rx: "2" }), _jsx("rect", { x: "3", y: "13", width: "8", height: "8", rx: "2" }), _jsx("rect", { x: "13", y: "13", width: "8", height: "8", rx: "2" })] }));
        case 'upload':
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M12 4v13" }), _jsx("path", { d: "M7 9l5-5 5 5" }), _jsx("path", { d: "M5 20h14" })] }));
        case 'arrow-left':
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M19 12H5" }), _jsx("path", { d: "M12 5l-7 7 7 7" })] }));
        case 'share':
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M12 3v13" }), _jsx("path", { d: "M7 8l5-5 5 5" }), _jsx("path", { d: "M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" })] }));
        case 'search':
            return (_jsxs("svg", { ...props, children: [_jsx("circle", { cx: "11", cy: "11", r: "6" }), _jsx("path", { d: "M20 20l-3.5-3.5" })] }));
        case 'circle':
            return (_jsx("svg", { ...props, children: _jsx("circle", { cx: "12", cy: "12", r: "9" }) }));
        case 'camera':
            return (_jsxs("svg", { ...props, children: [_jsx("path", { d: "M4 8a2 2 0 0 1 2-2h2l1.2-2h5.6L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" }), _jsx("circle", { cx: "12", cy: "13", r: "3.4" })] }));
        case 'photo-library':
            return (_jsxs("svg", { ...props, children: [_jsx("rect", { x: "6", y: "4", width: "14", height: "14", rx: "2.5" }), _jsx("path", { d: "M4 7v11a2 2 0 0 0 2 2h11" }), _jsx("circle", { cx: "11", cy: "10", r: "1.6" }), _jsx("path", { d: "M20 15l-4-4-7 7" })] }));
        case 'spinner':
            return (_jsxs("svg", { ...props, children: [_jsx("circle", { cx: "12", cy: "12", r: "9", opacity: "0.25" }), _jsx("path", { d: "M21 12a9 9 0 0 0-9-9" })] }));
        default:
            return null;
    }
}
