import {
    createDefaultAdaptiveLadderStorage,
    createDefaultCyclicLadderStorage,
    parseAdaptiveLadderStorage,
    parseCyclicLadderStorage,
    type AdaptiveLadderStorageV2,
    type CyclicLadderStorageV3,
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
import {
    createEmptyStatisticsHistory,
    parseStatisticsHistory,
    type StatisticsHistory,
} from './statistics';
import {
    createDefaultDailyProgress,
    parseDailyProgress,
    type DailyProgressV1,
} from './dailyProgress';
import {
    createDefaultFireflyProgress,
    normalizeFireflyProgress,
    type FireflyProgressV1,
} from './fireflyProgress';

export const PROGRESS_DOCUMENT_VERSION = 1 as const;

export interface ProgressDocumentV1 {
    version: typeof PROGRESS_DOCUMENT_VERSION;
    updatedAt: string;
    /** Classic Match% Adaptive ladder. */
    ladder: AdaptiveLadderStorageV2;
    /** Cyclic curriculum ladder. */
    cyclicLadder: CyclicLadderStorageV3;
    settings: PersistableSettings;
    uiPreferences: UiPreferencesV1;
    statistics: StatisticsHistory;
    dailyProgress: DailyProgressV1;
    fireflyPost: FireflyProgressV1;
}

export function createDefaultProgressDocument(
    updatedAt = new Date().toISOString()
): ProgressDocumentV1 {
    return {
        version: PROGRESS_DOCUMENT_VERSION,
        updatedAt,
        ladder: createDefaultAdaptiveLadderStorage(),
        cyclicLadder: createDefaultCyclicLadderStorage(),
        settings: createDefaultPersistableSettings(),
        uiPreferences: createDefaultUiPreferences(),
        statistics: createEmptyStatisticsHistory(),
        dailyProgress: createDefaultDailyProgress(),
        fireflyPost: createDefaultFireflyProgress(),
    };
}

function isIsoDate(value: unknown): value is string {
    if (typeof value !== 'string' || value.trim() === '') {
        return false;
    }
    const t = Date.parse(value);
    return Number.isFinite(t);
}

function splitLegacyLadder(raw: unknown): {
    ladder: AdaptiveLadderStorageV2;
    cyclicLadder: CyclicLadderStorageV3;
} {
    const adaptiveDefaults = createDefaultAdaptiveLadderStorage();
    const cyclicDefaults = createDefaultCyclicLadderStorage();
    if (raw == null || typeof raw !== 'object') {
        return { ladder: adaptiveDefaults, cyclicLadder: cyclicDefaults };
    }
    const obj = raw as Record<string, unknown>;
    if (obj.version === 3 || obj.version === 4) {
        return {
            ladder: adaptiveDefaults,
            cyclicLadder: parseCyclicLadderStorage(JSON.stringify(raw)),
        };
    }
    if (obj.version === 2) {
        return {
            ladder: parseAdaptiveLadderStorage(JSON.stringify(raw)),
            cyclicLadder: cyclicDefaults,
        };
    }
    return { ladder: adaptiveDefaults, cyclicLadder: cyclicDefaults };
}

/** Normalize unknown JSON into a progress document (never throws). */
export function normalizeProgressDocument(raw: unknown): ProgressDocumentV1 {
    const defaults = createDefaultProgressDocument();
    if (raw == null || typeof raw !== 'object') {
        return defaults;
    }
    const obj = raw as Record<string, unknown>;

    let ladder = defaults.ladder;
    let cyclicLadder = defaults.cyclicLadder;

    if (obj.cyclicLadder != null) {
        cyclicLadder = parseCyclicLadderStorage(JSON.stringify(obj.cyclicLadder));
        if (obj.ladder != null) {
            const split = splitLegacyLadder(obj.ladder);
            // Prefer explicit Match% if ladder looks like v2; else keep defaults when ladder was v3.
            if (
                obj.ladder != null &&
                typeof obj.ladder === 'object' &&
                (obj.ladder as { version?: unknown }).version === 2
            ) {
                ladder = split.ladder;
            } else if (
                obj.ladder != null &&
                typeof obj.ladder === 'object' &&
                (obj.ladder as { version?: unknown }).version !== 3 &&
                (obj.ladder as { version?: unknown }).version !== 4
            ) {
                ladder = parseAdaptiveLadderStorage(JSON.stringify(obj.ladder));
            }
        }
    } else if (obj.ladder != null) {
        const split = splitLegacyLadder(obj.ladder);
        ladder = split.ladder;
        cyclicLadder = split.cyclicLadder;
    }

    const settings = normalizePersistableSettings(obj.settings);

    let uiPreferences = defaults.uiPreferences;
    if (obj.uiPreferences != null) {
        uiPreferences = parseUiPreferences(JSON.stringify(obj.uiPreferences));
    }

    const statistics =
        obj.statistics != null
            ? parseStatisticsHistory(JSON.stringify(obj.statistics))
            : defaults.statistics;
    const dailyProgress =
        obj.dailyProgress != null
            ? parseDailyProgress(JSON.stringify(obj.dailyProgress))
            : defaults.dailyProgress;
    const fireflyPost = normalizeFireflyProgress(obj.fireflyPost);

    return {
        version: PROGRESS_DOCUMENT_VERSION,
        updatedAt: isIsoDate(obj.updatedAt) ? obj.updatedAt : defaults.updatedAt,
        ladder,
        cyclicLadder,
        settings,
        uiPreferences,
        statistics,
        dailyProgress,
        fireflyPost,
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
    ladder: AdaptiveLadderStorageV2;
    cyclicLadder: CyclicLadderStorageV3;
    settings: PersistableSettings;
    uiPreferences: UiPreferencesV1;
    statistics?: StatisticsHistory;
    dailyProgress?: DailyProgressV1;
    fireflyPost?: FireflyProgressV1;
    updatedAt?: string;
}): ProgressDocumentV1 {
    return {
        version: PROGRESS_DOCUMENT_VERSION,
        updatedAt: parts.updatedAt ?? new Date().toISOString(),
        ladder: parts.ladder,
        cyclicLadder: parts.cyclicLadder,
        settings: parts.settings,
        uiPreferences: parts.uiPreferences,
        statistics: parts.statistics ?? createEmptyStatisticsHistory(),
        dailyProgress: parts.dailyProgress ?? createDefaultDailyProgress(),
        fireflyPost: parts.fireflyPost ?? createDefaultFireflyProgress(),
    };
}
