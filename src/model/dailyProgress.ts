import type { StorageLike } from './uiPreferences';

export const DAILY_PROGRESS_STORAGE_KEY = 'nback-daily-progress';
export const DAILY_PROGRESS_SCHEMA_VERSION = 1 as const;

/** Local hour when a new training day begins (04:00). */
export const TRAINING_DAY_ROLLOVER_HOUR = 4;

export const DEFAULT_DAILY_ROUNDS = 20;
export const DEFAULT_DAILY_SESSIONS = 4;

export interface DailyProgressV1 {
    version: typeof DAILY_PROGRESS_SCHEMA_VERSION;
    dayKey: string;
    completedCount: number;
}

export type Clock = () => Date;

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
 * Training-day key: local calendar date with hour < 4 treated as previous date.
 * Format: YYYY-MM-DD
 */
export function trainingDayKey(now: Date = new Date()): string {
    const d = new Date(now.getTime());
    if (d.getHours() < TRAINING_DAY_ROLLOVER_HOUR) {
        d.setDate(d.getDate() - 1);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Split total rounds into session-sized groups.
 * Remainder goes on earlier groups (20/4 → 5×4; 22/4 → 6,6,5,5).
 * When rounds < sessions, clamp sessions to rounds (min 1 session if rounds ≥ 1).
 */
export function splitRoundsIntoSessions(rounds: number, sessions: number): number[] {
    const r = Math.max(0, Math.floor(rounds));
    if (r === 0) return [];
    const s = Math.max(1, Math.min(Math.floor(sessions), r));
    const base = Math.floor(r / s);
    const rem = r % s;
    const sizes: number[] = [];
    for (let i = 0; i < s; i++) {
        sizes.push(base + (i < rem ? 1 : 0));
    }
    return sizes;
}

export function createDefaultDailyProgress(now: Date = new Date()): DailyProgressV1 {
    return {
        version: DAILY_PROGRESS_SCHEMA_VERSION,
        dayKey: trainingDayKey(now),
        completedCount: 0,
    };
}

export function parseDailyProgress(raw: string, now: Date = new Date()): DailyProgressV1 {
    const defaults = createDefaultDailyProgress(now);
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed == null || typeof parsed !== 'object') {
            return defaults;
        }
        const obj = parsed as Record<string, unknown>;
        const dayKey =
            typeof obj.dayKey === 'string' && obj.dayKey.length > 0
                ? obj.dayKey
                : defaults.dayKey;
        const completedCount =
            typeof obj.completedCount === 'number' && Number.isFinite(obj.completedCount)
                ? Math.max(0, Math.floor(obj.completedCount))
                : 0;
        return {
            version: DAILY_PROGRESS_SCHEMA_VERSION,
            dayKey,
            completedCount,
        };
    } catch {
        return defaults;
    }
}

export function loadDailyProgress(
    storage?: StorageLike,
    now: Date = new Date()
): DailyProgressV1 {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return createDefaultDailyProgress(now);
    }
    const raw = resolved.getItem(DAILY_PROGRESS_STORAGE_KEY);
    if (raw == null || raw === '') {
        return createDefaultDailyProgress(now);
    }
    return parseDailyProgress(raw, now);
}

export function saveDailyProgress(data: DailyProgressV1, storage?: StorageLike): void {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return;
    }
    try {
        resolved.setItem(DAILY_PROGRESS_STORAGE_KEY, JSON.stringify(data));
    } catch {
        // localStorage quota / privacy mode — fail silently.
    }
}

/** Reset completed count when the training day has rolled over. */
export function ensureCurrentDay(
    storage?: StorageLike,
    now: Date = new Date()
): DailyProgressV1 {
    const currentKey = trainingDayKey(now);
    const loaded = loadDailyProgress(storage, now);
    if (loaded.dayKey === currentKey) {
        return loaded;
    }
    const next: DailyProgressV1 = {
        version: DAILY_PROGRESS_SCHEMA_VERSION,
        dayKey: currentKey,
        completedCount: 0,
    };
    saveDailyProgress(next, storage);
    return next;
}

/** Clamp completedCount to goal when dailyRounds shrinks. */
export function clampCompletedToGoal(
    goalRounds: number,
    storage?: StorageLike,
    now: Date = new Date()
): DailyProgressV1 {
    const goal = Math.max(0, Math.floor(goalRounds));
    const current = ensureCurrentDay(storage, now);
    if (current.completedCount <= goal) {
        return current;
    }
    const next: DailyProgressV1 = {
        ...current,
        completedCount: goal,
    };
    saveDailyProgress(next, storage);
    return next;
}

/**
 * Increment completedCount by 1 if under goalRounds; no-op at cap.
 * Always ensures current training day first.
 */
export function recordDailyRound(
    goalRounds: number,
    storage?: StorageLike,
    now: Date = new Date()
): DailyProgressV1 {
    const goal = Math.max(0, Math.floor(goalRounds));
    const current = ensureCurrentDay(storage, now);
    if (goal <= 0 || current.completedCount >= goal) {
        return current;
    }
    const next: DailyProgressV1 = {
        ...current,
        completedCount: current.completedCount + 1,
    };
    saveDailyProgress(next, storage);
    return next;
}

/** Last index (0-based) of each session group in the flat dots list. */
export function sessionEndIndices(sessionSizes: number[]): number[] {
    const ends: number[] = [];
    let offset = 0;
    for (const size of sessionSizes) {
        if (size <= 0) continue;
        ends.push(offset + size - 1);
        offset += size;
    }
    return ends;
}
