import { useMemo, useState } from 'react';
import { useTrash } from '../hooks/useTrash';
import { useSelection } from '../hooks/useSelection';
import { useEmptyTrash, useRestoreMedia } from '../hooks/useMediaMutations';
import { PhotoGrid } from '../components/PhotoGrid';
import { Lightbox } from '../components/Lightbox';
import { SelectionBar } from '../components/gallery/SelectionBar';
import { Icon } from '../components/Icon';
import { ActionSheet } from '../components/ActionSheet';

const RETENTION_DAYS = 30;

function daysLeft(deletedAt: string | null): number {
  if (!deletedAt) return RETENTION_DAYS;
  const d = new Date(deletedAt).getTime();
  const ms = d + RETENTION_DAYS * 24 * 3600 * 1000 - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 3600 * 1000)));
}

export function Trash() {
  const { items, hasNextPage, isFetchingNextPage, fetchNextPage, isLoading, isError, error } = useTrash();
  const selection = useSelection();
  const restoreMut = useRestoreMedia();
  const emptyMut = useEmptyTrash();

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const allSelected = selection.count > 0 && selection.count === allIds.length;

  const performRestore = async () => {
    if (selection.count === 0) return;
    await restoreMut.mutateAsync(Array.from(selection.ids));
    selection.exit();
  };

  const performRestoreOne = async (id: string) => {
    await restoreMut.mutateAsync([id]);
    setActiveIdx(null);
  };

  const performEmpty = async () => {
    setConfirmEmpty(false);
    await emptyMut.mutateAsync();
    selection.exit();
  };

  const nextSoonest = items.length > 0 ? daysLeft(items[items.length - 1].deleted_at) : RETENTION_DAYS;

  if (isLoading) return <p className="loading">cargando papelera…</p>;
  if (isError) return <p className="err">error: {(error as Error).message}</p>;

  return (
    <section className="page gallery-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">papelera</h1>
          <p className="page-subtitle">
            {items.length === 0
              ? 'la papelera está vacía'
              : `${items.length.toLocaleString('es-MX')} elementos · se borran en hasta ${nextSoonest} día${nextSoonest === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="page-actions">
          {items.length > 0 && (
            <button type="button" className="btn danger" onClick={() => setConfirmEmpty(true)}>
              vaciar
            </button>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <section className="empty">
          <div className="empty__icon" aria-hidden="true"><Icon name="trash" size={26} /></div>
          <h2>todo limpio</h2>
          <p className="hint">aquí aparecerán las fotos que muevas a la papelera.</p>
        </section>
      ) : (
        <section className="gallery">
          <PhotoGrid
            items={items}
            sort="desc"
            grid="m"
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={() => { fetchNextPage(); }}
            selectionMode={selection.active}
            isSelected={(id) => selection.has(id)}
            onToggleSelect={(id) => selection.toggle(id)}
            onLongPressItem={(id) => selection.enter(id)}
            onOpen={setActiveIdx}
          />

          {activeIdx !== null && items[activeIdx] && (
            <Lightbox
              media={items[activeIdx]}
              onClose={() => setActiveIdx(null)}
              onPrev={activeIdx > 0 ? () => setActiveIdx(activeIdx - 1) : undefined}
              onNext={activeIdx < items.length - 1 ? () => setActiveIdx(activeIdx + 1) : undefined}
              onRestore={() => performRestoreOne(items[activeIdx].id)}
            />
          )}
        </section>
      )}

      {selection.active && (
        <SelectionBar
          count={selection.count}
          total={allIds.length}
          allSelected={allSelected}
          onCancel={selection.exit}
          onSelectAll={() => (allSelected ? selection.clear() : selection.setAll(allIds))}
          primary={{ label: 'restaurar', busyLabel: 'restaurando…', variant: 'primary', onClick: performRestore }}
          busy={restoreMut.isPending}
        />
      )}

      {confirmEmpty && (
        <ActionSheet
          title={`se borrarán ${items.length} elemento${items.length === 1 ? '' : 's'} permanentemente`}
          onCancel={() => setConfirmEmpty(false)}
          options={[
            {
              label: emptyMut.isPending ? 'vaciando…' : 'vaciar papelera',
              variant: 'danger',
              onSelect: performEmpty,
            },
          ]}
        />
      )}
    </section>
  );
}
