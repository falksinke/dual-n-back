export const PROFILE_STORAGE_KEY = 'nback-profile';
export const PROFILE_MIN_LENGTH = 1;
export const PROFILE_MAX_LENGTH = 40;

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export function normalizeProfileName(raw: string): string {
    return raw.trim().replace(/\s+/g, ' ');
}

export function validateProfileName(raw: string): string | null {
    const name = normalizeProfileName(raw);
    if (name.length < PROFILE_MIN_LENGTH) return 'Enter a profile name';
    if (name.length > PROFILE_MAX_LENGTH) return `Profile names can be at most ${PROFILE_MAX_LENGTH} characters`;
    if (!/^[\p{L}\p{N} _.-]+$/u.test(name)) return 'Use letters, numbers, spaces, dots, dashes, or underscores';
    return null;
}

function storage(candidate?: StorageLike): StorageLike | null {
    if (candidate != null) return candidate;
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
}

export function loadProfile(storageOverride?: StorageLike): string | null {
    const raw = storage(storageOverride)?.getItem(PROFILE_STORAGE_KEY);
    if (raw == null || validateProfileName(raw) != null) return null;
    return normalizeProfileName(raw);
}

export function saveProfile(raw: string, storageOverride?: StorageLike): string {
    const name = normalizeProfileName(raw);
    const error = validateProfileName(name);
    if (error != null) throw new Error(error);
    storage(storageOverride)?.setItem(PROFILE_STORAGE_KEY, name);
    return name;
}
