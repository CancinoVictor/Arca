import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Uppy from '@uppy/core';
import Tus from '@uppy/tus';
import { mediaApi } from '../api/media';
import { hashFileInWorker } from '../lib/hashPool';
import { Icon } from '../components/Icon';
const ACCEPT = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
];
function createUppy() {
    const u = new Uppy({
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
            .filter((e) => !!e.file);
        if (entries.length === 0)
            return;
        for (const e of entries) {
            u.emit('preprocess-progress', e.file, { mode: 'indeterminate', message: 'calculando hash…' });
        }
        let hashes;
        try {
            hashes = await Promise.all(entries.map((e) => hashFileInWorker(e.file.data)));
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            u.info({ message: 'error calculando hashes', details: msg }, 'error', 5000);
            for (const e of entries)
                u.removeFile(e.id);
            return;
        }
        let existsMap = new Map();
        try {
            const resp = await mediaApi.verifyBatch(hashes);
            existsMap = new Map(resp.results.map((r) => [r.hash, r.exists]));
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            u.info({ message: 'no se pudo verificar duplicados', details: msg }, 'error', 5000);
            for (const e of entries)
                u.removeFile(e.id);
            return;
        }
        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            const hash = hashes[i];
            if (existsMap.get(hash)) {
                u.removeFile(e.id);
            }
            else {
                u.setFileMeta(e.id, { hash });
            }
            u.emit('preprocess-complete', e.file);
        }
    });
    return u;
}
function phaseFor(f) {
    if (f.error)
        return 'error';
    if (f.progress?.uploadComplete)
        return 'done';
    if (f.isPaused)
        return 'paused';
    if (f.progress?.preprocess)
        return 'hashing';
    if ((f.progress?.percentage ?? 0) > 0)
        return 'uploading';
    return 'queued';
}
function formatBytes(n) {
    if (n < 1024)
        return `${n} B`;
    const units = ['KB', 'MB', 'GB'];
    let u = -1;
    let v = n;
    do {
        v /= 1024;
        u++;
    } while (v >= 1024 && u < units.length - 1);
    return `${v.toFixed(v < 10 ? 1 : 0)} ${units[u]}`;
}
function FileThumb({ file }) {
    const [url, setUrl] = useState(null);
    useEffect(() => {
        if (!(file.data instanceof Blob))
            return;
        if (!file.type?.startsWith('image/'))
            return;
        const u = URL.createObjectURL(file.data);
        setUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [file.data, file.type, file.id]);
    if (url)
        return _jsx("img", { src: url, alt: "", className: "upload-row__thumb" });
    const isVideo = file.type?.startsWith('video/');
    return (_jsx("div", { className: "upload-row__thumb upload-row__thumb--placeholder", children: _jsx(Icon, { name: isVideo ? 'video' : 'photo', size: 20 }) }));
}
export function Upload() {
    const qc = useQueryClient();
    const cameraRef = useRef(null);
    const libRef = useRef(null);
    const uppyRef = useRef(null);
    const [, setTick] = useState(0);
    const [doneCount, setDoneCount] = useState(0);
    const [errorMsg, setErrorMsg] = useState(null);
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
    const addFiles = (selected) => {
        if (!selected)
            return;
        setErrorMsg(null);
        for (const file of Array.from(selected)) {
            try {
                uppy.addFile({
                    name: file.name,
                    type: file.type || 'application/octet-stream',
                    data: file,
                    source: 'native-picker',
                });
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : 'no se pudo agregar';
                if (!/duplicate/i.test(msg))
                    setErrorMsg(msg);
            }
        }
    };
    const activeFiles = files.filter((f) => phaseFor(f) !== 'done');
    const finishedFiles = files.filter((f) => phaseFor(f) === 'done');
    const anyActive = activeFiles.length > 0;
    const clearFinished = () => {
        for (const f of finishedFiles)
            uppy.removeFile(f.id);
        setDoneCount(0);
    };
    return (_jsxs("section", { className: "page upload-page", children: [_jsxs("header", { className: "page-header", children: [_jsxs("div", { children: [_jsx("h1", { className: "page-title", children: "subir" }), _jsx("p", { className: "page-subtitle", children: anyActive
                                    ? `${activeFiles.length} en cola${doneCount > 0 ? ` · ${doneCount} listas` : ''}`
                                    : doneCount > 0
                                        ? `${doneCount} subida${doneCount === 1 ? '' : 's'}`
                                        : 'fotos y videos desde tu iPhone' })] }), doneCount > 0 && !anyActive && (_jsx("div", { className: "page-actions", children: _jsx(Link, { to: "/", className: "btn btn-primary", children: "ver biblioteca" }) }))] }), _jsxs("div", { className: "upload-actions", children: [_jsxs("button", { type: "button", className: "upload-tile", onClick: () => cameraRef.current?.click(), children: [_jsx("span", { className: "upload-tile__icon", children: _jsx(Icon, { name: "camera", size: 28 }) }), _jsx("span", { className: "upload-tile__title", children: "tomar foto o video" }), _jsx("span", { className: "upload-tile__hint", children: "abre la c\u00E1mara" })] }), _jsxs("button", { type: "button", className: "upload-tile", onClick: () => libRef.current?.click(), children: [_jsx("span", { className: "upload-tile__icon", children: _jsx(Icon, { name: "photo-library", size: 28 }) }), _jsx("span", { className: "upload-tile__title", children: "elegir de biblioteca" }), _jsx("span", { className: "upload-tile__hint", children: "selecciona varios" })] })] }), _jsx("input", { ref: cameraRef, type: "file", accept: "image/*,video/*", capture: "environment", onChange: (e) => { addFiles(e.target.files); e.currentTarget.value = ''; }, hidden: true }), _jsx("input", { ref: libRef, type: "file", accept: ACCEPT.join(','), multiple: true, onChange: (e) => { addFiles(e.target.files); e.currentTarget.value = ''; }, hidden: true }), errorMsg && _jsx("p", { className: "err", role: "alert", children: errorMsg }), (activeFiles.length > 0 || finishedFiles.length > 0) && (_jsxs("section", { className: "upload-list", "aria-label": "Cola de subida", children: [activeFiles.map((f) => {
                        const ph = phaseFor(f);
                        const pct = Math.round(f.progress?.percentage ?? 0);
                        return (_jsxs("article", { className: "upload-row", children: [_jsx(FileThumb, { file: f }), _jsxs("div", { className: "upload-row__body", children: [_jsx("div", { className: "upload-row__name", title: f.name, children: f.name }), _jsxs("div", { className: "upload-row__meta", children: [ph === 'hashing' && 'calculando hash…', ph === 'queued' && 'en cola', ph === 'uploading' && `subiendo · ${pct}%`, ph === 'paused' && 'pausada', ph === 'error' && (f.error ?? 'error'), ' · ', formatBytes(f.size ?? 0)] }), _jsx("div", { className: "upload-row__bar", children: _jsx("div", { className: `upload-row__bar-fill ${ph}`, style: { width: `${ph === 'hashing' ? 8 : pct}%` } }) })] }), _jsx("button", { type: "button", className: "upload-row__action", onClick: () => uppy.removeFile(f.id), "aria-label": "quitar", children: _jsx(Icon, { name: "close", size: 18 }) })] }, f.id));
                    }), finishedFiles.length > 0 && (_jsxs("div", { className: "upload-list__group", children: [_jsxs("div", { className: "upload-list__group-header", children: [_jsxs("span", { children: ["completadas (", finishedFiles.length, ")"] }), _jsx("button", { type: "button", className: "linkish", onClick: clearFinished, children: "limpiar" })] }), finishedFiles.map((f) => (_jsxs("article", { className: "upload-row upload-row--done", children: [_jsx(FileThumb, { file: f }), _jsxs("div", { className: "upload-row__body", children: [_jsx("div", { className: "upload-row__name", title: f.name, children: f.name }), _jsxs("div", { className: "upload-row__meta", children: ["subida \u00B7 ", formatBytes(f.size ?? 0)] })] }), _jsx("span", { className: "upload-row__check", "aria-hidden": "true", children: _jsx(Icon, { name: "check", size: 16, strokeWidth: 2.6 }) })] }, f.id)))] }))] }))] }));
}
