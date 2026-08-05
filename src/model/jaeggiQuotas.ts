import { ModalityId } from './modalities';
import { TrialPlanEntry } from './blockQuotas';

/** Classic Jaeggi dual block length used as the scaling baseline. */
export const JAEGGI_BASE_TRIALS = 20;
/** Documented Jaeggi visual/auditory match counts at the baseline length. */
export const JAEGGI_BASE_PER_MODALITY = 4;
/** Documented Jaeggi simultaneous (both streams) match count at baseline. */
export const JAEGGI_BASE_BOTH = 2;

export interface JaeggiTargetCounts {
    /** Total true matches per modality (includes simultaneous trials). */
    perModality: number;
    /** Trials where the primary visual+audio pair both match. */
    both: number;
}

export interface PlanJaeggiStimuliInput {
    gameLength: number;
    sessionN: number;
    modalities: ModalityId[];
    random?: () => number;
}

export interface JaeggiPlanResult {
    ok: boolean;
    warnings: string[];
    trials: TrialPlanEntry[];
    counts: JaeggiTargetCounts;
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

/**
 * Scale Jaeggi fixed counts from the 20-trial baseline.
 * At 20 trials → 4 per modality + 2 simultaneous; at 30 → 6 + 3.
 */
export function scaleJaeggiTargets(trials: number): JaeggiTargetCounts {
    const scale = Math.max(1, trials) / JAEGGI_BASE_TRIALS;
    const perModality = Math.max(1, Math.round(JAEGGI_BASE_PER_MODALITY * scale));
    let both = Math.max(1, Math.round(JAEGGI_BASE_BOTH * scale));
    both = Math.min(both, perModality);
    return { perModality, both };
}

/** Prefer classic visual+audio simultaneous pair when both modalities are active. */
export function jaeggiPrimaryPair(modalities: ModalityId[]): [ModalityId, ModalityId] | null {
    if (modalities.includes('position') && modalities.includes('audio')) {
        return ['position', 'audio'];
    }
    if (modalities.length >= 2) {
        return [modalities[0], modalities[1]];
    }
    return null;
}

/**
 * Precompute free-play trial roles with Jaeggi-style fixed match quotas.
 * No lure roles — remaining scorable trials are clean non-matches.
 */
export function planJaeggiStimuli(input: PlanJaeggiStimuliInput): JaeggiPlanResult {
    const { gameLength, sessionN, modalities, random = Math.random } = input;
    const warnings: string[] = [];
    const trials: TrialPlanEntry[] = Array.from({ length: gameLength }, () => ({ byModality: {} }));
    const counts = scaleJaeggiTargets(gameLength);

    for (let t = 0; t < Math.min(sessionN, gameLength); t++) {
        for (const m of modalities) {
            trials[t].byModality[m] = { role: 'random' };
        }
    }

    const scorableIndices: number[] = [];
    for (let t = sessionN; t < gameLength; t++) scorableIndices.push(t);

    if (scorableIndices.length === 0 || modalities.length === 0) {
        return { ok: true, warnings, trials, counts };
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
            warnings.push(`Modality ${m}: could not place ${need} remaining Jaeggi targets`);
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
    }

    if (pair != null) {
        const [a, b] = pair;
        let bothActual = 0;
        for (const t of scorableIndices) {
            if (
                trials[t].byModality[a]?.role === 'target' &&
                trials[t].byModality[b]?.role === 'target'
            ) {
                bothActual++;
            }
        }
        const bothRequested = Math.min(
            counts.both,
            Math.min(counts.perModality, scorableIndices.length)
        );
        if (bothActual !== bothRequested) {
            ok = false;
            warnings.push(`Simultaneous pair: requested ${bothRequested}, got ${bothActual}`);
        }
    }

    return { ok, warnings, trials, counts };
}
