import { useCallback, useEffect, useRef, useState } from 'react';
import type { Media } from '../api/media';
import { Icon } from './Icon';

type Props = {
  media: Media;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
};

const SWIPE_THRESHOLD = 70;

function formatPhotoDate(iso: string | null, fallbackIso: string): { day: string; time: string } {
  const d = new Date(iso ?? fallbackIso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  const sameYear = d.getFullYear() === now.getFullYear();

  let day: string;
  if (sameDay) day = 'hoy';
  else if (isYesterday) day = 'ayer';
  else if (sameYear) {
    day = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'long' }).format(d);
  } else {
    day = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }
  const time = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' }).format(d);
  return { day, time };
}

export function Lightbox({ media, onClose, onPrev, onNext, onDelete, onRestore }: Props) {
  const [confirming, setConfirming] = useState(false);
  const startRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && onPrev) onPrev();
      else if (e.key === 'ArrowRight' && onNext) onNext();
      else if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) setConfirming(true);
    }
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext, onDelete]);

  // Reset confirm state when navigating to another item.
  useEffect(() => {
    setConfirming(false);
  }, [media.id]);

  const isVideo = media.file_type === 'video';
  const src = `/api/media/${media.id}/file`;
  const { day, time } = formatPhotoDate(media.capture_date, media.created_at);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    setDrag({ dx, dy });
  }, []);

  const onPointerUp = useCallback(() => {
    const d = drag;
    setDrag(null);
    startRef.current = null;
    if (!d) return;
    const absX = Math.abs(d.dx);
    const absY = Math.abs(d.dy);
    if (absX > absY && absX > SWIPE_THRESHOLD) {
      if (d.dx < 0 && onNext) onNext();
      else if (d.dx > 0 && onPrev) onPrev();
    } else if (absY > absX && d.dy > SWIPE_THRESHOLD) {
      onClose();
    }
  }, [drag, onClose, onNext, onPrev]);

  const transform = drag
    ? `translate3d(${drag.dx}px, ${Math.max(0, drag.dy)}px, 0)`
    : undefined;
  const fadeBg = drag ? Math.max(0.55, 1 - Math.min(Math.abs(drag.dy), 240) / 480) : 1;

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ background: `rgba(0,0,0,${0.92 * fadeBg})` }}
    >
      <div className="lightbox-top" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} aria-label="cerrar" type="button">
          <Icon name="close" size={20} />
        </button>
        <div className="lightbox-meta">
          <span className="lightbox-meta__day">{day}</span>
          <span className="lightbox-meta__time">{time}{isVideo ? ' · video' : ''}</span>
        </div>
        <div className="lightbox-actions">
          <a className="lightbox-action" href={src} download aria-label="descargar">
            <Icon name="download" size={18} />
          </a>
          {onRestore && (
            <button
              className="lightbox-action"
              type="button"
              onClick={onRestore}
              aria-label="restaurar"
              title="restaurar"
            >
              <Icon name="restore" size={18} />
            </button>
          )}
          {onDelete && (
            <button
              className="lightbox-action danger"
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="borrar"
            >
              <Icon name="trash" size={18} />
            </button>
          )}
        </div>
      </div>

      {onPrev && (
        <button
          className="lightbox-nav prev"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="anterior"
          type="button"
        >
          <Icon name="chevron-left" size={22} />
        </button>
      )}
      {onNext && (
        <button
          className="lightbox-nav next"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="siguiente"
          type="button"
        >
          <Icon name="chevron-right" size={22} />
        </button>
      )}

      <div
        className="lightbox-stage"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform, transition: drag ? 'none' : 'transform 220ms ease' }}
      >
        {isVideo ? (
          <video src={src} controls autoPlay className="lightbox-media" />
        ) : (
          <img src={src} alt="" className="lightbox-media" draggable={false} />
        )}
      </div>

      {confirming && (
        <div className="confirm-sheet" onClick={(e) => e.stopPropagation()}>
          <p className="confirm-sheet__text">¿mover a la papelera?</p>
          <div className="confirm-sheet__actions">
            <button type="button" className="chip" onClick={() => setConfirming(false)}>cancelar</button>
            <button
              type="button"
              className="chip danger"
              onClick={() => {
                setConfirming(false);
                onDelete?.();
              }}
            >mover a papelera</button>
          </div>
        </div>
      )}
    </div>
  );
}
