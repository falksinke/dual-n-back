import { ModalityId } from './modalities';

export type SdtCell = 'hit' | 'miss' | 'fa' | 'cr';

/** Non-target stratum. Targets always use hit/miss regardless of this field. */
export type TrialStratum = 'clean' | 'lure';

export interface SdtTrialEvent {
    modality: ModalityId;
    cell: SdtCell;
    /** For FA/CR: clean vs lure non-target. Ignored for hit/miss. */
    stratum: TrialStratum;
    lureLag?: number;
    /** Claim latency from trial onset (ms); only set when the player claimed. */
    responseTimeMs?: number;
}

export interface SdtCounts {
    hits: number;
    misses: number;
    falseAlarms: number;
    correctRejections: number;
}

export interface SdtSensitivity {
    counts: SdtCounts;
    hitRate: number;
    falseAlarmRate: number;
    dPrime: number;
    criterion: number;
}

export interface ModalitySdtReport {
    modality: ModalityId;
    all: SdtSensitivity;
    clean: SdtSensitivity;
    lure: SdtSensitivity;
    /** FA_lure rate − FA_clean rate (uncorrected rates). */
    lureCost: number;
    medianCorrectRtMs: number | null;
}

export interface BlockSdtReport {
    modalities: ModalityId[];
    byModality: Partial<Record<ModalityId, ModalitySdtReport>>;
    /** Median correct-response RT across modalities (ms), or null if none. */
    medianCorrectRtMs: number | null;
}

export function emptySdtCounts(): SdtCounts {
    return { hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 };
}

/**
 * Approximate inverse normal CDF Φ^{-1}(p).
 * Acklam's rational approximation; adequate for SDT with loglinear rates in (0,1).
 */
export function normsInv(p: number): number {
    if (p <= 0 || p >= 1 || Number.isNaN(p)) {
        throw new RangeError(`normsInv expects p in (0,1), got ${p}`);
    }

    const a = [
        -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
        -3.066479806614716e1, 2.506628277459239e0,
    ];
    const b = [
        -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
        -1.328068155288572e1,
    ];
    const c = [
        -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0,
        4.374664141464968e0, 2.938163982698783e0,
    ];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    if (p < pLow) {
        const q = Math.sqrt(-2 * Math.log(p));
        return (
            (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
        );
    }

    if (p <= pHigh) {
        const q = p - 0.5;
        const r = q * q;
        return (
            ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
            (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
        );
    }

    const q = Math.sqrt(-2 * Math.log(1 - p));
    return (
        -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
}

/** Loglinear-corrected rates and d′ / c. Hit rate always uses all targets. */
export function sensitivityFromCounts(
    hits: number,
    misses: number,
    falseAlarms: number,
    correctRejections: number
): SdtSensitivity {
    const targets = hits + misses;
    const nonTargets = falseAlarms + correctRejections;
    const hitRate = (hits + 0.5) / (targets + 1);
    const falseAlarmRate = (falseAlarms + 0.5) / (nonTargets + 1);
    const zH = normsInv(hitRate);
    const zFa = normsInv(falseAlarmRate);
    return {
        counts: { hits, misses, falseAlarms, correctRejections },
        hitRate,
        falseAlarmRate,
        dPrime: zH - zFa,
        criterion: -(zH + zFa) / 2,
    };
}

function rawFaRate(falseAlarms: number, correctRejections: number): number {
    const nonTargets = falseAlarms + correctRejections;
    if (nonTargets === 0) return 0;
    return falseAlarms / nonTargets;
}

function median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Build a block SDT report.
 * d′_clean / d′_lure reuse the overall hit rate (all targets) with stratum-specific FA rates.
 */
export function buildBlockSdtReport(
    events: SdtTrialEvent[],
    modalities: ModalityId[]
): BlockSdtReport {
    const byModality: Partial<Record<ModalityId, ModalitySdtReport>> = {};
    const allCorrectRts: number[] = [];

    for (const modality of modalities) {
        const modalityEvents = events.filter((e) => e.modality === modality);
        let hits = 0;
        let misses = 0;
        let faAll = 0;
        let crAll = 0;
        let faClean = 0;
        let crClean = 0;
        let faLure = 0;
        let crLure = 0;
        const correctRts: number[] = [];

        for (const event of modalityEvents) {
            switch (event.cell) {
                case 'hit':
                    hits++;
                    if (event.responseTimeMs != null) correctRts.push(event.responseTimeMs);
                    break;
                case 'miss':
                    misses++;
                    break;
                case 'fa':
                    faAll++;
                    if (event.stratum === 'lure') faLure++;
                    else faClean++;
                    break;
                case 'cr':
                    crAll++;
                    if (event.stratum === 'lure') crLure++;
                    else crClean++;
                    break;
            }
        }

        const all = sensitivityFromCounts(hits, misses, faAll, crAll);
        // Same target hits/misses; stratum-specific FA/CR only.
        const clean = sensitivityFromCounts(hits, misses, faClean, crClean);
        const lure = sensitivityFromCounts(hits, misses, faLure, crLure);
        const modalityMedianRt = median(correctRts);
        if (modalityMedianRt != null) allCorrectRts.push(...correctRts);

        byModality[modality] = {
            modality,
            all,
            clean,
            lure,
            lureCost: rawFaRate(faLure, crLure) - rawFaRate(faClean, crClean),
            medianCorrectRtMs: modalityMedianRt,
        };
    }

    return {
        modalities,
        byModality,
        medianCorrectRtMs: median(allCorrectRts),
    };
}

export function classifySdtCell(isTarget: boolean, claimed: boolean): SdtCell {
    if (isTarget) return claimed ? 'hit' : 'miss';
    return claimed ? 'fa' : 'cr';
}
