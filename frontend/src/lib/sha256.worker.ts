/// <reference lib="webworker" />
import { createSHA256 } from 'hash-wasm';

type Request = { id: number; file: Blob };
type Response = { id: number; hash?: string; error?: string };

const CHUNK = 4 * 1024 * 1024;

self.onmessage = async (e: MessageEvent<Request>) => {
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
    (self as DedicatedWorkerGlobalScope).postMessage({ id, hash } satisfies Response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (self as DedicatedWorkerGlobalScope).postMessage({ id, error: msg } satisfies Response);
  }
};
