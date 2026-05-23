const BASE = '/api';
export class ApiError extends Error {
    status;
    body;
    constructor(status, body, message) {
        super(message);
        this.status = status;
        this.body = body;
    }
}
async function request(path, init = {}) {
    const hasJsonBody = init.body !== undefined &&
        !(init.body instanceof FormData) &&
        !(init.body instanceof Blob) &&
        !(init.body instanceof ArrayBuffer) &&
        !(init.body instanceof Uint8Array);
    const res = await fetch(`${BASE}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
            ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
            ...(init.headers ?? {}),
        },
    });
    if (!res.ok) {
        let body = null;
        try {
            body = await res.json();
        }
        catch { /* ignore */ }
        throw new ApiError(res.status, body, body?.error ?? res.statusText);
    }
    if (res.status === 204)
        return undefined;
    const text = await res.text();
    return text ? JSON.parse(text) : undefined;
}
export const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    del: (path) => request(path, { method: 'DELETE' }),
};
