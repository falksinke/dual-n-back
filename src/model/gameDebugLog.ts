import type { BoardState } from './types';
import type { ModalityId, ModeId } from './modalities';
import type { PositionGrid } from './positionGrid';
import type { LureStageId } from './lureStages';

export type DebugScoreCell = 'hit' | 'miss' | 'fa' | 'cr';

export interface GameDebugConfig {
    level: number;
    trials: number;
    isiMinMs: number;
    isiMaxMs: number;
    answerGraceMs: number;
    mode: ModeId;
    modalities: ModalityId[];
    positionGrid: PositionGrid;
    allowCenterStimulus: boolean;
    variableN: boolean;
    variableNHoldTrials: number;
    interferenceChance: number;
    lureStage: LureStageId | null;
    useBlockQuotas: boolean;
    useJaeggiQuotas: boolean;
}

export interface GameDebugModalityTrial {
    currentValue: number | string;
    referenceValue: number | string | null;
    matched: boolean | null;
    claimed: boolean;
    feedback: 'success' | 'failed' | null;
    scoreCell: DebugScoreCell | null;
    stratum: 'clean' | 'lure' | null;
    lureLag: number | null;
    responseTimeMs: number | null;
}

export interface GameDebugTrial {
    trialIndex: number;
    effectiveN: number;
    scorable: boolean;
    referenceTrialIndex: number | null;
    onsetOffsetMs: number;
    scoredOffsetMs: number;
    stimulus: BoardState;
    modalities: Partial<Record<ModalityId, GameDebugModalityTrial>>;
}

export interface GameDebugLog {
    schemaVersion: 1;
    startedAt: string;
    completedAt: string;
    durationMs: number;
    config: GameDebugConfig;
    trials: GameDebugTrial[];
}

export function serializeGameDebugLog(log: GameDebugLog): string {
    return `${JSON.stringify(log, null, 2)}\n`;
}

export function gameDebugLogFilename(log: GameDebugLog): string {
    const timestamp = log.startedAt.replace(/[:.]/g, '-');
    return `nback-debug-${timestamp}.json`;
}

export function downloadGameDebugLog(log: GameDebugLog): void {
    const blob = new Blob([serializeGameDebugLog(log)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = gameDebugLogFilename(log);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
