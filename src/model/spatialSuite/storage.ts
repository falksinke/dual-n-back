import { initialDifficulty } from './engine';
import { SHIFT_RULES, type ShiftRule } from './games/shift';
import type { BlockLog, Difficulty, GameId, TrackId, TrialLog } from './types';

export const STORAGE_KEY = 'spatial-suite-v1';
const MAX_TRIALS = 20000;
/** The untrained Shift rule is offered as a generalisation check this often. */
export const HOLDOUT_INTERVAL_DAYS = 28;

export const TRACKS: TrackId[] = ['drift', 'wayfinder', 'pattern-shape', 'pattern-relation', 'shift', 'relay'];

export interface SuiteState {
    version: 1;
    tracks: Record<TrackId, Difficulty>;
    blocks: BlockLog[];
    trials: TrialLog[];
    lastSessionMix: GameId[] | null;
    lastShiftDeck: ShiftRule[] | null;
    /** Chosen once per install and never trained. */
    holdoutRule: ShiftRule;
    lastHoldoutAt: string | null;
}

export function createState(rng: () => number = Math.random): SuiteState {
    return {
        version: 1,
        tracks: Object.fromEntries(TRACKS.map((track) => [track, initialDifficulty(track)])) as Record<TrackId, Difficulty>,
        blocks: [],
        trials: [],
        lastSessionMix: null,
        lastShiftDeck: null,
        holdoutRule: SHIFT_RULES[Math.floor(rng() * SHIFT_RULES.length)],
        lastHoldoutAt: null,
    };
}

export function loadState(storage: Storage | undefined = globalThis.localStorage): SuiteState {
    try {
        const raw = storage?.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<SuiteState>;
            if (parsed.version === 1 && parsed.tracks && parsed.holdoutRule) {
                const fresh = createState();
                return { ...fresh, ...parsed, tracks: { ...fresh.tracks, ...parsed.tracks } } as SuiteState;
            }
        }
    } catch {
        // Unreadable or blocked storage falls through to a fresh state.
    }
    const state = createState();
    saveState(state, storage);
    return state;
}

export function saveState(state: SuiteState, storage: Storage | undefined = globalThis.localStorage): void {
    try {
        const trimmed = state.trials.length > MAX_TRIALS ? { ...state, trials: state.trials.slice(-MAX_TRIALS) } : state;
        storage?.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
        // Quota or private mode: training continues, the log just isn't kept.
    }
}

export function holdoutDue(state: SuiteState, now: Date = new Date()): boolean {
    if (!state.lastHoldoutAt) return true;
    const elapsed = now.getTime() - new Date(state.lastHoldoutAt).getTime();
    return elapsed >= HOLDOUT_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
}
