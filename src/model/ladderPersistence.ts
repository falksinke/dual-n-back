import {
    clampLevelIndex,
    maxLevelIndex,
} from './adaptiveLevels';
import {
    clampCurriculumN,
    createDefaultCurriculumLadder,
    migrateCurriculumStage,
    type CurriculumLadderState,
} from './adaptiveCurriculum';
import { isLureStageId } from './lureStages';
import { ModeId } from './modalities';

/** Classic Match% Adaptive ladder (local + cloud). */
export const ADAPTIVE_LADDER_STORAGE_KEY = 'nback-adaptive-ladder';
/** Cyclic curriculum ladder (local + cloud). */
export const CYCLIC_LADDER_STORAGE_KEY = 'nback-cyclic-ladder';

/** @deprecated Prefer ADAPTIVE_LADDER_STORAGE_KEY. */
export const LADDER_STORAGE_KEY = ADAPTIVE_LADDER_STORAGE_KEY;

export const ADAPTIVE_LADDER_SCHEMA_VERSION = 2 as const;
export const CYCLIC_LADDER_SCHEMA_VERSION = 4 as const;
/** Prior cyclic schema (instruction/guided/fade). Accepted on load and rewritten as v4. */
const CYCLIC_LADDER_SCHEMA_V3 = 3 as const;

/** @deprecated Prefer CYCLIC_LADDER_SCHEMA_VERSION for curriculum. */
export const LADDER_SCHEMA_VERSION = CYCLIC_LADDER_SCHEMA_VERSION;

export type MatchLadderSnapshot = {
    levelIndex: number;
    failStreak: number;
};

/** Curriculum snapshot (cyclic path). */
export type CurriculumModeLadderSnapshot = CurriculumLadderState;

/** @deprecated Use MatchLadderSnapshot or CurriculumModeLadderSnapshot. */
export type ModeLadderSnapshot = CurriculumModeLadderSnapshot;

export interface AdaptiveLadderStorageV2 {
    version: typeof ADAPTIVE_LADDER_SCHEMA_VERSION;
    byMode: Record<ModeId, MatchLadderSnapshot>;
}

export interface CyclicLadderStorageV3 {
    version: typeof CYCLIC_LADDER_SCHEMA_VERSION;
    byMode: Record<ModeId, CurriculumModeLadderSnapshot>;
}

/** @deprecated Alias for cyclic storage during migration. */
export type LadderStorageV3 = CyclicLadderStorageV3;
/** @deprecated */
export type LadderStorageV2 = AdaptiveLadderStorageV2;

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

const MODE_IDS: ModeId[] = ['single', 'dual', 'triple', 'quad'];

export function createDefaultMatchLadder(): MatchLadderSnapshot {
    return { levelIndex: 0, failStreak: 0 };
}

export function createDefaultMatchLadderByMode(): Record<ModeId, MatchLadderSnapshot> {
    return {
        single: createDefaultMatchLadder(),
        dual: createDefaultMatchLadder(),
        triple: createDefaultMatchLadder(),
        quad: createDefaultMatchLadder(),
    };
}

export function createDefaultAdaptiveLadderStorage(): AdaptiveLadderStorageV2 {
    return {
        version: ADAPTIVE_LADDER_SCHEMA_VERSION,
        byMode: createDefaultMatchLadderByMode(),
    };
}

export function createDefaultModeLadder(): CurriculumModeLadderSnapshot {
    return createDefaultCurriculumLadder();
}

export function createDefaultCyclicLadderByMode(): Record<ModeId, CurriculumModeLadderSnapshot> {
    return {
        single: createDefaultModeLadder(),
        dual: createDefaultModeLadder(),
        triple: createDefaultModeLadder(),
        quad: createDefaultModeLadder(),
    };
}

export function createDefaultCyclicLadderStorage(): CyclicLadderStorageV3 {
    return {
        version: CYCLIC_LADDER_SCHEMA_VERSION,
        byMode: createDefaultCyclicLadderByMode(),
    };
}

/** @deprecated Prefer createDefaultCyclicLadderStorage. */
export function createDefaultLadderStorage(): CyclicLadderStorageV3 {
    return createDefaultCyclicLadderStorage();
}

/** @deprecated Prefer createDefaultCyclicLadderByMode. */
export function createDefaultLadderByMode(): Record<ModeId, CurriculumModeLadderSnapshot> {
    return createDefaultCyclicLadderByMode();
}

function normalizeMatchModeLadder(raw: unknown): MatchLadderSnapshot {
    const defaults = createDefaultMatchLadder();
    if (raw == null || typeof raw !== 'object') {
        return defaults;
    }
    const obj = raw as Record<string, unknown>;
    const levelIndex = clampLevelIndex(
        typeof obj.levelIndex === 'number' ? obj.levelIndex : defaults.levelIndex
    );
    const failStreak =
        typeof obj.failStreak === 'number' && Number.isFinite(obj.failStreak) && obj.failStreak >= 0
            ? Math.floor(obj.failStreak)
            : defaults.failStreak;
    return { levelIndex, failStreak };
}

function normalizeMatchByMode(raw: unknown): Record<ModeId, MatchLadderSnapshot> {
    const byMode = createDefaultMatchLadderByMode();
    if (raw == null || typeof raw !== 'object') {
        return byMode;
    }
    const obj = raw as Record<string, unknown>;
    for (const mode of MODE_IDS) {
        if (mode in obj) {
            byMode[mode] = normalizeMatchModeLadder(obj[mode]);
        }
    }
    return byMode;
}

function normalizeCurriculumModeLadder(raw: unknown): CurriculumModeLadderSnapshot {
    const defaults = createDefaultModeLadder();
    if (raw == null || typeof raw !== 'object') {
        return defaults;
    }
    const obj = raw as Record<string, unknown>;
    const track = obj.track === 'flexible' ? 'flexible' : 'fixed';
    const rawStage = typeof obj.stage === 'string' ? obj.stage : '';
    const migrated = migrateCurriculumStage(rawStage);
    const stage = migrated ?? defaults.stage;
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

function normalizeCurriculumByMode(raw: unknown): Record<ModeId, CurriculumModeLadderSnapshot> {
    const byMode = createDefaultCyclicLadderByMode();
    if (raw == null || typeof raw !== 'object') {
        return byMode;
    }
    const obj = raw as Record<string, unknown>;
    for (const mode of MODE_IDS) {
        if (mode in obj) {
            byMode[mode] = normalizeCurriculumModeLadder(obj[mode]);
        }
    }
    return byMode;
}

export function parseAdaptiveLadderStorage(raw: string): AdaptiveLadderStorageV2 {
    try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed == null || typeof parsed !== 'object') {
            return createDefaultAdaptiveLadderStorage();
        }
        const obj = parsed as Record<string, unknown>;
        // Curriculum blobs were briefly stored under the adaptive key — ignore for Match%.
        if (
            obj.version === CYCLIC_LADDER_SCHEMA_VERSION ||
            obj.version === CYCLIC_LADDER_SCHEMA_V3
        ) {
            return createDefaultAdaptiveLadderStorage();
        }
        if (obj.version !== ADAPTIVE_LADDER_SCHEMA_VERSION) {
            return createDefaultAdaptiveLadderStorage();
        }
        return {
            version: ADAPTIVE_LADDER_SCHEMA_VERSION,
            byMode: normalizeMatchByMode(obj.byMode),
        };
    } catch {
        return createDefaultAdaptiveLadderStorage();
    }
}

export function parseCyclicLadderStorage(raw: string): CyclicLadderStorageV3 {
    try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed == null || typeof parsed !== 'object') {
            return createDefaultCyclicLadderStorage();
        }
        const obj = parsed as Record<string, unknown>;
        if (
            obj.version !== CYCLIC_LADDER_SCHEMA_VERSION &&
            obj.version !== CYCLIC_LADDER_SCHEMA_V3
        ) {
            return createDefaultCyclicLadderStorage();
        }
        return {
            version: CYCLIC_LADDER_SCHEMA_VERSION,
            byMode: normalizeCurriculumByMode(obj.byMode),
        };
    } catch {
        return createDefaultCyclicLadderStorage();
    }
}

/** @deprecated Prefer parseCyclicLadderStorage. */
export function parseLadderStorage(raw: string): CyclicLadderStorageV3 {
    return parseCyclicLadderStorage(raw);
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

/**
 * Load Match% Adaptive ladder. If the adaptive key still holds a v3 curriculum
 * blob and cyclic is empty, migrate that blob into the cyclic key first.
 */
export function loadAdaptiveLadder(storage?: StorageLike): AdaptiveLadderStorageV2 {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return createDefaultAdaptiveLadderStorage();
    }
    const raw = resolved.getItem(ADAPTIVE_LADDER_STORAGE_KEY);
    if (raw == null || raw === '') {
        return createDefaultAdaptiveLadderStorage();
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed != null && typeof parsed === 'object') {
            const obj = parsed as Record<string, unknown>;
            if (
                obj.version === CYCLIC_LADDER_SCHEMA_VERSION ||
                obj.version === CYCLIC_LADDER_SCHEMA_V3
            ) {
                const cyclicRaw = resolved.getItem(CYCLIC_LADDER_STORAGE_KEY);
                if (cyclicRaw == null || cyclicRaw === '') {
                    saveCyclicLadder(parseCyclicLadderStorage(raw), resolved);
                }
                const defaults = createDefaultAdaptiveLadderStorage();
                saveAdaptiveLadder(defaults, resolved);
                return defaults;
            }
        }
    } catch {
        // fall through to parser
    }

    return parseAdaptiveLadderStorage(raw);
}

export function saveAdaptiveLadder(data: AdaptiveLadderStorageV2, storage?: StorageLike): void {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return;
    }
    try {
        resolved.setItem(ADAPTIVE_LADDER_STORAGE_KEY, JSON.stringify(data));
    } catch {
        // localStorage quota / privacy mode — fail silently.
    }
}

export function loadCyclicLadder(storage?: StorageLike): CyclicLadderStorageV3 {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return createDefaultCyclicLadderStorage();
    }
    const raw = resolved.getItem(CYCLIC_LADDER_STORAGE_KEY);
    if (raw == null || raw === '') {
        // Opportunistic migrate if adaptive key still has v3.
        loadAdaptiveLadder(resolved);
        const after = resolved.getItem(CYCLIC_LADDER_STORAGE_KEY);
        if (after != null && after !== '') {
            return parseCyclicLadderStorage(after);
        }
        return createDefaultCyclicLadderStorage();
    }
    return parseCyclicLadderStorage(raw);
}

export function saveCyclicLadder(data: CyclicLadderStorageV3, storage?: StorageLike): void {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return;
    }
    try {
        resolved.setItem(CYCLIC_LADDER_STORAGE_KEY, JSON.stringify(data));
    } catch {
        // localStorage quota / privacy mode — fail silently.
    }
}

/** @deprecated Prefer loadCyclicLadder. */
export function loadLadder(storage?: StorageLike): CyclicLadderStorageV3 {
    return loadCyclicLadder(storage);
}

/** @deprecated Prefer saveCyclicLadder. */
export function saveLadder(data: CyclicLadderStorageV3, storage?: StorageLike): void {
    saveCyclicLadder(data, storage);
}

export function clampMatchLevelIndex(index: number): number {
    return clampLevelIndex(index);
}

export function matchLadderCeiling(): number {
    return maxLevelIndex();
}
