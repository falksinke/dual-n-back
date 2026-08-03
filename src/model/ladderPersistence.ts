import {
    clampCurriculumN,
    createDefaultCurriculumLadder,
    isCurriculumStage,
    type CurriculumLadderState,
} from './adaptiveCurriculum';
import { isLureStageId } from './lureStages';
import { ModeId } from './modalities';

export const LADDER_STORAGE_KEY = 'nback-adaptive-ladder';
export const LADDER_SCHEMA_VERSION = 3 as const;

/** Per-mode Adaptive dual-track curriculum snapshot. */
export type ModeLadderSnapshot = CurriculumLadderState;

export interface LadderStorageV3 {
    version: typeof LADDER_SCHEMA_VERSION;
    byMode: Record<ModeId, ModeLadderSnapshot>;
}

/** @deprecated Alias during call-site migration. */
export type LadderStorageV2 = LadderStorageV3;

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

const MODE_IDS: ModeId[] = ['dual', 'triple', 'quad'];

export function createDefaultModeLadder(): ModeLadderSnapshot {
    return createDefaultCurriculumLadder();
}

export function createDefaultLadderByMode(): Record<ModeId, ModeLadderSnapshot> {
    return {
        dual: createDefaultModeLadder(),
        triple: createDefaultModeLadder(),
        quad: createDefaultModeLadder(),
    };
}

export function createDefaultLadderStorage(): LadderStorageV3 {
    return {
        version: LADDER_SCHEMA_VERSION,
        byMode: createDefaultLadderByMode(),
    };
}

function normalizeModeLadder(raw: unknown): ModeLadderSnapshot {
    const defaults = createDefaultModeLadder();
    if (raw == null || typeof raw !== 'object') {
        return defaults;
    }
    const obj = raw as Record<string, unknown>;
    const track = obj.track === 'flexible' ? 'flexible' : 'fixed';
    const stage =
        typeof obj.stage === 'string' && isCurriculumStage(obj.stage) ? obj.stage : defaults.stage;
    const lureStage =
        typeof obj.lureStage === 'string' && isLureStageId(obj.lureStage)
            ? obj.lureStage
            : defaults.lureStage;
    const isiTier =
        typeof obj.isiTier === 'number' && Number.isFinite(obj.isiTier) && obj.isiTier >= 0
            ? Math.floor(obj.isiTier)
            : defaults.isiTier;
    const failStreak =
        typeof obj.failStreak === 'number' && Number.isFinite(obj.failStreak) && obj.failStreak >= 0
            ? Math.floor(obj.failStreak)
            : defaults.failStreak;
    const promoteStreak =
        typeof obj.promoteStreak === 'number' &&
        Number.isFinite(obj.promoteStreak) &&
        obj.promoteStreak >= 0
            ? Math.floor(obj.promoteStreak)
            : defaults.promoteStreak;

    return {
        track,
        n: clampCurriculumN(typeof obj.n === 'number' ? obj.n : defaults.n),
        stage,
        lureStage,
        isiTier,
        failStreak,
        promoteStreak,
    };
}

function normalizeByMode(raw: unknown): Record<ModeId, ModeLadderSnapshot> {
    const byMode = createDefaultLadderByMode();
    if (raw == null || typeof raw !== 'object') {
        return byMode;
    }
    const obj = raw as Record<string, unknown>;
    for (const mode of MODE_IDS) {
        if (mode in obj) {
            byMode[mode] = normalizeModeLadder(obj[mode]);
        }
    }
    return byMode;
}

export function parseLadderStorage(raw: string): LadderStorageV3 {
    try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed == null || typeof parsed !== 'object') {
            return createDefaultLadderStorage();
        }
        const obj = parsed as Record<string, unknown>;
        // Clean break from v1/v2 Match-% index state.
        if (obj.version !== LADDER_SCHEMA_VERSION) {
            return createDefaultLadderStorage();
        }
        return {
            version: LADDER_SCHEMA_VERSION,
            byMode: normalizeByMode(obj.byMode),
        };
    } catch {
        return createDefaultLadderStorage();
    }
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

export function loadLadder(storage?: StorageLike): LadderStorageV3 {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return createDefaultLadderStorage();
    }
    const raw = resolved.getItem(LADDER_STORAGE_KEY);
    if (raw == null || raw === '') {
        return createDefaultLadderStorage();
    }
    return parseLadderStorage(raw);
}

export function saveLadder(data: LadderStorageV3, storage?: StorageLike): void {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return;
    }
    try {
        resolved.setItem(LADDER_STORAGE_KEY, JSON.stringify(data));
    } catch {
        // localStorage quota / privacy mode — fail silently.
    }
}
