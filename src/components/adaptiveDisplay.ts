import type { CurriculumProgressionDecision } from '../model/adaptiveController';
import {
    settingsFromCurriculum,
    type CurriculumLadderState,
} from '../model/adaptiveCurriculum';
import { FAILS_TO_DEMOTE_STAGE } from '../model/adaptiveController';
import {
    FAILS_TO_DEMOTE,
    PROMOTE_MATCH_PCT,
    settingsFromLevel,
    stepWithinN,
    type ProgressionDecision,
} from '../model/adaptiveLevels';
import type { MatchLadderSnapshot } from '../model/ladderPersistence';
import { AdaptivePhase, BlockRole, type LadderControllerAction } from '../store/adaptiveSession';
import { msToSecondsLabel } from '../model/isi';

export function formatSdtMetric(value: number): string {
    if (!Number.isFinite(value)) return '—';
    return value.toFixed(2);
}

export function blockRoleLabel(role: BlockRole | null): string | null {
    switch (role) {
        case 'teach_walkthrough':
            return 'Teach walkthrough';
        case 'teach_decide':
            return 'Teach decide';
        case 'teach_ramp':
            return 'Teach ramp';
        case 'assessed':
            return 'Cyclic block';
        case 'match':
            return 'Adaptive block';
        case 'free':
            return null;
        default:
            return null;
    }
}

const CURRICULUM_ACTION_VERB: Record<CurriculumProgressionDecision['action'], string> = {
    hold: 'Hold',
    promote: 'Advance',
    demote: 'Step back',
    advance_acquisition: 'Next scaffold',
};

const MATCH_ACTION_VERB: Record<ProgressionDecision['action'], string> = {
    hold: 'Hold',
    promote: 'Advance',
    demote: 'Step back',
};

function isCurriculumAction(
    action: LadderControllerAction
): action is CurriculumProgressionDecision {
    return 'ladder' in action;
}

export function controllerActionHint(action: LadderControllerAction | null): string | null {
    if (action == null) return null;
    if (isCurriculumAction(action)) {
        const verb = CURRICULUM_ACTION_VERB[action.action];
        return action.reason ? `${verb}: ${action.reason}` : verb;
    }
    const verb = MATCH_ACTION_VERB[action.action];
    return action.reason ? `${verb}: ${action.reason}` : verb;
}

export function adaptivePhaseLabel(
    phase: AdaptivePhase,
    path: 'adaptive' | 'cyclic' = 'cyclic'
): string {
    switch (phase) {
        case 'playing':
            return path === 'adaptive' ? 'Adaptive' : 'Cyclic';
        case 'interstitial':
            return 'Break';
        case 'summary':
            return 'Done';
        default:
            return '';
    }
}

/** Compact condition id used as the Cyclic badge, e.g. C2. */
export function adaptiveConditionCode(ladder: CurriculumLadderState): string {
    const track = ladder.track === 'flexible' ? 'F' : 'C';
    return `${track}${ladder.n}`;
}

/** Compact Match% Adaptive badge, e.g. L12. */
export function matchConditionCode(ladder: MatchLadderSnapshot): string {
    return `L${ladder.levelIndex}`;
}

export function progressLevelFlavor(ladder: CurriculumLadderState): string {
    const level = settingsFromCurriculum(ladder);
    const parts: string[] = [ladder.stage.replace(/_/g, ' '), `n=${level.n}`];
    if (level.isiMin === level.isiMax) {
        parts.push(`${msToSecondsLabel(level.isiMin)}s`);
    } else {
        parts.push(`${msToSecondsLabel(level.isiMin)}–${msToSecondsLabel(level.isiMax)}s`);
    }
    parts.push(`lure ${level.lureStage}`);
    if (level.variableN) {
        parts.push('var N');
    }
    return parts.join(' · ');
}

export function progressLevelSummary(ladder: CurriculumLadderState): string {
    const track = ladder.track === 'flexible' ? 'Flexible lag' : 'Fixed cyclic';
    return `${track} · ${progressLevelFlavor(ladder)}`;
}

export function matchProgressFlavor(ladder: MatchLadderSnapshot): string {
    const level = settingsFromLevel(ladder.levelIndex);
    const step = stepWithinN(ladder.levelIndex);
    const parts: string[] = [`step ${step}/9`, `n=${level.n}`];
    if (level.isiMin === level.isiMax) {
        parts.push(`${msToSecondsLabel(level.isiMin)}s`);
    } else {
        parts.push(`${msToSecondsLabel(level.isiMin)}–${msToSecondsLabel(level.isiMax)}s`);
    }
    if (level.interferenceChance > 0) {
        parts.push('interference');
    }
    if (level.variableN) {
        parts.push('var N');
    }
    return parts.join(' · ');
}

export function matchProgressSummary(ladder: MatchLadderSnapshot): string {
    return `Match% ladder · ${matchProgressFlavor(ladder)}`;
}

export function adaptiveBlockProgress(
    session: { blocksDone: number; phase: AdaptivePhase } | null,
    path: 'adaptive' | 'cyclic' = 'cyclic'
): { done: number; failHint: string } | null {
    if (session == null) return null;
    if (session.phase === 'playing' || session.phase === 'interstitial') {
        return {
            done: session.blocksDone,
            failHint:
                path === 'adaptive'
                    ? `Promote ≥${PROMOTE_MATCH_PCT}% · demote after ${FAILS_TO_DEMOTE} fails`
                    : `Lure-sensitive gates · demote after ${FAILS_TO_DEMOTE_STAGE} fails`,
        };
    }
    return null;
}
