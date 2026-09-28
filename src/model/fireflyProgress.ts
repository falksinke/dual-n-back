import { INTERFERENCE_CHANCE_OPTIONS } from './interference';

export const FIREFLY_PROGRESS_STORAGE_KEY = 'firefly-post-progress-v1';
const INITIAL_ITEM_MS = 1000;
const MIN_ITEM_MS = 300;
export const MAX_FIREFLY_ISI_MS = 5000;
export const MIN_FIREFLY_ISI_MS = MIN_ITEM_MS;

export interface FireflySettings {
    length: number;
    middleWindowEnabled: boolean;
    endback: boolean;
    hiddenCount: number;
    hiddenPlacement: 'first' | 'random';
    increaseSpeed: boolean;
    isiMs: number;
    interference: number;
    mathEnabled: boolean;
    newSequenceOnSuccess: boolean;
}

export interface FireflyRoute {
    streak: number;
    sequence: number[];
    hiddenPositions: number[];
    history: number[];
    itemMs: number;
}

export interface FireflyProgressV1 {
    version: 1;
    updatedAt: string | null;
    settings: FireflySettings;
    route: FireflyRoute;
}

export function createDefaultFireflyProgress(): FireflyProgressV1 {
    return {
        version: 1,
        updatedAt: null,
        settings: {
            length: 5,
            middleWindowEnabled: true,
            endback: false,
            hiddenCount: 1,
            hiddenPlacement: 'first',
            increaseSpeed: true,
            isiMs: INITIAL_ITEM_MS,
            interference: 0,
            mathEnabled: false,
            newSequenceOnSuccess: true,
        },
        route: createEmptyFireflyRoute(INITIAL_ITEM_MS),
    };
}

export function createEmptyFireflyRoute(isiMs: number): FireflyRoute {
    return { streak: 0, sequence: [], hiddenPositions: [], history: [], itemMs: isiMs };
}

function record(value: unknown): Record<string, unknown> {
    return value != null && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown> : {};
}

function booleanOr(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function integerBetween(value: unknown, min: number, max: number, fallback: number): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
        ? value : fallback;
}

function isCell(value: unknown, middleWindowEnabled: boolean): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 8
        && (middleWindowEnabled || value !== 4);
}

export function normalizeFireflyProgress(raw: unknown): FireflyProgressV1 {
    const defaults = createDefaultFireflyProgress();
    const source = record(raw);
    const rawSettings = record(source.settings);
    const length = integerBetween(rawSettings.length, 1, 9, defaults.settings.length);
    const middleWindowEnabled = booleanOr(rawSettings.middleWindowEnabled, true);
    const settings: FireflySettings = {
        length,
        middleWindowEnabled,
        endback: booleanOr(rawSettings.endback, false),
        hiddenCount: integerBetween(rawSettings.hiddenCount, 0, length - 1, Math.min(1, length - 1)),
        hiddenPlacement: rawSettings.hiddenPlacement === 'random' ? 'random' : 'first',
        increaseSpeed: booleanOr(rawSettings.increaseSpeed, true),
        isiMs: integerBetween(rawSettings.isiMs, MIN_ITEM_MS, MAX_FIREFLY_ISI_MS, INITIAL_ITEM_MS),
        interference: typeof rawSettings.interference === 'number'
            && INTERFERENCE_CHANCE_OPTIONS.some((value) => value === rawSettings.interference)
            ? rawSettings.interference : 0,
        mathEnabled: booleanOr(rawSettings.mathEnabled, false),
        newSequenceOnSuccess: booleanOr(rawSettings.newSequenceOnSuccess, true),
    };
    const rawRoute = record(source.route);
    const sequence = Array.isArray(rawRoute.sequence) && rawRoute.sequence.length === length
        && rawRoute.sequence.every((cell) => isCell(cell, middleWindowEnabled))
        ? rawRoute.sequence as number[] : [];
    const hiddenPositions = sequence.length > 0 && settings.endback && Array.isArray(rawRoute.hiddenPositions)
        ? [...new Set(rawRoute.hiddenPositions.filter((index): index is number =>
            typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < length - 1))]
            .slice(0, settings.hiddenCount)
        : [];
    const history = Array.isArray(rawRoute.history)
        ? rawRoute.history.filter((cell): cell is number => isCell(cell, middleWindowEnabled)).slice(-2 * length)
        : [];
    const route: FireflyRoute = {
        streak: integerBetween(rawRoute.streak, 0, Number.MAX_SAFE_INTEGER, 0),
        sequence,
        hiddenPositions,
        history,
        itemMs: integerBetween(rawRoute.itemMs, MIN_ITEM_MS, MAX_FIREFLY_ISI_MS, settings.isiMs),
    };
    const updatedAt = typeof source.updatedAt === 'string' && Number.isFinite(Date.parse(source.updatedAt))
        ? source.updatedAt : null;
    return { version: 1, updatedAt, settings, route };
}

function storageKey(profile: string | null): string {
    return profile == null
        ? `${FIREFLY_PROGRESS_STORAGE_KEY}:anonymous`
        : `${FIREFLY_PROGRESS_STORAGE_KEY}:profile:${encodeURIComponent(profile.toLocaleLowerCase('en-US'))}`;
}

export function loadFireflyProgress(profile: string | null, storage?: Storage): FireflyProgressV1 {
    try {
        const source = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
        const raw = source?.getItem(storageKey(profile));
        return raw == null ? createDefaultFireflyProgress() : normalizeFireflyProgress(JSON.parse(raw));
    } catch {
        return createDefaultFireflyProgress();
    }
}

type Listener = (profile: string | null, progress: FireflyProgressV1) => void;
const listeners = new Set<Listener>();

export function subscribeFireflyProgress(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function saveFireflyProgress(
    profile: string | null,
    progress: FireflyProgressV1,
    notify = false,
    storage?: Storage,
): void {
    try {
        const source = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
        source?.setItem(storageKey(profile), JSON.stringify(progress));
    } catch {
        // Storage can be blocked or full; the current route still works in memory.
    }
    if (notify) for (const listener of listeners) listener(profile, progress);
}

/** Keep the newer Firefly checkpoint when another N-back field triggers a sync. */
export function newerFireflyProgress(local: FireflyProgressV1, remote: FireflyProgressV1): FireflyProgressV1 {
    if (local.updatedAt == null) return remote;
    if (remote.updatedAt == null) return local;
    return Date.parse(local.updatedAt) > Date.parse(remote.updatedAt) ? local : remote;
}
