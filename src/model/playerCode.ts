export const PLAYER_CODE_STORAGE_KEY = 'nback-player-code';
export const PLAYER_CODE_MIN_LENGTH = 6;
export const PLAYER_CODE_MAX_LENGTH = 64;

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem?(key: string): void;
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
    if (storage != null) {
        return storage;
    }
    if (typeof globalThis.localStorage !== 'undefined') {
        return globalThis.localStorage;
    }
    return null;
}

/** Trim only — case-sensitive passphrase. */
export function normalizePlayerCode(raw: string): string {
    return raw.trim();
}

export function validatePlayerCode(code: string): string | null {
    const normalized = normalizePlayerCode(code);
    if (normalized.length < PLAYER_CODE_MIN_LENGTH) {
        return `Player code must be at least ${PLAYER_CODE_MIN_LENGTH} characters`;
    }
    if (normalized.length > PLAYER_CODE_MAX_LENGTH) {
        return `Player code must be at most ${PLAYER_CODE_MAX_LENGTH} characters`;
    }
    return null;
}

export function loadPlayerCode(storage?: StorageLike): string | null {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return null;
    }
    const raw = resolved.getItem(PLAYER_CODE_STORAGE_KEY);
    if (raw == null || raw === '') {
        return null;
    }
    const normalized = normalizePlayerCode(raw);
    if (validatePlayerCode(normalized) != null) {
        return null;
    }
    return normalized;
}

export function savePlayerCode(code: string, storage?: StorageLike): void {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return;
    }
    const normalized = normalizePlayerCode(code);
    const error = validatePlayerCode(normalized);
    if (error != null) {
        throw new Error(error);
    }
    try {
        resolved.setItem(PLAYER_CODE_STORAGE_KEY, normalized);
    } catch {
        // localStorage quota / privacy mode — fail silently.
    }
}

export function clearPlayerCode(storage?: StorageLike): void {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return;
    }
    try {
        if (typeof resolved.removeItem === 'function') {
            resolved.removeItem(PLAYER_CODE_STORAGE_KEY);
        } else {
            resolved.setItem(PLAYER_CODE_STORAGE_KEY, '');
        }
    } catch {
        // ignore
    }
}
