import { ModalityId, ModeId } from './modalities';
import { LureStageId, getLureStagePolicy, lureOffsetsForStage } from './lureStages';

/** Intended stimulus role for one modality on one trial. */
export type ModalityRoleKind = 'target' | 'clean' | 'lure' | 'random';

export interface ModalityPlan {
    role: ModalityRoleKind;
    /** History lag offset relative to effective N (lag = effectiveN + lureOffset). */
    lureOffset?: number;
}

export interface TrialPlanEntry {
    byModality: Partial<Record<ModalityId, ModalityPlan>>;
}

/** Per-modality quota targets for a block (scorable trials only). */
export interface BlockQuotaTable {
    targetsPerModality: Partial<Record<ModalityId, number>>;
    luresPerModality: Partial<Record<ModalityId, number>>;
    /** Quad: desired trials with exactly k simultaneous targets (k = 0..M). */
    simultaneousTargets?: Partial<Record<number, number>>;
}

export interface PlanBlockStimuliInput {
    gameLength: number;
    sessionN: number;
    modalities: ModalityId[];
    lureStage: LureStageId;
    mode?: ModeId;
    /** Per-modality target rate on scorable trials (default 0.125). */
    targetRate?: number;
    random?: () => number;
    /** Override computed quotas (for tests / soft-fail scenarios). */
    quotaOverride?: BlockQuotaTable;
}

export interface BlockPlanResult {
    ok: boolean;
    warnings: string[];
    trials: TrialPlanEntry[];
    quota: BlockQuotaTable;
}

const DEFAULT_TARGET_RATE = 0.125;
const TARGET_BALANCE_TOLERANCE = 1;

/** v1 modest simultaneous-target buckets for quad (fractions of scorable trials). */
const QUAD_SIMULTANEOUS_FRACTIONS: Record<number, number> = {
    0: 0.55,
    1: 0.3,
    2: 0.12,
    3: 0.03,
    4: 0,
};

function shuffleInPlace<T>(items: T[], random: () => number): T[] {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

function pickSpreadIndices(pool: number[], count: number, random: () => number): number[] {
    if (count <= 0 || pool.length === 0) return [];
    const capped = Math.min(count, pool.length);
    const sorted = [...pool].sort((a, b) => a - b);
    const picked: number[] = [];
    for (let i = 0; i < capped; i++) {
        const slot = Math.floor(((i + random() * 0.25) * sorted.length) / capped);
        const index = Math.min(sorted.length - 1, slot);
        const trial = sorted[index];
        if (!picked.includes(trial)) {
            picked.push(trial);
        }
    }
    if (picked.length < capped) {
        const shuffled = shuffleInPlace([...sorted], random);
        for (const trial of shuffled) {
            if (picked.length >= capped) break;
            if (!picked.includes(trial)) picked.push(trial);
        }
    }
    return picked.slice(0, capped);
}

function allocatePerModalityCounts(
    scorableTrials: number,
    rate: number,
    modalities: ModalityId[]
): Record<ModalityId, number> {
    const ideal = scorableTrials * rate;
    const base = Math.floor(ideal);
    const extra = Math.round(ideal - base);
    const counts = {} as Record<ModalityId, number>;
    modalities.forEach((m, i) => {
        counts[m] = base + (i < extra ? 1 : 0);
    });
    return counts;
}

function pickLureOffset(offsets: number[], random: () => number): number | undefined {
    if (offsets.length === 0) return undefined;
    return offsets[Math.floor(random() * offsets.length)];
}

/** Build default quota table from block shape and lure stage. */
export function buildDefaultQuotaTable(input: {
    gameLength: number;
    sessionN: number;
    modalities: ModalityId[];
    lureStage: LureStageId;
    targetRate?: number;
}): BlockQuotaTable {
    const { gameLength, sessionN, modalities, lureStage, targetRate = DEFAULT_TARGET_RATE } = input;
    const scorable = Math.max(0, gameLength - sessionN);
    const policy = getLureStagePolicy(lureStage);

    const targetsPerModality = allocatePerModalityCounts(scorable, targetRate, modalities);
    const luresPerModality: Partial<Record<ModalityId, number>> = {};

    for (const m of modalities) {
        const nonTarget = scorable - (targetsPerModality[m] ?? 0);
        luresPerModality[m] = Math.round(nonTarget * policy.lureRate);
    }

    const simultaneousTargets: Partial<Record<number, number>> = {};
    if (modalities.length >= 4) {
        let assigned = 0;
        const keys = Object.keys(QUAD_SIMULTANEOUS_FRACTIONS)
            .map(Number)
            .sort((a, b) => a - b);
        for (const k of keys) {
            const fraction = QUAD_SIMULTANEOUS_FRACTIONS[k] ?? 0;
            const count =
                k === keys[keys.length - 1]
                    ? Math.max(0, scorable - assigned)
                    : Math.round(scorable * fraction);
            simultaneousTargets[k] = count;
            assigned += count;
        }
        if (assigned !== scorable) {
            simultaneousTargets[0] = (simultaneousTargets[0] ?? 0) + (scorable - assigned);
        }
    }

    return { targetsPerModality, luresPerModality, simultaneousTargets };
}

export function countModalityTargets(
    trials: TrialPlanEntry[],
    scorableIndices: number[],
    modalities: ModalityId[]
): Record<ModalityId, number> {
    const counts = {} as Record<ModalityId, number>;
    for (const m of modalities) counts[m] = 0;
    for (const t of scorableIndices) {
        for (const m of modalities) {
            if (trials[t]?.byModality[m]?.role === 'target') counts[m]++;
        }
    }
    return counts;
}

export function countSimultaneousTargets(
    trials: TrialPlanEntry[],
    scorableIndices: number[],
    modalities: ModalityId[]
): Record<number, number> {
    const counts: Record<number, number> = {};
    for (const t of scorableIndices) {
        let k = 0;
        for (const m of modalities) {
            if (trials[t]?.byModality[m]?.role === 'target') k++;
        }
        counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
}

/**
 * Precompute per-trial modality roles from cross-modal quotas.
 * Returns best-effort plan with `ok: false` when constraints cannot be fully met.
 */
export function planBlockStimuli(input: PlanBlockStimuliInput): BlockPlanResult {
    const {
        gameLength,
        sessionN,
        modalities,
        lureStage,
        targetRate = DEFAULT_TARGET_RATE,
        random = Math.random,
        quotaOverride,
    } = input;

    const warnings: string[] = [];
    const trials: TrialPlanEntry[] = Array.from({ length: gameLength }, () => ({ byModality: {} }));
    const quota =
        quotaOverride ??
        buildDefaultQuotaTable({ gameLength, sessionN, modalities, lureStage, targetRate });

    for (let t = 0; t < Math.min(sessionN, gameLength); t++) {
        for (const m of modalities) {
            trials[t].byModality[m] = { role: 'random' };
        }
    }

    const scorableIndices: number[] = [];
    for (let t = sessionN; t < gameLength; t++) scorableIndices.push(t);

    if (scorableIndices.length === 0) {
        return { ok: true, warnings, trials, quota };
    }

    const policy = getLureStagePolicy(lureStage);
    const offsets = lureOffsetsForStage(lureStage, sessionN);
    const shuffledScorable = shuffleInPlace([...scorableIndices], random);

    const targetCounts = {} as Record<ModalityId, number>;
    for (const m of modalities) {
        targetCounts[m] = quota.targetsPerModality[m] ?? 0;
    }

    if (modalities.length >= 4 && quota.simultaneousTargets) {
        assignQuadWithSimultaneousBuckets(
            trials,
            scorableIndices,
            modalities,
            targetCounts,
            quota.simultaneousTargets,
            random
        );
    } else {
        for (const m of modalities) {
            const targetTrials = pickSpreadIndices(shuffledScorable, targetCounts[m], random);
            for (const t of targetTrials) {
                trials[t].byModality[m] = { role: 'target' };
            }
        }
    }

    for (const m of modalities) {
        const lureCount = quota.luresPerModality[m] ?? 0;
        const nonTargetPool = scorableIndices.filter((t) => trials[t].byModality[m]?.role !== 'target');
        const lureTrials = pickSpreadIndices(nonTargetPool, lureCount, random);
        for (const t of lureTrials) {
            if (trials[t].byModality[m]?.role === 'target') continue;
            trials[t].byModality[m] = {
                role: policy.lureRate > 0 && offsets.length > 0 ? 'lure' : 'clean',
                lureOffset: pickLureOffset(offsets, random),
            };
        }
    }

    for (const t of scorableIndices) {
        for (const m of modalities) {
            if (!trials[t].byModality[m]) {
                trials[t].byModality[m] = { role: 'clean' };
            }
        }
    }

    let ok = true;
    const actualTargets = countModalityTargets(trials, scorableIndices, modalities);
    const targetValues = modalities.map((m) => actualTargets[m]);
    const spread = Math.max(...targetValues) - Math.min(...targetValues);
    if (spread > TARGET_BALANCE_TOLERANCE) {
        ok = false;
        warnings.push(
            `Per-modality target counts differ by ${spread} (tolerance ±${TARGET_BALANCE_TOLERANCE}): ${JSON.stringify(actualTargets)}`
        );
    }

    for (const m of modalities) {
        const requested = targetCounts[m];
        const actual = actualTargets[m];
        if (Math.abs(actual - requested) > TARGET_BALANCE_TOLERANCE) {
            ok = false;
            warnings.push(`Modality ${m}: requested ${requested} targets, got ${actual}`);
        }
    }

    if (modalities.length >= 4 && quota.simultaneousTargets) {
        const actualSim = countSimultaneousTargets(trials, scorableIndices, modalities);
        for (const [k, desired] of Object.entries(quota.simultaneousTargets)) {
            const key = Number(k);
            const actual = actualSim[key] ?? 0;
            if (Math.abs(actual - (desired ?? 0)) > 2) {
                ok = false;
                warnings.push(
                    `Simultaneous target bucket ${key}: requested ${desired}, got ${actual}`
                );
            }
        }
    }

    return { ok, warnings, trials, quota };
}

function assignQuadWithSimultaneousBuckets(
    trials: TrialPlanEntry[],
    scorableIndices: number[],
    modalities: ModalityId[],
    targetCounts: Record<ModalityId, number>,
    buckets: Partial<Record<number, number>>,
    random: () => number
): void {
    const shuffled = shuffleInPlace([...scorableIndices], random);
    let cursor = 0;

    const sortedKeys = Object.keys(buckets)
        .map(Number)
        .sort((a, b) => b - a);

    for (const k of sortedKeys) {
        const count = buckets[k] ?? 0;
        for (let i = 0; i < count && cursor < shuffled.length; i++, cursor++) {
            const t = shuffled[cursor];
            if (k === 0) continue;

            const mods = shuffleInPlace([...modalities], random).slice(0, k);
            for (const m of mods) {
                trials[t].byModality[m] = { role: 'target' };
                targetCounts[m] = Math.max(0, (targetCounts[m] ?? 0) - 1);
            }
        }
    }

    for (const m of modalities) {
        let remaining = targetCounts[m] ?? 0;
        if (remaining <= 0) continue;
        const pool = scorableIndices.filter((t) => trials[t].byModality[m]?.role !== 'target');
        const picks = pickSpreadIndices(pool, remaining, random);
        for (const t of picks) {
            trials[t].byModality[m] = { role: 'target' };
            remaining--;
        }
        if (remaining > 0) {
            // Best-effort: leave unmet; validation will soft-fail.
        }
    }
}
