import { useCallback, useRef } from 'react';
/**
 * Long-press detector for pointers (mouse + touch + pen). Cancels if the pointer
 * moves more than `moveTolerance` pixels before the delay expires.
 */
export function useLongPress({ delay = 380, onLongPress, moveTolerance = 8 }) {
    const timerRef = useRef(null);
    const startRef = useRef(null);
    const firedRef = useRef(false);
    const clear = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        startRef.current = null;
    }, []);
    const onPointerDown = useCallback((e) => {
        if (e.pointerType === 'mouse' && e.button !== 0)
            return;
        firedRef.current = false;
        startRef.current = { x: e.clientX, y: e.clientY };
        timerRef.current = window.setTimeout(() => {
            firedRef.current = true;
            onLongPress();
        }, delay);
    }, [delay, onLongPress]);
    const onPointerMove = useCallback((e) => {
        if (!startRef.current)
            return;
        const dx = e.clientX - startRef.current.x;
        const dy = e.clientY - startRef.current.y;
        if (Math.hypot(dx, dy) > moveTolerance)
            clear();
    }, [clear, moveTolerance]);
    const onPointerUp = useCallback(() => clear(), [clear]);
    const onPointerCancel = useCallback(() => clear(), [clear]);
    const didFire = useCallback(() => firedRef.current, []);
    return { handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }, didFire };
}
