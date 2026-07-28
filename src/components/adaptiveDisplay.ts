import { ControllerAction } from '../model/adaptiveController';
import { LureStageId } from '../model/lureStages';
import { AdaptivePhase, BlockRole } from '../store/adaptiveSession';

export function formatSdtMetric(value: number): string {
    if (!Number.isFinite(value)) return '—';
    return value.toFixed(2);
}

export function blockRoleLabel(role: BlockRole | null): string | null {
    switch (role) {
        case 'anchor-open':
            return 'Calibration';
        case 'adaptive':
            return 'Adaptive block';
        case 'remediation':
            return 'Remediation';
        case 'anchor-close':
            return 'Closing anchor';
        case 'free':
            return null;
        default:
            return null;
    }
}

const ACTION_VERB: Record<ControllerAction['action'], string> = {
    hold: 'Hold',
    lureUp: 'Lure stage up',
    lureDown: 'Lure stage down',
    nUp: 'N up',
    nDown: 'N down',
    isiTighten: 'Faster timing',
    isiRevert: 'Slower timing',
    remediate: 'Remediation',
};

export function controllerActionHint(action: ControllerAction | null): string | null {
    if (action == null) return null;
    const verb = ACTION_VERB[action.action];
    return action.reason ? `${verb}: ${action.reason}` : verb;
}

export function adaptivePhaseLabel(phase: AdaptivePhase): string {
    switch (phase) {
        case 'anchor-open':
            return 'Calibration';
        case 'adaptive':
            return 'Adaptive';
        case 'remediation':
            return 'Remediation';
        case 'anchor-close':
            return 'Closing';
        case 'interstitial':
            return 'Break';
        case 'summary':
            return 'Done';
        default:
            return '';
    }
}

export function lureStageSummary(stage: LureStageId): string {
    return `Stage ${stage}`;
}

/** Compact condition id used as the Adaptive “level” badge, e.g. 2C. */
export function adaptiveConditionCode(n: number, stage: LureStageId): string {
    return `${n}${stage}`;
}

export function lureStageFlavor(stage: LureStageId): string {
    switch (stage) {
        case 'A':
            return 'Clean matching';
        case 'B':
            return 'Distant lures';
        case 'C':
            return 'Near lures';
        case 'D':
            return 'Mixed pressure';
        case 'E':
            return 'Max interference';
    }
}

export function adaptiveBlockProgress(
    session: { adaptiveBlocksDone: number; adaptiveTarget: number; phase: AdaptivePhase } | null
): { done: number; target: number } | null {
    if (session == null) return null;
    if (
        session.phase === 'adaptive' ||
        session.phase === 'interstitial' ||
        session.phase === 'remediation' ||
        session.phase === 'anchor-close' ||
        session.phase === 'summary'
    ) {
        return {
            done: Math.min(session.adaptiveBlocksDone, session.adaptiveTarget),
            target: session.adaptiveTarget,
        };
    }
    return null;
}
