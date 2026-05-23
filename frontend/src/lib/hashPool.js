import HashWorker from './sha256.worker?worker';
const POOL_SIZE = 4;
const workers = [];
const busy = [];
const activeIds = [];
const pendingById = new Map();
const queue = [];
let initialized = false;
let nextId = 1;
function ensureInit() {
    if (initialized)
        return;
    initialized = true;
    for (let i = 0; i < POOL_SIZE; i++) {
        const w = new HashWorker();
        const lane = i;
        w.onmessage = (e) => {
            const { id, hash, error } = e.data;
            const task = pendingById.get(id);
            if (task) {
                pendingById.delete(id);
                if (error)
                    task.reject(new Error(error));
                else if (hash)
                    task.resolve(hash);
                else
                    task.reject(new Error('worker returned no hash'));
            }
            busy[lane] = false;
            activeIds[lane] = null;
            pump();
        };
        w.onerror = (e) => {
            const activeId = activeIds[lane];
            if (activeId !== null) {
                const task = pendingById.get(activeId);
                if (task) {
                    pendingById.delete(activeId);
                    task.reject(new Error(e.message || 'worker crashed'));
                }
            }
            busy[lane] = false;
            activeIds[lane] = null;
            pump();
        };
        workers.push(w);
        busy.push(false);
        activeIds.push(null);
    }
}
function pump() {
    for (let i = 0; i < workers.length; i++) {
        if (busy[i])
            continue;
        const task = queue.shift();
        if (!task)
            return;
        const id = nextId++;
        pendingById.set(id, task);
        activeIds[i] = id;
        busy[i] = true;
        workers[i].postMessage({ id, file: task.file });
    }
}
export function hashFileInWorker(file) {
    ensureInit();
    return new Promise((resolve, reject) => {
        queue.push({ file, resolve, reject });
        pump();
    });
}
