import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Uppy from '@uppy/core';
import type { UppyFile } from '@uppy/core';
import Tus from '@uppy/tus';

import { mediaApi } from '../api/media';
import { hashFileInWorker } from '../lib/hashPool';
import { Icon } from '../components/Icon';

type Meta = { hash?: string };
type ResponseBody = Record<string, unknown>;

const ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
];

function createUppy(): Uppy<Meta, ResponseBody> {
  const u = new Uppy<Meta, ResponseBody>({
    autoProceed: true,
    allowMultipleUploadBatches: true,
    restrictions: {
      maxFileSize: 50 * 1024 * 1024 * 1024,
      allowedFileTypes: ACCEPT,
    },
  }).use(Tus, {
    endpoint: '/api/media/uploads',
    chunkSize: 5 * 1024 * 1024,
    withCredentials: true,
    retryDelays: [0, 1000, 3000, 5000, 10000],
    removeFingerprintOnSuccess: true,
  });

  u.addPreProcessor(async (fileIds) => {
    const entries = fileIds
      .map((id) => ({ id, file: u.getFile(id) }))
      .filter((e): e is { id: string; file: NonNullable<ReturnType<typeof u.getFile>> } => !!e.file);

    if (entries.length === 0) return;

    for (const e of entries) {
      u.emit('preprocess-progress', e.file, { mode: 'indeterminate', message: 'calculando hash…' });
    }

    let hashes: string[];
    try {
      hashes = await Promise.all(entries.map((e) => hashFileInWorker(e.file.data as Blob)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      u.info({ message: 'error calculando hashes', details: msg }, 'error', 5000);
      for (const e of entries) u.removeFile(e.id);
      return;
    }

    let existsMap = new Map<string, boolean>();
    try {
      const resp = await mediaApi.verifyBatch(hashes);
      existsMap = new Map(resp.results.map((r) => [r.hash, r.exists]));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      u.info({ message: 'no se pudo verificar duplicados', details: msg }, 'error', 5000);
      for (const e of entries) u.removeFile(e.id);
      return;
    }

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const hash = hashes[i];
      if (existsMap.get(hash)) {
        u.removeFile(e.id);
      } else {
        u.setFileMeta(e.id, { hash });
      }
      u.emit('preprocess-complete', e.file);
    }
  });

  return u;
}

type Phase = 'queued' | 'hashing' | 'uploading' | 'done' | 'error' | 'paused';

function phaseFor(f: UppyFile<Meta, ResponseBody>): Phase {
  if (f.error) return 'error';
  if (f.progress?.uploadComplete) return 'done';
  if (f.isPaused) return 'paused';
  if (f.progress?.preprocess) return 'hashing';
  if ((f.progress?.percentage ?? 0) > 0) return 'uploading';
  return 'queued';
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let u = -1;
  let v = n;
  do { v /= 1024; u++; } while (v >= 1024 && u < units.length - 1);
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[u]}`;
}

function FileThumb({ file }: { file: UppyFile<Meta, ResponseBody> }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!(file.data instanceof Blob)) return;
    if (!file.type?.startsWith('image/')) return;
    const u = URL.createObjectURL(file.data);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file.data, file.type, file.id]);

  if (url) return <img src={url} alt="" className="upload-row__thumb" />;
  const isVideo = file.type?.startsWith('video/');
  return (
    <div className="upload-row__thumb upload-row__thumb--placeholder">
      <Icon name={isVideo ? 'video' : 'photo'} size={20} />
    </div>
  );
}

export function Upload() {
  const qc = useQueryClient();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);
  const uppyRef = useRef<Uppy<Meta, ResponseBody> | null>(null);
  const [, setTick] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!uppyRef.current) {
    uppyRef.current = createUppy();
  }
  const uppy = uppyRef.current;

  useEffect(() => {
    const rerender = () => setTick((t) => t + 1);
    uppy.on('state-update', rerender);
    uppy.on('upload-success', () => {
      setDoneCount((n) => n + 1);
      qc.invalidateQueries({ queryKey: ['media'] });
    });
    uppy.on('upload-error', (_file, error) => {
      setErrorMsg(error?.message ?? 'error al subir');
    });
    uppy.on('restriction-failed', (_file, error) => {
      setErrorMsg(error?.message ?? 'archivo no soportado');
    });
    return () => {
      uppy.off('state-update', rerender);
      uppy.destroy();
      uppyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const files = Object.values(uppy.getFiles());

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    setErrorMsg(null);
    for (const file of Array.from(selected)) {
      try {
        uppy.addFile({
          name: file.name,
          type: file.type || 'application/octet-stream',
          data: file,
          source: 'native-picker',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'no se pudo agregar';
        if (!/duplicate/i.test(msg)) setErrorMsg(msg);
      }
    }
  };

  const activeFiles = files.filter((f) => phaseFor(f) !== 'done');
  const finishedFiles = files.filter((f) => phaseFor(f) === 'done');
  const anyActive = activeFiles.length > 0;

  const clearFinished = () => {
    for (const f of finishedFiles) uppy.removeFile(f.id);
    setDoneCount(0);
  };

  return (
    <section className="page upload-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">subir</h1>
          <p className="page-subtitle">
            {anyActive
              ? `${activeFiles.length} en cola${doneCount > 0 ? ` · ${doneCount} listas` : ''}`
              : doneCount > 0
                ? `${doneCount} subida${doneCount === 1 ? '' : 's'}`
                : 'fotos y videos desde tu iPhone'}
          </p>
        </div>
        {doneCount > 0 && !anyActive && (
          <div className="page-actions">
            <Link to="/" className="btn btn-primary">ver biblioteca</Link>
          </div>
        )}
      </header>

      <div className="upload-actions">
        <button
          type="button"
          className="upload-tile"
          onClick={() => cameraRef.current?.click()}
        >
          <span className="upload-tile__icon"><Icon name="camera" size={28} /></span>
          <span className="upload-tile__title">tomar foto o video</span>
          <span className="upload-tile__hint">abre la cámara</span>
        </button>
        <button
          type="button"
          className="upload-tile"
          onClick={() => libRef.current?.click()}
        >
          <span className="upload-tile__icon"><Icon name="photo-library" size={28} /></span>
          <span className="upload-tile__title">elegir de biblioteca</span>
          <span className="upload-tile__hint">selecciona varios</span>
        </button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ''; }}
        hidden
      />
      <input
        ref={libRef}
        type="file"
        accept={ACCEPT.join(',')}
        multiple
        onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ''; }}
        hidden
      />

      {errorMsg && <p className="err" role="alert">{errorMsg}</p>}

      {(activeFiles.length > 0 || finishedFiles.length > 0) && (
        <section className="upload-list" aria-label="Cola de subida">
          {activeFiles.map((f) => {
            const ph = phaseFor(f);
            const pct = Math.round(f.progress?.percentage ?? 0);
            return (
              <article key={f.id} className="upload-row">
                <FileThumb file={f} />
                <div className="upload-row__body">
                  <div className="upload-row__name" title={f.name}>{f.name}</div>
                  <div className="upload-row__meta">
                    {ph === 'hashing' && 'calculando hash…'}
                    {ph === 'queued' && 'en cola'}
                    {ph === 'uploading' && `subiendo · ${pct}%`}
                    {ph === 'paused' && 'pausada'}
                    {ph === 'error' && (f.error ?? 'error')}
                    {' · '}
                    {formatBytes(f.size ?? 0)}
                  </div>
                  <div className="upload-row__bar">
                    <div
                      className={`upload-row__bar-fill ${ph}`}
                      style={{ width: `${ph === 'hashing' ? 8 : pct}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="upload-row__action"
                  onClick={() => uppy.removeFile(f.id)}
                  aria-label="quitar"
                >
                  <Icon name="close" size={18} />
                </button>
              </article>
            );
          })}

          {finishedFiles.length > 0 && (
            <div className="upload-list__group">
              <div className="upload-list__group-header">
                <span>completadas ({finishedFiles.length})</span>
                <button type="button" className="linkish" onClick={clearFinished}>limpiar</button>
              </div>
              {finishedFiles.map((f) => (
                <article key={f.id} className="upload-row upload-row--done">
                  <FileThumb file={f} />
                  <div className="upload-row__body">
                    <div className="upload-row__name" title={f.name}>{f.name}</div>
                    <div className="upload-row__meta">subida · {formatBytes(f.size ?? 0)}</div>
                  </div>
                  <span className="upload-row__check" aria-hidden="true">
                    <Icon name="check" size={16} strokeWidth={2.6} />
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
