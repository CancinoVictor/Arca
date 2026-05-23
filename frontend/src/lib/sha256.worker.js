/// <reference lib="webworker" />
import { createSHA256 } from 'hash-wasm';
const CHUNK = 4 * 1024 * 1024;
self.onmessage = async (e) => {
    const { id, file } = e.data;
    try {
        const hasher = await createSHA256();
        hasher.init();
        let offset = 0;
        while (offset < file.size) {
            const end = Math.min(offset + CHUNK, file.size);
            const slice = file.slice(offset, end);
            const buf = new Uint8Array(await slice.arrayBuffer());
            hasher.update(buf);
            offset = end;
        }
        const hash = hasher.digest('hex');
        self.postMessage({ id, hash });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        self.postMessage({ id, error: msg });
    }
};
