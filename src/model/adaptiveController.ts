import { ModalityId } from './modalities';
import { BlockSdtReport } from './sdtMetrics';
import { LureStageId, nextLureStage } from './lureStages';

export type LadderState = { n: number; lureStage: LureStageId; isiTier: number };

export type ControllerAction =
    | { action: 'hold'; reason: string }
    | {
          action: 'lureUp' | 'lureDown' | 'nUp' | 'nDown' | 'isiTighten' | 'isiRevert';
          reason: string;
      }
    | { action: 'remediate'; modality: ModalityId; reason: string };

export const ADAPTIVE_THRESHOLDS = {
    medianCleanPromote: 2.0,
    modalityFloorClean: 1.4,
    medianAllNUp: 2.0,
    modalityFloorAll: 1.4,
    lureDPrimeMin: 1.2,
    criterionExtreme: 1.5,
    windowSize: 3,
    /** Latest-block median correct RT at or below this qualifies for ISI tighten. */
    speedRtThresholdMs: 2000,
    maxIsiTier: 3,
} as const;

export interface DecideAdaptiveOptions {
    /** Caller sets true when the prior window also met promotion criteria. */
    previousWindowPromoted?: boolean;
    /** Caller sets true on the first window after an ISI tighten was applied. */
    postIsiTighten?: boolean;
}

interface BlockAggregates {
    medianClean: number;
    minClean: number;
    medianAll: number;
    minAll: number;
    medianLure: number;
    minLure: number;
    maxAbsCriterion: number;
    modalityClean: Record<ModalityId, number>;
}

interface WindowAggregates {
    meanMedianClean: number;
    minClean: number;
    meanMedianAll: number;
    minAll: number;
    meanMedianLure: number;
    minLure: number;
    maxAbsCriterion: number;
    modalityMeanClean: Record<ModalityId, number>;
    latestMedianCorrectRtMs: number | null;
}

function median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregateBlock(report: BlockSdtReport, modalities: ModalityId[]): BlockAggregates {
    const cleanValues: number[] = [];
    const allValues: number[] = [];
    const lureValues: number[] = [];
    const modalityClean: Partial<Record<ModalityId, number>> = {};
    let maxAbsCriterion = 0;

    for (const modality of modalities) {
        const mod = report.byModality[modality];
        if (!mod) continue;
        cleanValues.push(mod.clean.dPrime);
        allValues.push(mod.all.dPrime);
        lureValues.push(mod.lure.dPrime);
        modalityClean[modality] = mod.clean.dPrime;
        maxAbsCriterion = Math.max(
            maxAbsCriterion,
            Math.abs(mod.all.criterion),
            Math.abs(mod.clean.criterion),
            Math.abs(mod.lure.criterion)
        );
    }

    return {
        medianClean: median(cleanValues) ?? 0,
        minClean: cleanValues.length ? Math.min(...cleanValues) : 0,
        medianAll: median(allValues) ?? 0,
        minAll: allValues.length ? Math.min(...allValues) : 0,
        medianLure: median(lureValues) ?? 0,
        minLure: lureValues.length ? Math.min(...lureValues) : 0,
        maxAbsCriterion,
        modalityClean: modalityClean as Record<ModalityId, number>,
    };
}

/**
 * Window-level gating uses the mean of each block's per-modality median d′ values
 * (three block medians averaged) for stability across the rolling window.
 */
function aggregateWindow(
    window: BlockSdtReport[],
    modalities: ModalityId[]
): WindowAggregates {
    const perBlock = window.map((block) => aggregateBlock(block, modalities));
    const modalityMeanClean = {} as Record<ModalityId, number>;

    for (const modality of modalities) {
        modalityMeanClean[modality] = mean(
            perBlock.map((block) => block.modalityClean[modality] ?? 0)
        );
    }

    const latest = window[window.length - 1];

    return {
        meanMedianClean: mean(perBlock.map((block) => block.medianClean)),
        minClean: Math.min(...perBlock.map((block) => block.minClean)),
        meanMedianAll: mean(perBlock.map((block) => block.medianAll)),
        minAll: Math.min(...perBlock.map((block) => block.minAll)),
        meanMedianLure: mean(perBlock.map((block) => block.medianLure)),
        minLure: Math.min(...perBlock.map((block) => block.minLure)),
        maxAbsCriterion: Math.max(...perBlock.map((block) => block.maxAbsCriterion)),
        modalityMeanClean,
        latestMedianCorrectRtMs: latest?.medianCorrectRtMs ?? null,
    };
}

function cleanPoor(stats: WindowAggregates, modalities: ModalityId[]): boolean {
    const weak = weakModalities(stats, modalities);
    if (
        weak.length === 1 &&
        stats.meanMedianClean >= ADAPTIVE_THRESHOLDS.modalityFloorClean
    ) {
        return false;
    }
    return (
        stats.meanMedianClean < ADAPTIVE_THRESHOLDS.medianCleanPromote ||
        stats.minClean < ADAPTIVE_THRESHOLDS.modalityFloorClean
    );
}

function cleanMastery(stats: WindowAggregates): boolean {
    return (
        stats.meanMedianClean >= ADAPTIVE_THRESHOLDS.medianCleanPromote &&
        stats.minClean >= ADAPTIVE_THRESHOLDS.modalityFloorClean
    );
}

function lurePoor(stats: WindowAggregates): boolean {
    return (
        stats.meanMedianLure < ADAPTIVE_THRESHOLDS.lureDPrimeMin ||
        stats.minLure < ADAPTIVE_THRESHOLDS.lureDPrimeMin
    );
}

function lureStable(stats: WindowAggregates): boolean {
    return (
        stats.meanMedianLure >= ADAPTIVE_THRESHOLDS.lureDPrimeMin &&
        stats.minLure >= ADAPTIVE_THRESHOLDS.lureDPrimeMin
    );
}

function allMastery(stats: WindowAggregates): boolean {
    return (
        stats.meanMedianAll >= ADAPTIVE_THRESHOLDS.medianAllNUp &&
        stats.minAll >= ADAPTIVE_THRESHOLDS.modalityFloorAll &&
        lureStable(stats)
    );
}

function extremeCollapse(stats: WindowAggregates): boolean {
    return (
        stats.minClean < ADAPTIVE_THRESHOLDS.modalityFloorClean &&
        stats.minLure < ADAPTIVE_THRESHOLDS.lureDPrimeMin
    );
}

function extremeCriterion(stats: WindowAggregates): boolean {
    return stats.maxAbsCriterion > ADAPTIVE_THRESHOLDS.criterionExtreme;
}

function weakModalities(stats: WindowAggregates, modalities: ModalityId[]): ModalityId[] {
    return modalities.filter(
        (modality) =>
            stats.modalityMeanClean[modality] < ADAPTIVE_THRESHOLDS.modalityFloorClean
    );
}

function shouldRemediate(stats: WindowAggregates, modalities: ModalityId[]): ModalityId | null {
    const weak = weakModalities(stats, modalities);
    if (weak.length !== 1) return null;
    if (stats.meanMedianClean < ADAPTIVE_THRESHOLDS.modalityFloorClean) return null;
    return weak[0];
}

function speedEligible(stats: WindowAggregates): boolean {
    return (
        stats.latestMedianCorrectRtMs != null &&
        stats.latestMedianCorrectRtMs <= ADAPTIVE_THRESHOLDS.speedRtThresholdMs
    );
}

export function canDecide(window: BlockSdtReport[]): boolean {
    return window.length >= ADAPTIVE_THRESHOLDS.windowSize;
}

export function decideAdaptive(
    window: BlockSdtReport[],
    ladder: LadderState,
    modalities: ModalityId[],
    opts: DecideAdaptiveOptions = {}
): ControllerAction {
    if (!canDecide(window)) {
        return {
            action: 'hold',
            reason: 'insufficient evidence window (need 3 adaptive blocks)',
        };
    }

    const evidence = window.slice(-ADAPTIVE_THRESHOLDS.windowSize);
    const stats = aggregateWindow(evidence, modalities);
    const previousWindowPromoted = opts.previousWindowPromoted === true;

    if (opts.postIsiTighten && stats.meanMedianAll < ADAPTIVE_THRESHOLDS.medianAllNUp) {
        return {
            action: 'isiRevert',
            reason: 'median d′_all fell below promote floor after ISI tighten',
        };
    }

    if (extremeCollapse(stats)) {
        if (ladder.n <= 2) {
            return {
                action: 'hold',
                reason: 'clean load failure at minimum n; hold and practice current level',
            };
        }
        return {
            action: 'nDown',
            reason: 'extreme collapse in clean and lure discrimination',
        };
    }

    if (cleanPoor(stats, modalities)) {
        if (ladder.n <= 2) {
            return {
                action: 'hold',
                reason: 'clean load failure at minimum n; hold and practice current level',
            };
        }
        return {
            action: 'nDown',
            reason: 'core clean load below promote median or modality floor',
        };
    }

    if (lurePoor(stats)) {
        if (ladder.lureStage === 'A') {
            return {
                action: 'hold',
                reason: 'lure discrimination poor but already at minimum lure stage',
            };
        }
        return {
            action: 'lureDown',
            reason: 'clean discrimination adequate but lure d′ below threshold',
        };
    }

    const remediateModality = shouldRemediate(stats, modalities);
    if (remediateModality != null) {
        return {
            action: 'remediate',
            modality: remediateModality,
            reason: 'single modality below clean d′ floor while aggregate remains adequate',
        };
    }

    if (extremeCriterion(stats)) {
        return {
            action: 'hold',
            reason: 'extreme response criterion; adjust strategy before changing difficulty',
        };
    }

    if (
        previousWindowPromoted &&
        ladder.lureStage === 'E' &&
        allMastery(stats)
    ) {
        return {
            action: 'nUp',
            reason: 'top lure stage mastered with stable all-modality discrimination across two windows',
        };
    }

    if (
        previousWindowPromoted &&
        cleanMastery(stats) &&
        lureStable(stats) &&
        nextLureStage(ladder.lureStage) != null
    ) {
        return {
            action: 'lureUp',
            reason: 'clean mastery with stable lure discrimination across two windows',
        };
    }

    if (
        cleanMastery(stats) &&
        lureStable(stats) &&
        allMastery(stats) &&
        ladder.lureStage === 'E' &&
        speedEligible(stats) &&
        ladder.isiTier < ADAPTIVE_THRESHOLDS.maxIsiTier
    ) {
        return {
            action: 'isiTighten',
            reason: 'discrimination mastered with fast correct responses; tighten timing one tier',
        };
    }

    return {
        action: 'hold',
        reason: 'performance stable; continue current ladder settings',
    };
}
