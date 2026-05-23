import { useEffect, useState } from 'react';
const STORAGE_KEY = 'theme';
function isTheme(value) {
    return value === 'light' || value === 'dark';
}
export function getSystemTheme() {
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
}
export function getInitialTheme() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (isTheme(stored))
            return stored;
    }
    catch {
        // ignore
    }
    return getSystemTheme();
}
export function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const themeColor = theme === 'dark' ? '#000000' : '#F2F2F7';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
        meta.setAttribute('content', themeColor);
}
export function useTheme() {
    const [theme, setThemeState] = useState(() => getInitialTheme());
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);
    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
        if (!mq)
            return;
        const onChange = () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored)
                    return; // user explicitly chose a theme
            }
            catch {
                // ignore
            }
            setThemeState(getSystemTheme());
        };
        if ('addEventListener' in mq)
            mq.addEventListener('change', onChange);
        else
            mq.addListener(onChange);
        return () => {
            if ('removeEventListener' in mq)
                mq.removeEventListener('change', onChange);
            else
                mq.removeListener(onChange);
        };
    }, []);
    const setTheme = (next) => {
        setThemeState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        }
        catch {
            // ignore
        }
    };
    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
    return { theme, setTheme, toggleTheme };
}
