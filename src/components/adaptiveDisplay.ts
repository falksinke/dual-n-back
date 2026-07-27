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
