import { useMemo } from 'react';
import { useBuckets } from '../../hooks/useBuckets';

type Props = {
  type: 'all' | 'image' | 'video';
  /** Optional year filter; when set, only months from that year are shown. */
  year?: number;
  onPick: (year: number, month: number) => void;
};

function monthName(month: number): string {
  const fmt = new Intl.DateTimeFormat('es-MX', { month: 'long' });
  return fmt.format(new Date(2000, month - 1, 1));
}

export function MonthsView({ type, year, onPick }: Props) {
  const { buckets, isLoading, isError, error } = useBuckets({ granularity: 'month', type });

  const grouped = useMemo(() => {
    const byYear = new Map<number, typeof buckets>();
    for (const b of buckets) {
      const [y, m] = b.bucket.split('-').map(Number);
      if (year && y !== year) continue;
      const arr = byYear.get(y) ?? [];
      arr.push(b);
      byYear.set(y, arr);
      void m;
    }
    return Array.from(byYear.entries()).sort((a, b) => b[0] - a[0]);
  }, [buckets, year]);

  if (isLoading) return <p className="loading">cargando meses…</p>;
  if (isError) return <p className="err">error: {(error as Error)?.message ?? 'desconocido'}</p>;
  if (grouped.length === 0) return <p className="hint">sin elementos todavía.</p>;

  return (
    <div className="months-stack">
      {grouped.map(([y, months]) => (
        <section key={y} className="months-section">
          <h2 className="months-section__title">{y}</h2>
          <div className="months-grid">
            {months.map((b) => {
              const [, mm] = b.bucket.split('-').map(Number);
              return (
                <button
                  type="button"
                  key={b.bucket}
                  className="month-tile"
                  onClick={() => onPick(y, mm)}
                  aria-label={`${monthName(mm)} ${y}: ${b.count} elementos`}
                >
                  {b.cover_id ? (
                    <img
                      src={`/api/media/${b.cover_id}/thumbnail`}
                      alt=""
                      loading="lazy"
                      className="month-tile__img"
                      draggable={false}
                    />
                  ) : (
                    <div className="month-tile__img month-tile__placeholder" aria-hidden="true">◌</div>
                  )}
                  <div className="month-tile__overlay" />
                  <div className="month-tile__meta">
                    <span className="month-tile__name">{monthName(mm)}</span>
                    <span className="month-tile__count">{b.count.toLocaleString('es-MX')}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
