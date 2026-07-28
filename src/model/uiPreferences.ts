export const UI_PREFERENCES_STORAGE_KEY = 'nback-ui-preferences';
export const UI_PREFERENCES_SCHEMA_VERSION = 2 as const;

export interface UiPreferencesV1 {
    version: typeof UI_PREFERENCES_SCHEMA_VERSION;
    visitCount: number;
    blocksCompleted: number;
    installNudgeDismissedAt: number | null;
    hapticFeedbackEnabled: boolean;
}

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export function createDefaultUiPreferences(): UiPreferencesV1 {
    return {
        version: UI_PREFERENCES_SCHEMA_VERSION,
        visitCount: 0,
        blocksCompleted: 0,
        installNudgeDismissedAt: null,
        /** On by default so match claims confirm on touch; still toggleable in Settings. */
        hapticFeedbackEnabled: true,
    };
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

export function parseUiPreferences(raw: string): UiPreferencesV1 {
    const defaults = createDefaultUiPreferences();
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed == null || typeof parsed !== 'object') {
            return defaults;
        }
        const obj = parsed as Record<string, unknown>;
        const storedVersion =
            typeof obj.version === 'number' && Number.isFinite(obj.version)
                ? Math.floor(obj.version)
                : 0;
        // v1 defaulted haptics off; promote to on when upgrading so presses feel confirmed.
        const hapticFromStore =
            typeof obj.hapticFeedbackEnabled === 'boolean'
                ? obj.hapticFeedbackEnabled
                : defaults.hapticFeedbackEnabled;
        const hapticFeedbackEnabled =
            storedVersion < UI_PREFERENCES_SCHEMA_VERSION ? true : hapticFromStore;

        return {
            version: UI_PREFERENCES_SCHEMA_VERSION,
            visitCount:
                typeof obj.visitCount === 'number' && Number.isFinite(obj.visitCount)
                    ? Math.max(0, Math.floor(obj.visitCount))
                    : defaults.visitCount,
            blocksCompleted:
                typeof obj.blocksCompleted === 'number' && Number.isFinite(obj.blocksCompleted)
                    ? Math.max(0, Math.floor(obj.blocksCompleted))
                    : defaults.blocksCompleted,
            installNudgeDismissedAt:
                typeof obj.installNudgeDismissedAt === 'number' &&
                Number.isFinite(obj.installNudgeDismissedAt)
                    ? obj.installNudgeDismissedAt
                    : null,
            hapticFeedbackEnabled,
        };
    } catch {
        return defaults;
    }
}

export function loadUiPreferences(storage?: StorageLike): UiPreferencesV1 {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return createDefaultUiPreferences();
    }
    const raw = resolved.getItem(UI_PREFERENCES_STORAGE_KEY);
    if (raw == null || raw === '') {
        return createDefaultUiPreferences();
    }
    const parsed = parseUiPreferences(raw);
    try {
        const stored = JSON.parse(raw) as { version?: number };
        if (stored.version !== UI_PREFERENCES_SCHEMA_VERSION) {
            saveUiPreferences(parsed, resolved);
        }
    } catch {
        saveUiPreferences(parsed, resolved);
    }
    return parsed;
}

export function saveUiPreferences(data: UiPreferencesV1, storage?: StorageLike): void {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return;
    }
    try {
        resolved.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(data));
    } catch {
        // localStorage quota / privacy mode — fail silently.
    }
}

export function recordVisit(storage?: StorageLike): UiPreferencesV1 {
    const current = loadUiPreferences(storage);
    const next = { ...current, visitCount: current.visitCount + 1 };
    saveUiPreferences(next, storage);
    return next;
}

export function recordBlockCompleted(storage?: StorageLike): UiPreferencesV1 {
    const current = loadUiPreferences(storage);
    const next = { ...current, blocksCompleted: current.blocksCompleted + 1 };
    saveUiPreferences(next, storage);
    return next;
}

export function dismissInstallNudge(now = Date.now(), storage?: StorageLike): UiPreferencesV1 {
    const current = loadUiPreferences(storage);
    const next = { ...current, installNudgeDismissedAt: now };
    saveUiPreferences(next, storage);
    return next;
}

export function setHapticFeedbackEnabled(
    enabled: boolean,
    storage?: StorageLike
): UiPreferencesV1 {
    const current = loadUiPreferences(storage);
    const next = { ...current, hapticFeedbackEnabled: enabled };
    saveUiPreferences(next, storage);
    return next;
}
