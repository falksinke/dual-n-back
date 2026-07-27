import { DEFAULT_ISI_MAX_MS, DEFAULT_ISI_MIN_MS } from './isi';
import { isLureStageId, LureStageId } from './lureStages';
import { ModeId } from './modalities';

export const LADDER_STORAGE_KEY = 'nback-adaptive-ladder';
export const LADDER_SCHEMA_VERSION = 1 as const;
export const DEFAULT_LADDER_N = 2;
export const DEFAULT_LADDER_LURE_STAGE: LureStageId = 'A';
export const DEFAULT_ISI_TIER = 0;

export interface ModeLadderSnapshot {
    n: number;
    lureStage: LureStageId;
    isiTier: number;
}

export interface LadderStorageV1 {
    version: typeof LADDER_SCHEMA_VERSION;
    byMode: Record<ModeId, ModeLadderSnapshot>;
}

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

const MODE_IDS: ModeId[] = ['dual', 'triple', 'quad'];

export function createDefaultModeLadder(): ModeLadderSnapshot {
    return {
        n: DEFAULT_LADDER_N,
        lureStage: DEFAULT_LADDER_LURE_STAGE,
        isiTier: DEFAULT_ISI_TIER,
    };
}

export function createDefaultLadderByMode(): Record<ModeId, ModeLadderSnapshot> {
    return {
        dual: createDefaultModeLadder(),
        triple: createDefaultModeLadder(),
        quad: createDefaultModeLadder(),
    };
}

export function createDefaultLadderStorage(): LadderStorageV1 {
    return {
        version: LADDER_SCHEMA_VERSION,
        byMode: createDefaultLadderByMode(),
    };
}

/**
 * Discrete ISI tighten ladder (plan KTD7): fixed onset intervals, clamped.
 * Higher tier = faster (shorter) ISI. Tier 0 keeps the wide default range.
 */
const ISI_TIER_FIXED_MS = [null, 2500, 2000, 1500] as const;

export function isiMsFromTier(tier: number): { isiMin: number; isiMax: number } {
    const index = Math.max(0, Math.min(ISI_TIER_FIXED_MS.length - 1, Math.floor(tier)));
    const fixed = ISI_TIER_FIXED_MS[index];
    if (fixed == null) {
        return { isiMin: DEFAULT_ISI_MIN_MS, isiMax: DEFAULT_ISI_MAX_MS };
    }
    return { isiMin: fixed, isiMax: fixed };
}

function normalizeModeLadder(raw: unknown): ModeLadderSnapshot {
    const defaults = createDefaultModeLadder();
    if (raw == null || typeof raw !== 'object') {
        return defaults;
    }
    const obj = raw as Record<string, unknown>;
    const n =
        typeof obj.n === 'number' && Number.isFinite(obj.n) && obj.n >= 2
            ? Math.floor(obj.n)
            : defaults.n;
    const lureStage =
        typeof obj.lureStage === 'string' && isLureStageId(obj.lureStage)
            ? obj.lureStage
            : defaults.lureStage;
    const isiTier =
        typeof obj.isiTier === 'number' && Number.isFinite(obj.isiTier) && obj.isiTier >= 0
            ? Math.floor(obj.isiTier)
            : defaults.isiTier;
    return { n, lureStage, isiTier };
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

export function parseLadderStorage(raw: string): LadderStorageV1 {
    try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed == null || typeof parsed !== 'object') {
            return createDefaultLadderStorage();
        }
        const obj = parsed as Record<string, unknown>;
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

export function loadLadder(storage?: StorageLike): LadderStorageV1 {
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

export function saveLadder(data: LadderStorageV1, storage?: StorageLike): void {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return;
    }
    try {
        resolved.setItem(LADDER_STORAGE_KEY, JSON.stringify(data));
    } catch {
        // localStorage quota / privacy mode — fail silently (plan risk mitigation).
    }
}
