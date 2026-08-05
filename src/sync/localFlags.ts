export const PROGRESS_DIRTY_STORAGE_KEY = 'nback-progress-dirty';
export const PROGRESS_LAST_SYNCED_STORAGE_KEY = 'nback-progress-last-synced';

export function readLastSyncedAt(): string | null {
    try {
        const raw = localStorage.getItem(PROGRESS_LAST_SYNCED_STORAGE_KEY);
        return raw != null && raw !== '' ? raw : null;
    } catch {
        return null;
    }
}

export function writeLastSyncedAt(iso: string): void {
    try {
        localStorage.setItem(PROGRESS_LAST_SYNCED_STORAGE_KEY, iso);
    } catch {
        // ignore
    }
}

export function isProgressDirty(): boolean {
    try {
        return localStorage.getItem(PROGRESS_DIRTY_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

export function setProgressDirty(dirty: boolean): void {
    try {
        if (dirty) {
            localStorage.setItem(PROGRESS_DIRTY_STORAGE_KEY, '1');
        } else {
            localStorage.removeItem(PROGRESS_DIRTY_STORAGE_KEY);
        }
    } catch {
        // ignore
    }
}
