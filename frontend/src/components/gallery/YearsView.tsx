import { useBuckets } from '../../hooks/useBuckets';

type Props = {
  type: 'all' | 'image' | 'video';
  onPick: (year: number) => void;
};

export function YearsView({ type, onPick }: Props) {
  const { buckets, isLoading, isError, error } = useBuckets({ granularity: 'year', type });

  if (isLoading) return <p className="loading">cargando años…</p>;
  if (isError) return <p className="err">error: {(error as Error)?.message ?? 'desconocido'}</p>;
  if (buckets.length === 0) return <p className="hint">sin elementos todavía.</p>;

  return (
    <div className="years-grid">
      {buckets.map((b) => {
        const year = Number(b.bucket);
        return (
          <button
            type="button"
            key={b.bucket}
            className="year-tile"
            onClick={() => onPick(year)}
            aria-label={`${year}: ${b.count} elementos`}
          >
            {b.cover_id ? (
              <img
                src={`/api/media/${b.cover_id}/thumbnail`}
                alt=""
                className="year-tile__img"
                loading="lazy"
                draggable={false}
              />
            ) : (
              <div className="year-tile__img year-tile__placeholder" aria-hidden="true">◌</div>
            )}
            <div className="year-tile__overlay" />
            <div className="year-tile__meta">
              <span className="year-tile__year">{year}</span>
              <span className="year-tile__count">{b.count.toLocaleString('es-MX')} elementos</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
