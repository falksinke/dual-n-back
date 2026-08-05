import { TrialPlanEntry } from './blockQuotas';
import {
    jaeggiPrimaryPair,
    scaleJaeggiTargets,
    type JaeggiTargetCounts,
} from './jaeggiQuotas';
import { ModalityId } from './modalities';

export interface PlanVariableNStimuliInput {
    gameLength: number;
    sessionN: number;
    /** Per-trial effective N (same length as gameLength). */
    effectiveNs: number[];
    modalities: ModalityId[];
    interferenceChance: number;
    random?: () => number;
}

export interface VariableNPlanResult {
    ok: boolean;
    warnings: string[];
    trials: TrialPlanEntry[];
    counts: JaeggiTargetCounts;
    lureCounts: Partial<Record<ModalityId, number>>;
}

/**
 * Resolve effective N for each trial index from the BW list + warmup rule
 * (matches Game.getEffectiveN when variable N is on).
 */
export function buildEffectiveNs(
    gameLength: number,
    sessionN: number,
    variableNList: number[]
): number[] {
    const ns: number[] = [];
    for (let t = 0; t < gameLength; t++) {
        if (t < sessionN) {
            ns.push(sessionN);
        } else {
            ns.push(variableNList[t - sessionN] ?? sessionN);
        }
    }
    return ns;
}

/** Trial is scorable when history can support that trial's effective N. */
export function isScorableTrial(trialIndex: number, effectiveN: number): boolean {
    return trialIndex >= effectiveN;
}

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

/** BW near-miss offsets for a session ceiling (same set as Game.generateModalityValue). */
export function bwInterferenceOffsets(sessionN: number): number[] {
    return sessionN < 3 ? [1, sessionN] : [-1, 1, sessionN];
}

/**
 * Pick a lure offset valid at trial `t` with effective N `effectiveN`
 * (history length at generation == t).
 */
export function pickValidLureOffset(
    trialIndex: number,
    effectiveN: number,
    sessionN: number,
    random: () => number
): number | null {
    const candidates = bwInterferenceOffsets(sessionN).filter((offset) => {
        const lag = effectiveN + offset;
        return lag >= 1 && lag < trialIndex;
    });
    if (candidates.length === 0) return null;
    const shuffled = shuffleInPlace([...candidates], random);
    return shuffled[0] ?? null;
}

/**
 * Pre-plan Variable N blocks: targets (Jaeggi density) → interference lures → clean fill.
 * Switch moments / effective N come from `effectiveNs` (already scheduled).
 */
export function planVariableNStimuli(input: PlanVariableNStimuliInput): VariableNPlanResult {
    const {
        gameLength,
        sessionN,
        effectiveNs,
        modalities,
        interferenceChance,
        random = Math.random,
    } = input;
    const warnings: string[] = [];
    const trials: TrialPlanEntry[] = Array.from({ length: gameLength }, () => ({ byModality: {} }));
    const counts = scaleJaeggiTargets(gameLength);
    const lureCounts: Partial<Record<ModalityId, number>> = {};

    if (effectiveNs.length !== gameLength) {
        warnings.push(
            `effectiveNs length ${effectiveNs.length} != gameLength ${gameLength}`
        );
    }

    const scorableIndices: number[] = [];
    for (let t = 0; t < gameLength; t++) {
        const effectiveN = effectiveNs[t] ?? sessionN;
        if (isScorableTrial(t, effectiveN)) {
            scorableIndices.push(t);
        } else {
            for (const m of modalities) {
                trials[t].byModality[m] = { role: 'random' };
            }
        }
    }

    if (scorableIndices.length === 0 || modalities.length === 0) {
        return { ok: warnings.length === 0, warnings, trials, counts, lureCounts };
    }

    const remaining: Partial<Record<ModalityId, number>> = {};
    for (const m of modalities) {
        remaining[m] = Math.min(counts.perModality, scorableIndices.length);
    }

    const pair = jaeggiPrimaryPair(modalities);
    if (pair != null) {
        const [a, b] = pair;
        const bothCount = Math.min(
            counts.both,
            remaining[a] ?? 0,
            remaining[b] ?? 0,
            scorableIndices.length
        );
        const bothTrials = pickSpreadIndices(scorableIndices, bothCount, random);
        for (const t of bothTrials) {
            trials[t].byModality[a] = { role: 'target' };
            trials[t].byModality[b] = { role: 'target' };
            remaining[a] = (remaining[a] ?? 0) - 1;
            remaining[b] = (remaining[b] ?? 0) - 1;
        }
    }

    for (const m of modalities) {
        let need = remaining[m] ?? 0;
        if (need <= 0) continue;

        const partner =
            pair != null && (m === pair[0] || m === pair[1])
                ? m === pair[0]
                    ? pair[1]
                    : pair[0]
                : null;

        const exclusivePool = scorableIndices.filter(
            (t) =>
                trials[t].byModality[m]?.role !== 'target' &&
                (partner == null || trials[t].byModality[partner]?.role !== 'target')
        );
        let picks = pickSpreadIndices(exclusivePool, need, random);
        for (const t of picks) {
            trials[t].byModality[m] = { role: 'target' };
            need--;
        }

        if (need > 0) {
            const fallbackPool = scorableIndices.filter(
                (t) => trials[t].byModality[m]?.role !== 'target'
            );
            picks = pickSpreadIndices(fallbackPool, need, random);
            for (const t of picks) {
                trials[t].byModality[m] = { role: 'target' };
                need--;
            }
        }

        remaining[m] = need;
        if (need > 0) {
            warnings.push(`Modality ${m}: could not place ${need} remaining Variable N targets`);
        }
    }

    const interferenceRate = Math.max(0, Math.min(1, interferenceChance));
    if (interferenceRate > 0 && sessionN > 1) {
        for (const m of modalities) {
            const lurePool = scorableIndices.filter(
                (t) => trials[t].byModality[m]?.role !== 'target'
            );
            const lureNeed = Math.min(
                lurePool.length,
                Math.round(interferenceRate * lurePool.length)
            );
            const lureTrials = pickSpreadIndices(lurePool, lureNeed, random);
            let placed = 0;
            for (const t of lureTrials) {
                const effectiveN = effectiveNs[t] ?? sessionN;
                const offset = pickValidLureOffset(t, effectiveN, sessionN, random);
                if (offset == null) {
                    trials[t].byModality[m] = { role: 'clean' };
                    continue;
                }
                trials[t].byModality[m] = { role: 'lure', lureOffset: offset };
                placed++;
            }
            lureCounts[m] = placed;
        }
    }

    for (const t of scorableIndices) {
        for (const m of modalities) {
            if (!trials[t].byModality[m]) {
                trials[t].byModality[m] = { role: 'clean' };
            }
        }
    }

    let ok = warnings.length === 0;
    for (const m of modalities) {
        let actual = 0;
        for (const t of scorableIndices) {
            if (trials[t].byModality[m]?.role === 'target') actual++;
        }
        const requested = Math.min(counts.perModality, scorableIndices.length);
        if (actual !== requested) {
            ok = false;
            warnings.push(`Modality ${m}: requested ${requested} targets, got ${actual}`);
        }
        for (let t = 0; t < gameLength; t++) {
            if (
                trials[t].byModality[m]?.role === 'target' &&
                !isScorableTrial(t, effectiveNs[t] ?? sessionN)
            ) {
                ok = false;
                warnings.push(`Modality ${m}: target on non-scorable trial ${t}`);
            }
        }
    }

    return { ok, warnings, trials, counts, lureCounts };
}
