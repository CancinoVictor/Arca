import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGallery } from '../hooks/useGallery';
import { useBuckets } from '../hooks/useBuckets';
import { useSelection } from '../hooks/useSelection';
import { useDeleteMedia } from '../hooks/useMediaMutations';
import { PhotoGrid, type GridSize, type PhotoGridHandle } from '../components/PhotoGrid';
import { Lightbox } from '../components/Lightbox';
import { ScopeBar, type GalleryScope } from '../components/gallery/ScopeBar';
import { YearsView } from '../components/gallery/YearsView';
import { MonthsView } from '../components/gallery/MonthsView';
import { SelectionBar } from '../components/gallery/SelectionBar';
import { ActionSheet } from '../components/ActionSheet';
import { Icon } from '../components/Icon';

type MediaTypeFilter = 'all' | 'image' | 'video';
type SortDir = 'desc' | 'asc';

function monthName(month: number): string {
  return new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(2000, month - 1, 1));
}

export function Gallery() {
  const [scope, setScope] = useState<GalleryScope>('all');
  const [type, setType] = useState<MediaTypeFilter>('all');
  const [sort, setSort] = useState<SortDir>('desc');
  const [grid, setGrid] = useState<GridSize>('m');
  const [year, setYear] = useState<number | undefined>(undefined);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [sortSheet, setSortSheet] = useState(false);
  const [typeSheet, setTypeSheet] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [pendingSelectAll, setPendingSelectAll] = useState(false);

  const selection = useSelection();
  const deleteMut = useDeleteMedia();

  const { items, hasNextPage, isFetchingNextPage, fetchNextPage, isLoading, isError, error } =
    useGallery({ type, sort, year, month });

  // Conteo real de la biblioteca (estable, independiente de la paginación cargada).
  const { total } = useBuckets({ granularity: 'year', type });

  const gridRef = useRef<PhotoGridHandle | null>(null);

  useEffect(() => {
    setActiveIdx(null);
  }, [type, sort, year, month, scope]);

  const filterLabel = useMemo(() => {
    if (year && month) return `${monthName(month)} ${year}`;
    if (year) return `${year}`;
    return null;
  }, [year, month]);

  const clearDateFilter = () => {
    setYear(undefined);
    setMonth(undefined);
  };

  const goToMonth = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
    setScope('all');
  };

  const goToYear = (y: number) => {
    setYear(y);
    setMonth(undefined);
    setScope('months');
  };

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  // Si tenemos el total real, "todos seleccionados" significa cubrir el total;
  // de lo contrario, los items cargados.
  const effectiveTotal = total > 0 ? total : allIds.length;
  const allSelected = selection.count > 0 && selection.count >= effectiveTotal;

  const performDelete = async () => {
    if (selection.count === 0) return;
    const ids = Array.from(selection.ids);
    await deleteMut.mutateAsync(ids);
    selection.exit();
  };

  const performSelectAll = async () => {
    if (allSelected) {
      selection.clear();
      return;
    }
    if (!hasNextPage) {
      selection.setAll(allIds);
      return;
    }
    // Precargar todas las páginas; al terminar, el effect de abajo aplicará setAll.
    setPendingSelectAll(true);
    setSelectingAll(true);
    try {
      while (true) {
        const r = await fetchNextPage();
        const last = r.data?.pages.at(-1);
        if (!last?.next_cursor) break;
      }
    } finally {
      setSelectingAll(false);
    }
  };

  useEffect(() => {
    if (!pendingSelectAll || selectingAll) return;
    selection.setAll(items.map((i) => i.id));
    setPendingSelectAll(false);
  }, [pendingSelectAll, selectingAll, items, selection]);

  const performDeleteOne = async (id: string) => {
    await deleteMut.mutateAsync([id]);
    setActiveIdx(null);
  };

  if (isLoading && scope === 'all') return <p className="loading">cargando biblioteca…</p>;
  if (isError && scope === 'all') return <p className="err">error: {(error as Error).message}</p>;

  const noFiltersActive = type === 'all' && !year && !month;
  if (scope === 'all' && items.length === 0 && noFiltersActive) {
    return (
      <section className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">biblioteca</h1>
            <p className="page-subtitle">tu colección está vacía por ahora</p>
          </div>
        </header>

        <section className="empty">
          <div className="empty__icon" aria-hidden="true"><Icon name="library" size={28} /></div>
          <h2>biblioteca vacía</h2>
          <p className="hint">sube tus primeras fotos o videos para empezar.</p>
          <Link to="/upload" className="cta">subir mi primera foto</Link>
        </section>
      </section>
    );
  }

  const typeLabel = type === 'all' ? 'todo' : type === 'image' ? 'fotos' : 'videos';
  const sortLabel = sort === 'desc' ? 'más reciente' : 'más antigua';

  return (
    <section className="page gallery-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">biblioteca</h1>
          <p className="page-subtitle">
            {filterLabel ? (
              <>
                {filterLabel} ·{' '}
                <button type="button" className="linkish" onClick={clearDateFilter}>quitar filtro</button>
              </>
            ) : scope === 'all' ? (
              total > 0 ? `${total.toLocaleString('es-MX')} elementos` : 'biblioteca'
            ) : (
              'explora por fecha'
            )}
          </p>
        </div>
      </header>

      <div className="gallery-controls">
        <ScopeBar value={scope} onChange={setScope} />
        <div className="gallery-controls__right">
          <button
            type="button"
            className="chip"
            onClick={() => setTypeSheet(true)}
            aria-haspopup="dialog"
          >
            {type === 'image' && <Icon name="photo" size={14} />}
            {type === 'video' && <Icon name="video" size={14} />}
            {typeLabel}
            <Icon name="chevron-down" size={12} />
          </button>

          {scope === 'all' && (
            <>
              <button
                type="button"
                className="chip"
                onClick={() => setSortSheet(true)}
                aria-haspopup="dialog"
                aria-label={`Orden: ${sortLabel}`}
              >
                <Icon name="sort" size={14} />
                {sortLabel}
                <Icon name="chevron-down" size={12} />
              </button>

              <div className="segmented" role="group" aria-label="Tamaño">
                <button
                  type="button"
                  className={grid === 'l' ? 'segmented__btn active' : 'segmented__btn'}
                  onClick={() => setGrid('l')}
                  aria-label="Grandes"
                >
                  <Icon name="grid-large" size={16} />
                </button>
                <button
                  type="button"
                  className={grid === 'm' ? 'segmented__btn active' : 'segmented__btn'}
                  onClick={() => setGrid('m')}
                  aria-label="Medianas"
                >
                  <Icon name="grid-medium" size={16} />
                </button>
                <button
                  type="button"
                  className={grid === 's' ? 'segmented__btn active' : 'segmented__btn'}
                  onClick={() => setGrid('s')}
                  aria-label="Pequeñas"
                >
                  <Icon name="grid-small" size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {scope === 'years' && <YearsView type={type} onPick={goToYear} />}
      {scope === 'months' && <MonthsView type={type} year={year} onPick={goToMonth} />}

      {scope === 'all' && (
        <section className="gallery">
          {items.length === 0 ? (
            <div className="filter-empty">
              <p className="hint">no hay {type === 'video' ? 'videos' : type === 'image' ? 'fotos' : 'elementos'} en este filtro.</p>
              <div className="filter-empty__actions">
                {type !== 'all' && (
                  <button type="button" className="chip" onClick={() => setType('all')}>ver todo</button>
                )}
                {(year || month) && (
                  <button type="button" className="chip" onClick={clearDateFilter}>quitar fechas</button>
                )}
              </div>
            </div>
          ) : (
            <PhotoGrid
              ref={gridRef}
              items={items}
              sort={sort}
              grid={grid}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={() => { fetchNextPage(); }}
              selectionMode={selection.active}
              isSelected={(id) => selection.has(id)}
              onToggleSelect={(id) => selection.toggle(id)}
              onLongPressItem={(id) => selection.enter(id)}
              onOpen={setActiveIdx}
            />
          )}

          {activeIdx !== null && items[activeIdx] && (
            <Lightbox
              media={items[activeIdx]}
              onClose={() => setActiveIdx(null)}
              onPrev={activeIdx > 0 ? () => setActiveIdx(activeIdx - 1) : undefined}
              onNext={activeIdx < items.length - 1 ? () => setActiveIdx(activeIdx + 1) : undefined}
              onDelete={() => performDeleteOne(items[activeIdx].id)}
            />
          )}
        </section>
      )}

      {selection.active && (
        <SelectionBar
          count={selection.count}
          total={effectiveTotal}
          allSelected={allSelected}
          selectingAll={selectingAll}
          onCancel={selection.exit}
          onSelectAll={performSelectAll}
          primary={{ label: 'borrar', busyLabel: 'borrando…', variant: 'danger', onClick: performDelete }}
          busy={deleteMut.isPending}
        />
      )}

      {sortSheet && (
        <ActionSheet
          title="ordenar por"
          onCancel={() => setSortSheet(false)}
          options={[
            {
              label: 'más reciente primero',
              selected: sort === 'desc',
              onSelect: () => { setSort('desc'); setSortSheet(false); },
            },
            {
              label: 'más antigua primero',
              selected: sort === 'asc',
              onSelect: () => { setSort('asc'); setSortSheet(false); },
            },
          ]}
        />
      )}

      {typeSheet && (
        <ActionSheet
          title="mostrar"
          onCancel={() => setTypeSheet(false)}
          options={[
            {
              label: 'todo',
              selected: type === 'all',
              onSelect: () => { setType('all'); setTypeSheet(false); },
            },
            {
              label: 'solo fotos',
              selected: type === 'image',
              onSelect: () => { setType('image'); setTypeSheet(false); },
            },
            {
              label: 'solo videos',
              selected: type === 'video',
              onSelect: () => { setType('video'); setTypeSheet(false); },
            },
          ]}
        />
      )}
    </section>
  );
}
