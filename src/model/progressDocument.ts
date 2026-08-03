import {
    createDefaultLadderStorage,
    parseLadderStorage,
    type LadderStorageV3,
} from './ladderPersistence';
import {
    createDefaultPersistableSettings,
    normalizePersistableSettings,
    type PersistableSettings,
} from './settingsPersistence';
import {
    createDefaultUiPreferences,
    parseUiPreferences,
    type UiPreferencesV1,
} from './uiPreferences';

export const PROGRESS_DOCUMENT_VERSION = 1 as const;

export interface ProgressDocumentV1 {
    version: typeof PROGRESS_DOCUMENT_VERSION;
    updatedAt: string;
    ladder: LadderStorageV3;
    settings: PersistableSettings;
    uiPreferences: UiPreferencesV1;
}

export function createDefaultProgressDocument(
    updatedAt = new Date().toISOString()
): ProgressDocumentV1 {
    return {
        version: PROGRESS_DOCUMENT_VERSION,
        updatedAt,
        ladder: createDefaultLadderStorage(),
        settings: createDefaultPersistableSettings(),
        uiPreferences: createDefaultUiPreferences(),
    };
}

function isIsoDate(value: unknown): value is string {
    if (typeof value !== 'string' || value.trim() === '') {
        return false;
    }
    const t = Date.parse(value);
    return Number.isFinite(t);
}

/** Normalize unknown JSON into a progress document (never throws). */
export function normalizeProgressDocument(raw: unknown): ProgressDocumentV1 {
    const defaults = createDefaultProgressDocument();
    if (raw == null || typeof raw !== 'object') {
        return defaults;
    }
    const obj = raw as Record<string, unknown>;

    let ladder = defaults.ladder;
    if (obj.ladder != null) {
        ladder = parseLadderStorage(JSON.stringify(obj.ladder));
    }

    const settings = normalizePersistableSettings(obj.settings);

    let uiPreferences = defaults.uiPreferences;
    if (obj.uiPreferences != null) {
        uiPreferences = parseUiPreferences(JSON.stringify(obj.uiPreferences));
    }

    return {
        version: PROGRESS_DOCUMENT_VERSION,
        updatedAt: isIsoDate(obj.updatedAt) ? obj.updatedAt : defaults.updatedAt,
        ladder,
        settings,
        uiPreferences,
    };
}

export function parseProgressDocument(raw: string): ProgressDocumentV1 {
    try {
        return normalizeProgressDocument(JSON.parse(raw) as unknown);
    } catch {
        return createDefaultProgressDocument();
    }
}

export function progressDocumentFromParts(parts: {
    ladder: LadderStorageV3;
    settings: PersistableSettings;
    uiPreferences: UiPreferencesV1;
    updatedAt?: string;
}): ProgressDocumentV1 {
    return {
        version: PROGRESS_DOCUMENT_VERSION,
        updatedAt: parts.updatedAt ?? new Date().toISOString(),
        ladder: parts.ladder,
        settings: parts.settings,
        uiPreferences: parts.uiPreferences,
    };
}
