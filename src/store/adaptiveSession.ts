import {
    ADAPTIVE_THRESHOLDS,
    canDecide,
    ControllerAction,
    decideAdaptive,
    LadderState,
} from '../model/adaptiveController';
import { ModeLadderSnapshot } from '../model/ladderPersistence';
import { getModalitiesForMode, ModalityId, ModeId } from '../model/modalities';
import {
    LURE_STAGES,
    LureStageId,
    nextLureStage,
    prevLureStage,
    reduceLureStageAfterNUp,
} from '../model/lureStages';
import { BlockSdtReport } from '../model/sdtMetrics';

export type AdaptivePhase =
    | 'idle'
    | 'anchor-open'
    | 'adaptive'
    | 'remediation'
    | 'anchor-close'
    | 'interstitial'
    | 'summary';

export type BlockRole = 'anchor-open' | 'adaptive' | 'remediation' | 'anchor-close' | 'free';

export const OPEN_ANCHORS = 2;
export const DEFAULT_ADAPTIVE_BLOCKS = 8;
export const CLOSE_ANCHORS = 1;
export const ANCHOR_LURE_STAGE: LureStageId = 'A';

export interface AdaptiveSessionState {
    phase: AdaptivePhase;
    openAnchorsDone: number;
    adaptiveBlocksDone: number;
    adaptiveTarget: number;
    closeAnchorDone: boolean;
    remediationModality: ModalityId | null;
    remediatedThisSession: ModalityId[];
    adaptiveReports: BlockSdtReport[];
    previousWindowPromoted: boolean;
    postIsiTighten: boolean;
    lastAction: ControllerAction | null;
    pendingContinue: boolean;
}

export interface AdaptiveSessionInit {
    adaptiveTarget?: number;
}

export interface BlockConfig {
    n: number;
    lureStage: LureStageId;
    isiTier: number;
    trials: number;
    variableN: false;
    blockRole: BlockRole;
    modalities?: ModalityId[];
}

export function createInitialAdaptiveSession(
    init: AdaptiveSessionInit = {}
): AdaptiveSessionState {
    return {
        phase: 'anchor-open',
        openAnchorsDone: 0,
        adaptiveBlocksDone: 0,
        adaptiveTarget: init.adaptiveTarget ?? DEFAULT_ADAPTIVE_BLOCKS,
        closeAnchorDone: false,
        remediationModality: null,
        remediatedThisSession: [],
        adaptiveReports: [],
        previousWindowPromoted: false,
        postIsiTighten: false,
        lastAction: null,
        pendingContinue: false,
    };
}

export function blockRoleFromPhase(phase: AdaptivePhase): BlockRole | null {
    switch (phase) {
        case 'anchor-open':
            return 'anchor-open';
        case 'adaptive':
            return 'adaptive';
        case 'remediation':
            return 'remediation';
        case 'anchor-close':
            return 'anchor-close';
        default:
            return null;
    }
}

function remediationLureStage(current: LureStageId): LureStageId {
    const prev = prevLureStage(current);
    if (prev == null) return ANCHOR_LURE_STAGE;
    const aIdx = LURE_STAGES.indexOf(ANCHOR_LURE_STAGE);
    const prevIdx = LURE_STAGES.indexOf(prev);
    return LURE_STAGES[Math.max(aIdx, prevIdx)];
}

function remediationModalities(weak: ModalityId, mode: ModeId): ModalityId[] {
    const modeModalities = getModalitiesForMode(mode);
    const pair: ModalityId[] =
        weak === 'position' ? [weak, 'audio'] : [weak, 'position'];
    return pair.filter((modality) => modeModalities.includes(modality));
}

function pendingRemediation(session: AdaptiveSessionState): boolean {
    return (
        session.remediationModality != null &&
        !session.remediatedThisSession.includes(session.remediationModality)
    );
}

export function shouldStartNextBlock(session: AdaptiveSessionState): boolean {
    if (session.phase === 'summary' || session.closeAnchorDone) {
        return false;
    }
    if (pendingRemediation(session)) {
        return true;
    }
    if (session.openAnchorsDone < OPEN_ANCHORS) {
        return true;
    }
    if (session.adaptiveBlocksDone < session.adaptiveTarget) {
        return true;
    }
    return !session.closeAnchorDone;
}

export function nextBlockConfig(
    session: AdaptiveSessionState,
    ladder: ModeLadderSnapshot,
    mode: ModeId,
    trials: number
): BlockConfig {
    if (pendingRemediation(session)) {
        const weak = session.remediationModality!;
        return {
            n: ladder.n,
            lureStage: remediationLureStage(ladder.lureStage),
            isiTier: ladder.isiTier,
            trials,
            variableN: false,
            blockRole: 'remediation',
            modalities: remediationModalities(weak, mode),
        };
    }

    if (session.openAnchorsDone < OPEN_ANCHORS) {
        return {
            n: ladder.n,
            lureStage: ANCHOR_LURE_STAGE,
            isiTier: ladder.isiTier,
            trials,
            variableN: false,
            blockRole: 'anchor-open',
        };
    }

    if (session.adaptiveBlocksDone < session.adaptiveTarget) {
        return {
            n: ladder.n,
            lureStage: ladder.lureStage,
            isiTier: ladder.isiTier,
            trials,
            variableN: false,
            blockRole: 'adaptive',
        };
    }

    return {
        n: ladder.n,
        lureStage: ANCHOR_LURE_STAGE,
        isiTier: ladder.isiTier,
        trials,
        variableN: false,
        blockRole: 'anchor-close',
    };
}

export function applyControllerAction(
    ladder: LadderState,
    action: ControllerAction
): LadderState {
    if (action.action === 'hold' || action.action === 'remediate') {
        return ladder;
    }

    switch (action.action) {
        case 'lureUp': {
            const next = nextLureStage(ladder.lureStage);
            return next != null ? { ...ladder, lureStage: next } : ladder;
        }
        case 'lureDown': {
            const prev = prevLureStage(ladder.lureStage);
            return prev != null ? { ...ladder, lureStage: prev } : ladder;
        }
        case 'nUp':
            return {
                ...ladder,
                n: ladder.n + 1,
                lureStage: reduceLureStageAfterNUp(ladder.lureStage),
            };
        case 'nDown':
            return {
                ...ladder,
                n: Math.max(2, ladder.n - 1),
                lureStage: reduceLureStageAfterNUp(ladder.lureStage, 2),
            };
        case 'isiTighten':
            return {
                ...ladder,
                isiTier: Math.min(
                    ADAPTIVE_THRESHOLDS.maxIsiTier,
                    ladder.isiTier + 1
                ),
            };
        case 'isiRevert':
            return { ...ladder, isiTier: Math.max(0, ladder.isiTier - 1) };
    }
}

function windowMetPromotionCriteria(
    window: BlockSdtReport[],
    ladder: LadderState,
    modalities: ModalityId[]
): boolean {
    if (!canDecide(window)) return false;
    const withPrior = decideAdaptive(window, ladder, modalities, {
        previousWindowPromoted: true,
    });
    return withPrior.action === 'lureUp' || withPrior.action === 'nUp';
}

export interface AdaptiveBlockEndResult {
    session: AdaptiveSessionState;
    ladder: LadderState;
    action: ControllerAction | null;
    blockRole: BlockRole;
    sessionComplete: boolean;
}

export function processAdaptiveBlockEnd(
    session: AdaptiveSessionState,
    ladder: LadderState,
    mode: ModeId,
    blockRole: BlockRole,
    sdt: BlockSdtReport | null
): AdaptiveBlockEndResult {
    const modalities = getModalitiesForMode(mode);
    let nextSession = { ...session };
    let nextLadder = { ...ladder };
    let action: ControllerAction | null = null;

    if (blockRole === 'adaptive') {
        nextSession = {
            ...nextSession,
            adaptiveBlocksDone: nextSession.adaptiveBlocksDone + 1,
        };
        if (sdt != null) {
            nextSession = {
                ...nextSession,
                adaptiveReports: [...nextSession.adaptiveReports, sdt],
            };
        }

        if (canDecide(nextSession.adaptiveReports)) {
            action = decideAdaptive(nextSession.adaptiveReports, nextLadder, modalities, {
                previousWindowPromoted: nextSession.previousWindowPromoted,
                postIsiTighten: nextSession.postIsiTighten,
            });

            if (
                action.action === 'remediate' &&
                nextSession.remediatedThisSession.includes(action.modality)
            ) {
                action = {
                    action: 'hold',
                    reason: 'remediation already used for this modality this session',
                };
            }

            if (action.action === 'remediate') {
                nextSession = {
                    ...nextSession,
                    remediationModality: action.modality,
                };
            } else if (action.action !== 'hold') {
                nextLadder = applyControllerAction(nextLadder, action);
            }

            if (action.action === 'isiTighten') {
                nextSession = { ...nextSession, postIsiTighten: true };
            } else if (action.action === 'isiRevert') {
                nextSession = { ...nextSession, postIsiTighten: false };
            }

            if (action.action === 'lureUp' || action.action === 'nUp') {
                nextSession = { ...nextSession, previousWindowPromoted: false };
            } else {
                nextSession = {
                    ...nextSession,
                    previousWindowPromoted: windowMetPromotionCriteria(
                        nextSession.adaptiveReports,
                        nextLadder,
                        modalities
                    ),
                };
            }
        }
    } else if (blockRole === 'anchor-open') {
        nextSession = {
            ...nextSession,
            openAnchorsDone: nextSession.openAnchorsDone + 1,
        };
    } else if (blockRole === 'remediation' && nextSession.remediationModality != null) {
        nextSession = {
            ...nextSession,
            remediatedThisSession: [
                ...nextSession.remediatedThisSession,
                nextSession.remediationModality,
            ],
            remediationModality: null,
        };
    } else if (blockRole === 'anchor-close') {
        nextSession = { ...nextSession, closeAnchorDone: true };
    }

    nextSession = { ...nextSession, lastAction: action };

    const sessionComplete = blockRole === 'anchor-close';
    if (sessionComplete) {
        nextSession = {
            ...nextSession,
            phase: 'summary',
            pendingContinue: false,
        };
    } else {
        nextSession = {
            ...nextSession,
            phase: 'interstitial',
            pendingContinue: true,
        };
    }

    return {
        session: nextSession,
        ladder: nextLadder,
        action,
        blockRole,
        sessionComplete,
    };
}

export function playingPhaseForBlockRole(blockRole: BlockRole): AdaptivePhase {
    switch (blockRole) {
        case 'anchor-open':
            return 'anchor-open';
        case 'adaptive':
            return 'adaptive';
        case 'remediation':
            return 'remediation';
        case 'anchor-close':
            return 'anchor-close';
        default:
            return 'adaptive';
    }
}
