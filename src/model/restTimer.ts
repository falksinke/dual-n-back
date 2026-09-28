export const REST_MINUTE_OPTIONS = [0, 1, 2] as const;
export type RestMinutes = (typeof REST_MINUTE_OPTIONS)[number];

export interface RestTimerState {
    minutes: RestMinutes;
    endsAtMs: number | null;
}

export const REST_MINUTES_STORAGE_KEY = 'nback-rest-minutes';

interface RestStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

function resolveRestStorage(storage?: RestStorage): RestStorage | null {
    if (storage != null) return storage;
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
}

export function clampRestMinutes(value: unknown): RestMinutes {
    return REST_MINUTE_OPTIONS.includes(value as RestMinutes) ? (value as RestMinutes) : 0;
}

export function loadRestMinutes(storage?: RestStorage): RestMinutes {
    const resolved = resolveRestStorage(storage);
    if (resolved == null) return 0;
    try {
        return clampRestMinutes(Number(resolved.getItem(REST_MINUTES_STORAGE_KEY)));
    } catch {
        return 0;
    }
}

export function saveRestMinutes(
    minutes: RestMinutes,
    storage?: RestStorage
): void {
    const resolved = resolveRestStorage(storage);
    if (resolved == null) return;
    try {
        resolved.setItem(REST_MINUTES_STORAGE_KEY, String(minutes));
    } catch {
        // Storage can be unavailable in privacy mode; the current session still works.
    }
}

export function idleRestTimer(minutes: RestMinutes): RestTimerState {
    return { minutes, endsAtMs: null };
}

export function startRestTimer(minutes: RestMinutes, nowMs = Date.now()): RestTimerState {
    return {
        minutes,
        endsAtMs: minutes === 0 ? null : nowMs + minutes * 60_000,
    };
}

export function remainingRestSeconds(timer: RestTimerState, nowMs = Date.now()): number {
    if (timer.endsAtMs == null) return 0;
    return Math.max(0, Math.ceil((timer.endsAtMs - nowMs) / 1000));
}
