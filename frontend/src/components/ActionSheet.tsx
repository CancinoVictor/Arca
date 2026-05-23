import { useEffect } from 'react';
import { Icon } from './Icon';

export type ActionSheetOption = {
  label: string;
  onSelect: () => void;
  variant?: 'default' | 'danger' | 'bold';
  selected?: boolean;
};

type Props = {
  title?: string;
  options: ActionSheetOption[];
  cancelLabel?: string;
  onCancel: () => void;
};

export function ActionSheet({ title, options, cancelLabel = 'cancelar', onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onCancel]);

  return (
    <>
      <div className="sheet-scrim" onClick={onCancel} aria-hidden="true" />
      <div className="action-sheet" role="dialog" aria-modal="true">
        <div className="action-sheet__group">
          {title && <div className="action-sheet__title">{title}</div>}
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className={`action-sheet__btn${opt.variant === 'danger' ? ' danger' : ''}${opt.variant === 'bold' ? ' bold' : ''}`}
              onClick={() => {
                opt.onSelect();
              }}
            >
              {opt.selected ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="check" size={18} strokeWidth={2.4} />
                  {opt.label}
                </span>
              ) : (
                opt.label
              )}
            </button>
          ))}
        </div>
        <button type="button" className="action-sheet__cancel" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </>
  );
}
