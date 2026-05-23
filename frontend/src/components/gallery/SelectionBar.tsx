type Action = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger';
  busyLabel?: string;
};

type Props = {
  count: number;
  total: number;
  allSelected: boolean;
  selectingAll?: boolean;
  onCancel: () => void;
  onSelectAll: () => void;
  primary: Action;
  busy?: boolean;
};

export function SelectionBar({ count, total, allSelected, selectingAll, onCancel, onSelectAll, primary, busy }: Props) {
  const variant = primary.variant ?? 'danger';
  const selectAllLabel = selectingAll
    ? 'cargando…'
    : allSelected
      ? 'ninguno'
      : `todo (${total})`;
  return (
    <>
      <div className="selection-top" role="toolbar" aria-label="Selección">
        <button type="button" className="chip" onClick={onCancel} disabled={busy || selectingAll}>cancelar</button>
        <span className="selection-top__count" aria-live="polite">
          {count > 0 ? `${count.toLocaleString('es-MX')} seleccionada${count === 1 ? '' : 's'}` : 'selecciona elementos'}
        </span>
        <button
          type="button"
          className="chip"
          onClick={onSelectAll}
          disabled={busy || selectingAll || total === 0}
        >
          {selectAllLabel}
        </button>
      </div>
      <div className="selection-bottom" role="toolbar" aria-label="Acciones de selección">
        <button
          type="button"
          className={`selection-bottom__btn ${variant}`}
          onClick={primary.onClick}
          disabled={busy || selectingAll || count === 0}
        >
          {busy ? (primary.busyLabel ?? 'procesando…') : `${primary.label}${count > 0 ? ` (${count.toLocaleString('es-MX')})` : ''}`}
        </button>
      </div>
    </>
  );
}
