import { useCallback, useMemo, useState } from 'react';

export type SelectionApi = {
  active: boolean;
  ids: Set<string>;
  count: number;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  add: (id: string) => void;
  setAll: (ids: string[]) => void;
  clear: () => void;
  enter: (id?: string) => void;
  exit: () => void;
};

export function useSelection(): SelectionApi {
  const [active, setActive] = useState(false);
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  const has = useCallback((id: string) => ids.has(id), [ids]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const add = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const setAll = useCallback((all: string[]) => {
    setIds(new Set(all));
  }, []);

  const clear = useCallback(() => setIds(new Set()), []);

  const enter = useCallback((id?: string) => {
    setActive(true);
    if (id) {
      setIds((prev) => {
        if (prev.has(id)) return prev;
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

  return useMemo(
    () => ({ active, ids, count: ids.size, has, toggle, add, setAll, clear, enter, exit }),
    [active, ids, has, toggle, add, setAll, clear, enter, exit],
  );
}
