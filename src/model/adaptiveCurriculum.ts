import { clampIsiMs } from './isi';
import type { LureStageId } from './lureStages';

/** Lowest session N on the Adaptive curriculum. */
export const CURRICULUM_MIN_N = 2;
/** Highest session N on the Adaptive curriculum. */
export const CURRICULUM_MAX_N = 9;

export type AdaptiveTrack = 'fixed' | 'flexible';

export type FixedCurriculumStage =
    | 'instruction'
    | 'guided'
    | 'fade'
    | 'fixed_clean'
    | 'fixed_lure_near'
    | 'fixed_lure_both'
    | 'fixed_fast'
    | 'fixed_jitter'
    | 'fixed_mastery';

export type FlexibleCurriculumStage =
    | 'flex_base'
    | 'flex_fast'
    | 'flex_jitter'
    | 'flex_mastery';

export type CurriculumStage = FixedCurriculumStage | FlexibleCurriculumStage;

export type PointerMode = 'off' | 'full' | 'fade';

export type CurriculumBlockRole = 'instruction' | 'guided' | 'fade' | 'assessed';

export type CurriculumLadderState = {
    track: AdaptiveTrack;
    n: number;
    stage: CurriculumStage;
    lureStage: LureStageId;
    isiTier: number;
    failStreak: number;
    promoteStreak: number;
};

export type CurriculumBlockSettings = {
    n: number;
    isiMin: number;
    isiMax: number;
    variableN: boolean;
    lureStage: LureStageId;
    /** Kept for Free-play-shaped settings; Adaptive generation prefers lureStage. */
    interferenceChance: number;
    pointerMode: PointerMode;
    blockRole: CurriculumBlockRole;
    assessed: boolean;
};

const FIXED_STAGES: readonly FixedCurriculumStage[] = [
    'instruction',
    'guided',
    'fade',
    'fixed_clean',
    'fixed_lure_near',
    'fixed_lure_both',
    'fixed_fast',
    'fixed_jitter',
    'fixed_mastery',
] as const;

const FLEXIBLE_STAGES: readonly FlexibleCurriculumStage[] = [
    'flex_base',
    'flex_fast',
    'flex_jitter',
    'flex_mastery',
] as const;

/** Comfortable / fast / jitter base onsets (ms). */
const ISI_TIER_BASE_MS = [2500, 1500, 1000] as const;

export function clampCurriculumN(n: number): number {
    if (!Number.isFinite(n)) return CURRICULUM_MIN_N;
    return Math.max(CURRICULUM_MIN_N, Math.min(CURRICULUM_MAX_N, Math.floor(n)));
}

export function createDefaultCurriculumLadder(): CurriculumLadderState {
    return {
        track: 'fixed',
        n: CURRICULUM_MIN_N,
        stage: 'instruction',
        lureStage: 'A',
        isiTier: 0,
        failStreak: 0,
        promoteStreak: 0,
    };
}

export function isFixedStage(stage: CurriculumStage): stage is FixedCurriculumStage {
    return (FIXED_STAGES as readonly string[]).includes(stage);
}

export function isFlexibleStage(stage: CurriculumStage): stage is FlexibleCurriculumStage {
    return (FLEXIBLE_STAGES as readonly string[]).includes(stage);
}

export function isAssessedStage(stage: CurriculumStage): boolean {
    if (isFlexibleStage(stage)) return true;
    return (
        stage === 'fixed_clean' ||
        stage === 'fixed_lure_near' ||
        stage === 'fixed_lure_both' ||
        stage === 'fixed_fast' ||
        stage === 'fixed_jitter' ||
        stage === 'fixed_mastery'
    );
}

function isiRangeForTier(tier: number, jitter: boolean): { isiMin: number; isiMax: number } {
    const clampedTier = Math.max(0, Math.min(ISI_TIER_BASE_MS.length - 1, Math.floor(tier)));
    const base = ISI_TIER_BASE_MS[clampedTier] ?? ISI_TIER_BASE_MS[0];
    if (!jitter) {
        const fixed = clampIsiMs(base);
        return { isiMin: fixed, isiMax: fixed };
    }
    return {
        isiMin: clampIsiMs(base * 0.9),
        isiMax: clampIsiMs(base * 1.1),
    };
}

function lureForStage(stage: CurriculumStage): LureStageId {
    switch (stage) {
        case 'instruction':
        case 'guided':
        case 'fade':
        case 'fixed_clean':
            return 'A';
        case 'fixed_lure_near':
            return 'C';
        case 'fixed_lure_both':
        case 'fixed_fast':
        case 'fixed_jitter':
        case 'fixed_mastery':
        case 'flex_base':
        case 'flex_fast':
        case 'flex_jitter':
        case 'flex_mastery':
            return 'E';
        default:
            return 'A';
    }
}

function isiTierForStage(stage: CurriculumStage): { isiTier: number; jitter: boolean } {
    switch (stage) {
        case 'fixed_fast':
        case 'flex_fast':
            return { isiTier: 1, jitter: false };
        case 'fixed_jitter':
        case 'flex_jitter':
            return { isiTier: 2, jitter: true };
        case 'fixed_mastery':
        case 'flex_mastery':
            return { isiTier: 2, jitter: true };
        default:
            return { isiTier: 0, jitter: false };
    }
}

function pointerModeForStage(stage: CurriculumStage): PointerMode {
    if (stage === 'guided') return 'full';
    if (stage === 'fade') return 'fade';
    return 'off';
}

function blockRoleForStage(stage: CurriculumStage): CurriculumBlockRole {
    if (stage === 'instruction') return 'instruction';
    if (stage === 'guided') return 'guided';
    if (stage === 'fade') return 'fade';
    return 'assessed';
}

export function settingsFromCurriculum(state: CurriculumLadderState): CurriculumBlockSettings {
    const n = clampCurriculumN(state.n);
    const stage = state.stage;
    const lureStage = lureForStage(stage);
    const { isiTier, jitter } = isiTierForStage(stage);
    const { isiMin, isiMax } = isiRangeForTier(isiTier, jitter);
    const assessed = isAssessedStage(stage);
    const variableN = state.track === 'flexible';

    return {
        n,
        isiMin,
        isiMax,
        variableN,
        lureStage,
        interferenceChance: lureStage === 'A' ? 0 : 0.125,
        pointerMode: pointerModeForStage(stage),
        blockRole: blockRoleForStage(stage),
        assessed,
    };
}

function withSyncedMeta(state: CurriculumLadderState): CurriculumLadderState {
    const settings = settingsFromCurriculum(state);
    const { isiTier } = isiTierForStage(state.stage);
    return {
        ...state,
        n: clampCurriculumN(state.n),
        lureStage: settings.lureStage,
        isiTier,
    };
}

/** Advance non-assessed acquisition (instruction → guided → fade → first assessed). */
export function advanceAcquisition(state: CurriculumLadderState): CurriculumLadderState {
    if (state.track !== 'fixed') {
        return withSyncedMeta(state);
    }
    if (state.stage === 'instruction') {
        return withSyncedMeta({ ...state, stage: 'guided', failStreak: 0, promoteStreak: 0 });
    }
    if (state.stage === 'guided') {
        return withSyncedMeta({ ...state, stage: 'fade', failStreak: 0, promoteStreak: 0 });
    }
    if (state.stage === 'fade') {
        return withSyncedMeta({ ...state, stage: 'fixed_clean', failStreak: 0, promoteStreak: 0 });
    }
    return withSyncedMeta(state);
}

export function promoteCurriculumStage(state: CurriculumLadderState): CurriculumLadderState {
    if (state.track === 'fixed') {
        if (!isFixedStage(state.stage)) {
            return withSyncedMeta(state);
        }
        if (state.stage === 'fixed_mastery') {
            return withSyncedMeta({
                ...state,
                track: 'flexible',
                stage: 'flex_base',
                failStreak: 0,
                promoteStreak: 0,
            });
        }
        if (!isAssessedStage(state.stage)) {
            return advanceAcquisition(state);
        }
        const idx = FIXED_STAGES.indexOf(state.stage);
        const next = FIXED_STAGES[idx + 1];
        if (next == null) {
            return withSyncedMeta(state);
        }
        return withSyncedMeta({
            ...state,
            stage: next,
            failStreak: 0,
            promoteStreak: 0,
        });
    }

    if (!isFlexibleStage(state.stage)) {
        return withSyncedMeta(state);
    }
    if (state.stage === 'flex_mastery') {
        const nextN = clampCurriculumN(state.n + 1);
        return withSyncedMeta({
            track: 'fixed',
            n: nextN,
            stage: 'instruction',
            lureStage: 'A',
            isiTier: 0,
            failStreak: 0,
            promoteStreak: 0,
        });
    }
    const idx = FLEXIBLE_STAGES.indexOf(state.stage);
    const next = FLEXIBLE_STAGES[idx + 1];
    if (next == null) {
        return withSyncedMeta(state);
    }
    return withSyncedMeta({
        ...state,
        stage: next,
        failStreak: 0,
        promoteStreak: 0,
    });
}

export function demoteCurriculumStage(state: CurriculumLadderState): CurriculumLadderState {
    if (state.track === 'fixed' && isFixedStage(state.stage)) {
        if (!isAssessedStage(state.stage) || state.stage === 'fixed_clean') {
            return withSyncedMeta({ ...state, failStreak: 0, promoteStreak: 0 });
        }
        const idx = FIXED_STAGES.indexOf(state.stage);
        const prev = FIXED_STAGES[idx - 1];
        if (prev == null || !isAssessedStage(prev)) {
            return withSyncedMeta({
                ...state,
                stage: 'fixed_clean',
                failStreak: 0,
                promoteStreak: 0,
            });
        }
        return withSyncedMeta({
            ...state,
            stage: prev,
            failStreak: 0,
            promoteStreak: 0,
        });
    }

    if (state.track === 'flexible' && isFlexibleStage(state.stage)) {
        if (state.stage === 'flex_base') {
            return withSyncedMeta({
                ...state,
                track: 'fixed',
                stage: 'fixed_mastery',
                failStreak: 0,
                promoteStreak: 0,
            });
        }
        const idx = FLEXIBLE_STAGES.indexOf(state.stage);
        const prev = FLEXIBLE_STAGES[idx - 1];
        if (prev == null) {
            return withSyncedMeta(state);
        }
        return withSyncedMeta({
            ...state,
            stage: prev,
            failStreak: 0,
            promoteStreak: 0,
        });
    }

    return withSyncedMeta(state);
}

export function isCurriculumStage(value: string): value is CurriculumStage {
    return (
        (FIXED_STAGES as readonly string[]).includes(value) ||
        (FLEXIBLE_STAGES as readonly string[]).includes(value)
    );
}
