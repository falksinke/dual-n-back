import {
    decideCurriculumProgression,
    type CurriculumProgressionDecision,
} from '../model/adaptiveController';
import {
    settingsFromCurriculum,
    type CurriculumBlockRole,
    type CurriculumLadderState,
    type PointerMode,
} from '../model/adaptiveCurriculum';
import {
    decideProgression,
    settingsFromLevel,
    type ProgressionDecision,
} from '../model/adaptiveLevels';
import type { LureStageId } from '../model/lureStages';
import type {
    CurriculumModeLadderSnapshot,
    MatchLadderSnapshot,
} from '../model/ladderPersistence';
import type { FreePlayProgressionDecision } from '../model/freePlayAutoProgress';
import type { BlockSdtReport } from '../model/sdtMetrics';

export type AdaptivePhase = 'idle' | 'playing' | 'interstitial' | 'summary';

/** Playable block roles (teach stages are in-session; assessed is lure/speed path). */
export type BlockRole = CurriculumBlockRole | 'match' | 'free';

export type LadderControllerAction =
    | CurriculumProgressionDecision
    | ProgressionDecision
    | FreePlayProgressionDecision;

export interface AdaptiveSessionState {
    phase: AdaptivePhase;
    blocksDone: number;
    lastAction: LadderControllerAction | null;
    pendingContinue: boolean;
}

export interface AdaptiveSessionInit {
    /** Reserved for tests; unused by the simplified one-block loop. */
    adaptiveTarget?: number;
}

export interface BlockConfig {
    n: number;
    isiMin: number;
    isiMax: number;
    interferenceChance: number;
    variableN: boolean;
    trials: number;
    blockRole: BlockRole;
    /** Cyclic path only — omit on Match% Adaptive so Game uses interferenceChance. */
    lureStage?: LureStageId;
    pointerMode: PointerMode;
    curriculumStage?: CurriculumLadderState['stage'];
    teachReveals?: boolean;
    teachPacedOps?: boolean;
}

export function createInitialAdaptiveSession(
    _init: AdaptiveSessionInit = {}
): AdaptiveSessionState {
    return {
        phase: 'playing',
        blocksDone: 0,
        lastAction: null,
        pendingContinue: false,
    };
}

export function blockRoleFromPhase(phase: AdaptivePhase): BlockRole | null {
    switch (phase) {
        case 'playing':
            return 'assessed';
        default:
            return null;
    }
}

export function shouldStartNextBlock(session: AdaptiveSessionState): boolean {
    return session.pendingContinue === true && session.phase === 'interstitial';
}

export function nextCyclicBlockConfig(
    _session: AdaptiveSessionState,
    ladder: CurriculumModeLadderSnapshot,
    _mode: string,
    trials: number
): BlockConfig {
    const level = settingsFromCurriculum(ladder);
    return {
        n: level.n,
        isiMin: level.isiMin,
        isiMax: level.isiMax,
        interferenceChance: level.interferenceChance,
        variableN: level.variableN,
        trials,
        blockRole: level.blockRole,
        lureStage: level.lureStage,
        pointerMode: level.pointerMode,
        curriculumStage: ladder.stage,
        teachReveals: level.teachReveals,
        teachPacedOps: level.teachPacedOps,
    };
}

/** @deprecated Prefer nextCyclicBlockConfig. */
export function nextBlockConfig(
    session: AdaptiveSessionState,
    ladder: CurriculumModeLadderSnapshot,
    mode: string,
    trials: number
): BlockConfig {
    return nextCyclicBlockConfig(session, ladder, mode, trials);
}

export function nextMatchBlockConfig(
    ladder: MatchLadderSnapshot,
    trials: number
): BlockConfig {
    const level = settingsFromLevel(ladder.levelIndex);
    return {
        n: level.n,
        isiMin: level.isiMin,
        isiMax: level.isiMax,
        interferenceChance: level.interferenceChance,
        variableN: level.variableN,
        trials,
        blockRole: 'match',
        pointerMode: 'off',
    };
}

export interface CyclicBlockEndResult {
    session: AdaptiveSessionState;
    ladder: CurriculumModeLadderSnapshot;
    action: CurriculumProgressionDecision;
    blockRole: BlockRole;
    sessionComplete: boolean;
}

export interface MatchBlockEndResult {
    session: AdaptiveSessionState;
    ladder: MatchLadderSnapshot;
    action: ProgressionDecision;
    blockRole: BlockRole;
    sessionComplete: boolean;
}

export function processCyclicBlockEnd(
    session: AdaptiveSessionState,
    ladder: CurriculumModeLadderSnapshot,
    sdt: BlockSdtReport | null,
    matchPct = 0,
    blockRole?: CurriculumBlockRole
): CyclicBlockEndResult {
    const role = blockRole ?? settingsFromCurriculum(ladder).blockRole;
    const action = decideCurriculumProgression({
        ladder,
        blockRole: role,
        sdt,
        matchPct,
    });

    const nextSession: AdaptiveSessionState = {
        phase: 'interstitial',
        blocksDone: session.blocksDone + 1,
        lastAction: action,
        pendingContinue: true,
    };

    return {
        session: nextSession,
        ladder: action.ladder,
        action,
        blockRole: role,
        sessionComplete: false,
    };
}

/** @deprecated Prefer processCyclicBlockEnd. */
export function processAdaptiveBlockEnd(
    session: AdaptiveSessionState,
    ladder: CurriculumModeLadderSnapshot,
    sdt: BlockSdtReport | null,
    matchPct = 0,
    blockRole?: CurriculumBlockRole
): CyclicBlockEndResult {
    return processCyclicBlockEnd(session, ladder, sdt, matchPct, blockRole);
}

export function processMatchBlockEnd(
    session: AdaptiveSessionState,
    ladder: MatchLadderSnapshot,
    matchPct: number
): MatchBlockEndResult {
    const action = decideProgression({
        levelIndex: ladder.levelIndex,
        failStreak: ladder.failStreak,
        matchPct,
    });

    const nextSession: AdaptiveSessionState = {
        phase: 'interstitial',
        blocksDone: session.blocksDone + 1,
        lastAction: action,
        pendingContinue: true,
    };

    return {
        session: nextSession,
        ladder: {
            levelIndex: action.levelIndex,
            failStreak: action.failStreak,
        },
        action,
        blockRole: 'match',
        sessionComplete: false,
    };
}

export function playingPhaseForBlockRole(_blockRole: BlockRole): AdaptivePhase {
    return 'playing';
}
