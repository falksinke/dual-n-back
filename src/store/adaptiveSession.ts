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
import type { LureStageId } from '../model/lureStages';
import type { ModeLadderSnapshot } from '../model/ladderPersistence';
import type { BlockSdtReport } from '../model/sdtMetrics';

export type AdaptivePhase = 'idle' | 'playing' | 'interstitial' | 'summary';

/** Playable Adaptive block roles (instruction is UI-only before countdown). */
export type BlockRole = CurriculumBlockRole | 'free';

export interface AdaptiveSessionState {
    phase: AdaptivePhase;
    blocksDone: number;
    lastAction: CurriculumProgressionDecision | null;
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
    lureStage: LureStageId;
    pointerMode: PointerMode;
    curriculumStage: CurriculumLadderState['stage'];
}

/** Instruction is a pre-play screen; first playable stage is guided. */
function playableLadder(ladder: ModeLadderSnapshot): ModeLadderSnapshot {
    if (ladder.stage === 'instruction') {
        return { ...ladder, stage: 'guided' };
    }
    return ladder;
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

export function nextBlockConfig(
    _session: AdaptiveSessionState,
    ladder: ModeLadderSnapshot,
    _mode: string,
    trials: number
): BlockConfig {
    const playable = playableLadder(ladder);
    const level = settingsFromCurriculum(playable);
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
        curriculumStage: playable.stage,
    };
}

export interface AdaptiveBlockEndResult {
    session: AdaptiveSessionState;
    ladder: ModeLadderSnapshot;
    action: CurriculumProgressionDecision;
    blockRole: BlockRole;
    sessionComplete: boolean;
}

export function processAdaptiveBlockEnd(
    session: AdaptiveSessionState,
    ladder: ModeLadderSnapshot,
    sdt: BlockSdtReport | null,
    matchPct = 0,
    blockRole?: CurriculumBlockRole
): AdaptiveBlockEndResult {
    const playable = playableLadder(ladder);
    const role = blockRole ?? settingsFromCurriculum(playable).blockRole;
    const action = decideCurriculumProgression({
        ladder: playable,
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

export function playingPhaseForBlockRole(_blockRole: BlockRole): AdaptivePhase {
    return 'playing';
}
