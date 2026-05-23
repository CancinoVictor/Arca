import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Media } from '../api/media';
import { useLongPress } from '../hooks/useLongPress';
import { Icon } from './Icon';

type SortDir = 'desc' | 'asc';
export type GridSize = 'l' | 'm' | 's';

type Props = {
  items: Media[];
  sort: SortDir;
  grid: GridSize;

  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;

  /** Tap on a photo when NOT in selection mode (opens lightbox, etc.) */
  onOpen: (index: number) => void;

  /** Long-press a photo. Receives id so caller can enter selection mode with that id. */
  onLongPressItem?: (id: string) => void;

  /** When true, taps toggle selection instead of opening. */
  selectionMode?: boolean;

  /** Returns whether a given id is currently selected. */
  isSelected?: (id: string) => boolean;

  /** Called when a photo is tapped while in selection mode (or after long-press). */
  onToggleSelect?: (id: string) => void;

  /** Optional callback when the sticky month label changes during scroll. */
  onMonthChange?: (label: string) => void;
};

export type PhotoGridHandle = {
  scrollToMonth: (monthKey: string) => void;
};

type Row =
  | { type: 'header'; key: string; monthKey: string; label: string }
  | { type: 'grid'; key: string; monthKey: string; indices: number[]; media: Media[] };

const GAP = 3;
const HEADER_H = 66;

function mediaDate(m: Media): Date {
  return new Date(m.capture_date ?? m.created_at);
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map((x) => Number(x));
  const d = new Date(y, (m ?? 1) - 1, 1);
  const fmt = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
  return fmt.format(d);
}

function baseCols(width: number): number {
  if (width < 360) return 3;
  if (width < 480) return 4;
  if (width < 720) return 5;
  if (width < 980) return 6;
  if (width < 1220) return 7;
  return 8;
}

function adjustCols(cols: number, grid: GridSize) {
  if (grid === 'l') return Math.max(2, cols - 2);
  if (grid === 's') return Math.min(10, cols + 1);
  return cols;
}

export const PhotoGrid = forwardRef<PhotoGridHandle, Props>(function PhotoGrid(
  {
    items,
    sort,
    grid,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    onOpen,
    onLongPressItem,
    selectionMode,
    isSelected,
    onToggleSelect,
    onMonthChange,
  },
  ref,
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    if (!parentRef.current) return;
    const el = parentRef.current;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = adjustCols(baseCols(containerWidth || 1024), grid);
  const cellSize = containerWidth > 0
    ? Math.floor((containerWidth - GAP * (cols - 1)) / cols)
    : 120;

  const rows = useMemo(() => {
    const out: Row[] = [];
    let currentMonth: string | null = null;
    let bufferIndices: number[] = [];
    let bufferMedia: Media[] = [];
    let rowCountInMonth = 0;

    const flushBuffer = () => {
      if (!currentMonth || bufferMedia.length === 0) return;
      out.push({
        type: 'grid',
        key: `g:${currentMonth}:${rowCountInMonth}`,
        monthKey: currentMonth,
        indices: bufferIndices,
        media: bufferMedia,
      });
      rowCountInMonth++;
      bufferIndices = [];
      bufferMedia = [];
    };

    for (let i = 0; i < items.length; i++) {
      const m = items[i];
      const mk = monthKey(mediaDate(m));
      if (mk !== currentMonth) {
        flushBuffer();
        currentMonth = mk;
        rowCountInMonth = 0;
        out.push({ type: 'header', key: `h:${mk}`, monthKey: mk, label: monthLabel(mk) });
      }
      bufferIndices.push(i);
      bufferMedia.push(m);
      if (bufferMedia.length === cols) flushBuffer();
    }
    flushBuffer();
    return out;
  }, [items, cols]);

  const monthByRowIndex = useMemo(() => rows.map((r) => r.monthKey), [rows]);

  const monthHeaderIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.type === 'header') map.set(r.monthKey, i);
    }
    return map;
  }, [rows]);

  const virt = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (idx) => (rows[idx]?.type === 'header' ? HEADER_H : cellSize + GAP),
    overscan: 8,
    getItemKey: (idx) => rows[idx]?.key ?? String(idx),
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToMonth: (mk: string) => {
        const idx = monthHeaderIndex.get(mk);
        if (idx === undefined) return;
        virt.scrollToIndex(idx, { align: 'start' });
      },
    }),
    [monthHeaderIndex, virt],
  );

  const virtualItems = virt.getVirtualItems();
  const lastVisibleIndex = virtualItems.at(-1)?.index;
  const firstVisibleIndex = virtualItems[0]?.index;

  useEffect(() => {
    if (lastVisibleIndex === undefined) return;
    // Cargar siguiente página solo cuando estemos a 3 filas del final, y nunca con fetch ya en curso.
    if (lastVisibleIndex >= rows.length - 3 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [lastVisibleIndex, rows.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const lastMonthLabelRef = useRef<string>('');
  const [stickyLabel, setStickyLabel] = useState<string>('');

  useEffect(() => {
    if (firstVisibleIndex === undefined) return;
    const mk = monthByRowIndex[firstVisibleIndex];
    if (!mk) return;
    const label = monthLabel(mk);
    if (label === lastMonthLabelRef.current) return;
    lastMonthLabelRef.current = label;
    setStickyLabel(label);
    onMonthChange?.(label);
  }, [firstVisibleIndex, monthByRowIndex, onMonthChange]);

  // Scrubber state
  const [scrubbing, setScrubbing] = useState(false);
  const [scrollState, setScrollState] = useState({ top: 0, height: 0, viewport: 0 });
  const scrubberRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const update = () =>
      setScrollState({ top: el.scrollTop, height: el.scrollHeight, viewport: el.clientHeight });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  const scrollable = Math.max(0, scrollState.height - scrollState.viewport);
  const trackHeight = scrollState.viewport;
  const thumbHeight = Math.max(36, Math.min(96, trackHeight * (scrollState.viewport / Math.max(scrollState.height, 1))));
  const thumbTop = scrollable > 0
    ? (scrollState.top / scrollable) * (trackHeight - thumbHeight)
    : 0;

  const scrubFromClient = useCallback((clientY: number) => {
    const el = parentRef.current;
    const trackEl = scrubberRef.current;
    if (!el || !trackEl || scrollable <= 0) return;
    const rect = trackEl.getBoundingClientRect();
    const rel = clientY - rect.top - thumbHeight / 2;
    const ratio = Math.max(0, Math.min(1, rel / (rect.height - thumbHeight)));
    el.scrollTop = ratio * scrollable;
  }, [scrollable, thumbHeight]);

  const onScrubPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setScrubbing(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    scrubFromClient(e.clientY);
  }, [scrubFromClient]);

  const onScrubPointerMove = useCallback((e: React.PointerEvent) => {
    if (!scrubbing) return;
    scrubFromClient(e.clientY);
  }, [scrubbing, scrubFromClient]);

  const stopScrub = useCallback(() => setScrubbing(false), []);

  // hide scrubber until there is meaningful scrollable content
  const showScrubber = items.length > 0 && scrollable > 80;

  return (
    <div ref={parentRef} className="photo-grid-scroll" data-sort={sort}>
      <div className="photo-grid-inner" style={{ height: virt.getTotalSize() }}>
        {virt.getVirtualItems().map((vi) => {
          const r = rows[vi.index];
          if (!r) return null;

          if (r.type === 'header') {
            return (
              <div
                key={r.key}
                className="month-header"
                style={{ transform: `translateY(${vi.start}px)`, height: HEADER_H }}
              >
                <span className="month-header__text">{r.label}</span>
              </div>
            );
          }

          return (
            <div
              key={r.key}
              className="grid-row"
              style={{ transform: `translateY(${vi.start}px)`, height: cellSize + GAP }}
            >
              <div
                className="grid-row__inner"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP }}
              >
                {Array.from({ length: cols }).map((_, col) => {
                  const idx = r.indices[col];
                  const m = r.media[col];
                  if (idx === undefined || !m) return <div key={col} />;
                  return (
                    <PhotoCell
                      key={m.id}
                      media={m}
                      size={cellSize}
                      selectionMode={!!selectionMode}
                      selected={isSelected?.(m.id) ?? false}
                      onOpen={() => onOpen(idx)}
                      onToggleSelect={() => onToggleSelect?.(m.id)}
                      onLongPress={() => onLongPressItem?.(m.id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {stickyLabel && (
        <div className={`sticky-month${scrubbing ? ' is-scrubbing' : ''}`} aria-hidden="true">
          {stickyLabel}
        </div>
      )}
      {showScrubber && (
        <div
          ref={scrubberRef}
          className={`scrubber${scrubbing ? ' active' : ''}`}
          onPointerDown={onScrubPointerDown}
          onPointerMove={onScrubPointerMove}
          onPointerUp={stopScrub}
          onPointerCancel={stopScrub}
        >
          <div
            className="scrubber__thumb"
            style={{ height: thumbHeight, transform: `translateY(${thumbTop}px)` }}
          />
        </div>
      )}
      {isFetchingNextPage && <div className="grid-loading">cargando más…</div>}
      {!hasNextPage && !isFetchingNextPage && items.length > 12 && (
        <div className="grid-loading">fin de la biblioteca · {items.length.toLocaleString('es-MX')} elementos</div>
      )}
    </div>
  );
});

type PhotoCellProps = {
  media: Media;
  size: number;
  selectionMode: boolean;
  selected: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onLongPress: () => void;
};

function PhotoCell({ media, size, selectionMode, selected, onOpen, onToggleSelect, onLongPress }: PhotoCellProps) {
  const { handlers, didFire } = useLongPress({
    onLongPress,
    delay: 360,
  });

  const onClick = useCallback(() => {
    if (didFire()) return; // long-press ya disparó
    if (selectionMode) onToggleSelect();
    else onOpen();
  }, [didFire, onOpen, onToggleSelect, selectionMode]);

  return (
    <button
      type="button"
      className={`photo-cell${selected ? ' is-selected' : ''}${selectionMode ? ' selecting' : ''}`}
      aria-label={media.file_type === 'video' ? 'Video' : 'Foto'}
      aria-pressed={selectionMode ? selected : undefined}
      onClick={onClick}
      {...handlers}
      style={{ width: size, height: size }}
    >
      <Thumb media={media} size={size} />
      {selectionMode && (
        <span className={`select-mark${selected ? ' on' : ''}`} aria-hidden="true">
          {selected && <Icon name="check" size={14} strokeWidth={3} />}
        </span>
      )}
    </button>
  );
}

function Thumb({ media, size }: { media: Media; size: number }) {
  const [errored, setErrored] = useState(false);
  const hasThumb = !!media.thumbnail_path && !errored;
  const isVideo = media.file_type === 'video';

  return (
    <div className="thumb">
      {hasThumb ? (
        <img
          src={`/api/media/${media.id}/thumbnail`}
          alt=""
          loading="lazy"
          width={size}
          height={size}
          draggable={false}
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="thumb-placeholder">
          <Icon name={isVideo ? 'play' : 'photo'} size={20} />
        </div>
      )}
      {isVideo && hasThumb && (
        <span className="thumb-badge">
          <Icon name="play" size={9} strokeWidth={2.4} /> video
        </span>
      )}
    </div>
  );
}
