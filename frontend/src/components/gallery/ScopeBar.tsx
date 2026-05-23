export type GalleryScope = 'years' | 'months' | 'all';

type Props = {
  value: GalleryScope;
  onChange: (next: GalleryScope) => void;
};

const SCOPES: { id: GalleryScope; label: string }[] = [
  { id: 'years', label: 'años' },
  { id: 'months', label: 'meses' },
  { id: 'all', label: 'todas' },
];

export function ScopeBar({ value, onChange }: Props) {
  return (
    <div className="scope-bar" role="tablist" aria-label="Vistas de biblioteca">
      {SCOPES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={value === s.id}
          className={value === s.id ? 'scope-bar__btn active' : 'scope-bar__btn'}
          onClick={() => onChange(s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
