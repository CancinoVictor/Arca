import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './styles.css';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
    },
});
const root = document.getElementById('root');
if (!root)
    throw new Error('missing #root');
createRoot(root).render(_jsx(StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(App, {}) }) }));
