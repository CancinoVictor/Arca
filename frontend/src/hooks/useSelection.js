import { useCallback, useMemo, useState } from 'react';
export function useSelection() {
    const [active, setActive] = useState(false);
    const [ids, setIds] = useState(() => new Set());
    const has = useCallback((id) => ids.has(id), [ids]);
    const toggle = useCallback((id) => {
        setIds((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    }, []);
    const add = useCallback((id) => {
        setIds((prev) => {
            if (prev.has(id))
                return prev;
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);
    const setAll = useCallback((all) => {
        setIds(new Set(all));
    }, []);
    const clear = useCallback(() => setIds(new Set()), []);
    const enter = useCallback((id) => {
        setActive(true);
        if (id) {
            setIds((prev) => {
                if (prev.has(id))
                    return prev;
                const next = new Set(prev);
                next.add(id);
                return next;
            });
        }
    }, []);
    const exit = useCallback(() => {
        setActive(false);
        setIds(new Set());
    }, []);
    return useMemo(() => ({ active, ids, count: ids.size, has, toggle, add, setAll, clear, enter, exit }), [active, ids, has, toggle, add, setAll, clear, enter, exit]);
}
