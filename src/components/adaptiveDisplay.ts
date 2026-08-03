import type { CurriculumProgressionDecision } from '../model/adaptiveController';
import {
    settingsFromCurriculum,
    type CurriculumLadderState,
} from '../model/adaptiveCurriculum';
import { FAILS_TO_DEMOTE_STAGE } from '../model/adaptiveController';
import { AdaptivePhase, BlockRole } from '../store/adaptiveSession';
import { msToSecondsLabel } from '../model/isi';

export function formatSdtMetric(value: number): string {
    if (!Number.isFinite(value)) return '—';
    return value.toFixed(2);
}

export function blockRoleLabel(role: BlockRole | null): string | null {
    switch (role) {
        case 'guided':
            return 'Guided block';
        case 'fade':
            return 'Pointer fade';
        case 'assessed':
            return 'Adaptive block';
        case 'instruction':
            return 'Strategy instruction';
        case 'free':
            return null;
        default:
            return null;
    }
}

const ACTION_VERB: Record<CurriculumProgressionDecision['action'], string> = {
    hold: 'Hold',
    promote: 'Advance',
    demote: 'Step back',
    advance_acquisition: 'Next scaffold',
};

export function controllerActionHint(
    action: CurriculumProgressionDecision | null
): string | null {
    if (action == null) return null;
    const verb = ACTION_VERB[action.action];
    return action.reason ? `${verb}: ${action.reason}` : verb;
}

export function adaptivePhaseLabel(phase: AdaptivePhase): string {
    switch (phase) {
        case 'playing':
            return 'Adaptive';
        case 'interstitial':
            return 'Break';
        case 'summary':
            return 'Done';
        default:
            return '';
    }
}

/** Compact condition id used as the Adaptive badge, e.g. C2-fixed_clean. */
export function adaptiveConditionCode(ladder: CurriculumLadderState): string {
    const track = ladder.track === 'flexible' ? 'F' : 'C';
    return `${track}${ladder.n}`;
}

export function progressLevelFlavor(ladder: CurriculumLadderState): string {
    const level = settingsFromCurriculum(
        ladder.stage === 'instruction' ? { ...ladder, stage: 'guided' } : ladder
    );
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

export function adaptiveBlockProgress(
    session: { blocksDone: number; phase: AdaptivePhase } | null
): { done: number; failHint: string } | null {
    if (session == null) return null;
    if (session.phase === 'playing' || session.phase === 'interstitial') {
        return {
            done: session.blocksDone,
            failHint: `Lure-sensitive gates · demote after ${FAILS_TO_DEMOTE_STAGE} fails`,
        };
    }
    return null;
}
