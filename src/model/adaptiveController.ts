import {
    advanceAcquisition,
    demoteCurriculumStage,
    isAssessedStage,
    promoteCurriculumStage,
    type CurriculumBlockRole,
    type CurriculumLadderState,
} from './adaptiveCurriculum';
import type { BlockSdtReport, ModalitySdtReport } from './sdtMetrics';

/** Median clean d′ required to promote an assessed stage. */
export const PROMOTE_MEDIAN_CLEAN_DPRIME = 2.0;
/** Every modality must clear this clean d′ floor. */
export const PROMOTE_FLOOR_CLEAN_DPRIME = 1.4;
/** Median lure d′ floor when lure samples exist. */
export const PROMOTE_MEDIAN_LURE_DPRIME = 1.2;
/** Max mean lure FA rate across modalities with lure samples. */
export const PROMOTE_MAX_LURE_FA_RATE = 0.35;
/** |criterion| above this → Hold (extreme bias). */
export const EXTREME_CRITERION = 1.5;
/** Min targets per modality before assessed promote is allowed. */
export const MIN_TARGETS_PER_MODALITY = 3;
/** Min lure non-targets when lure stage expects lures (lureSampleOk modalities). */
export const MIN_LURE_NON_TARGETS = 2;
/** Consecutive assessed fails before demoting one stage. */
export const FAILS_TO_DEMOTE_STAGE = 3;

export type CurriculumProgressionAction =
    | 'promote'
    | 'demote'
    | 'hold'
    | 'advance_acquisition';

export type CurriculumProgressionDecision = {
    action: CurriculumProgressionAction;
    ladder: CurriculumLadderState;
    reason: string;
};

function modalities(report: BlockSdtReport): ModalitySdtReport[] {
    return report.modalities
        .map((id) => report.byModality[id])
        .filter((m): m is ModalitySdtReport => m != null);
}

function median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid]!;
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function mean(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function samplesOk(mods: ModalitySdtReport[], expectsLures: boolean): boolean {
    if (mods.length === 0) return false;
    for (const m of mods) {
        if (m.targetCount < MIN_TARGETS_PER_MODALITY) return false;
    }
    if (!expectsLures) return true;
    const lureMods = mods.filter((m) => m.lureSampleOk);
    if (lureMods.length === 0) return false;
    return lureMods.every((m) => m.lureNonTargetCount >= MIN_LURE_NON_TARGETS);
}

function expectsLures(ladder: CurriculumLadderState): boolean {
    return ladder.lureStage !== 'A';
}

function modalityCollapse(mods: ModalitySdtReport[]): boolean {
    if (mods.length < 2) return false;
    const cleans = mods.map((m) => m.clean.dPrime);
    const med = median(cleans);
    if (med == null) return false;
    const min = Math.min(...cleans);
    return med >= PROMOTE_FLOOR_CLEAN_DPRIME && min < PROMOTE_FLOOR_CLEAN_DPRIME;
}

function extremeCriterion(mods: ModalitySdtReport[]): boolean {
    return mods.some((m) => Math.abs(m.all.criterion) > EXTREME_CRITERION);
}

function gatesPass(mods: ModalitySdtReport[], expectsLure: boolean): boolean {
    const cleanDs = mods.map((m) => m.clean.dPrime);
    const medClean = median(cleanDs);
    const minClean = Math.min(...cleanDs);
    if (medClean == null || medClean < PROMOTE_MEDIAN_CLEAN_DPRIME) return false;
    if (minClean < PROMOTE_FLOOR_CLEAN_DPRIME) return false;
    if (extremeCriterion(mods)) return false;

    if (!expectsLure) return true;

    const lureMods = mods.filter((m) => m.lureSampleOk);
    if (lureMods.length === 0) return false;
    const medLure = median(lureMods.map((m) => m.lure.dPrime));
    const meanLureFa = mean(lureMods.map((m) => m.lure.falseAlarmRate));
    if (medLure == null || medLure < PROMOTE_MEDIAN_LURE_DPRIME) return false;
    if (meanLureFa == null || meanLureFa > PROMOTE_MAX_LURE_FA_RATE) return false;
    return true;
}

function hold(
    ladder: CurriculumLadderState,
    failStreak: number,
    reason: string
): CurriculumProgressionDecision {
    return {
        action: 'hold',
        ladder: { ...ladder, failStreak, promoteStreak: 0 },
        reason,
    };
}

/**
 * Decide curriculum progression from block role + stratified SDT.
 * Match % is display-only and must not gate promotion.
 */
export function decideCurriculumProgression(input: {
    ladder: CurriculumLadderState;
    blockRole: CurriculumBlockRole;
    sdt: BlockSdtReport | null | undefined;
    matchPct?: number;
}): CurriculumProgressionDecision {
    const { ladder, blockRole, sdt } = input;

    if (blockRole === 'instruction' || blockRole === 'guided' || blockRole === 'fade') {
        const next = advanceAcquisition(ladder);
        return {
            action: 'advance_acquisition',
            ladder: next,
            reason: `Acquisition ${blockRole} → ${next.stage}`,
        };
    }

    if (!isAssessedStage(ladder.stage)) {
        const next = advanceAcquisition(ladder);
        return {
            action: 'advance_acquisition',
            ladder: next,
            reason: `Non-assessed stage ${ladder.stage} → ${next.stage}`,
        };
    }

    const mods = sdt != null ? modalities(sdt) : [];
    const lureExpected = expectsLures(ladder);

    if (!samplesOk(mods, lureExpected)) {
        return hold(ladder, ladder.failStreak, 'Sparse SDT samples — hold');
    }

    if (modalityCollapse(mods)) {
        const nextFail = ladder.failStreak + 1;
        if (nextFail >= FAILS_TO_DEMOTE_STAGE) {
            const demoted = demoteCurriculumStage(ladder);
            return {
                action: 'demote',
                ladder: demoted,
                reason: 'Modality collapse — demote stage',
            };
        }
        return hold(ladder, nextFail, 'Modality collapse — hold');
    }

    if (gatesPass(mods, lureExpected)) {
        const next = promoteCurriculumStage(ladder);
        return {
            action: 'promote',
            ladder: { ...next, failStreak: 0, promoteStreak: ladder.promoteStreak + 1 },
            reason: 'Clean/lure gates met — promote stage',
        };
    }

    // Lure-specific failure while clean OK → demote preference via fail streak
    const cleanDs = mods.map((m) => m.clean.dPrime);
    const medClean = median(cleanDs);
    const minClean = Math.min(...cleanDs);
    const cleanOk =
        medClean != null &&
        medClean >= PROMOTE_FLOOR_CLEAN_DPRIME &&
        minClean >= PROMOTE_FLOOR_CLEAN_DPRIME * 0.9;

    const nextFail = ladder.failStreak + 1;
    if (nextFail >= FAILS_TO_DEMOTE_STAGE) {
        const demoted = demoteCurriculumStage(ladder);
        return {
            action: 'demote',
            ladder: demoted,
            reason: cleanOk
                ? 'Repeated lure/gate failure — demote stage'
                : 'Repeated assessed failure — demote stage',
        };
    }

    return hold(
        ladder,
        nextFail,
        cleanOk
            ? `Lure/gate miss — fail ${nextFail}/${FAILS_TO_DEMOTE_STAGE}`
            : `Assessed gates not met — fail ${nextFail}/${FAILS_TO_DEMOTE_STAGE}`
    );
}

/** @deprecated Match-% Adaptive path — use decideCurriculumProgression. */
export {
    decideProgression as decideAdaptive,
    type ProgressionAction,
    type ProgressionDecision,
    type ProgressionDecision as ControllerAction,
} from './adaptiveLevels';
