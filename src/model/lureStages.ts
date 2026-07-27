/** Adaptive lure-density / proximity stages (plan KTD4). */
export type LureStageId = 'A' | 'B' | 'C' | 'D' | 'E';

export const LURE_STAGES: LureStageId[] = ['A', 'B', 'C', 'D', 'E'];

export type LureProximity = 'none' | 'distant' | 'near' | 'mixed' | 'nearWeighted';

export interface LureStagePolicy {
    id: LureStageId;
    /** Target rate of deliberate lure attempts after the guaranteed-match roll fails. */
    lureRate: number;
    proximity: LureProximity;
}

const POLICIES: Record<LureStageId, LureStagePolicy> = {
    A: { id: 'A', lureRate: 0, proximity: 'none' },
    B: { id: 'B', lureRate: 0.1, proximity: 'distant' },
    C: { id: 'C', lureRate: 0.1, proximity: 'near' },
    D: { id: 'D', lureRate: 0.2, proximity: 'mixed' },
    E: { id: 'E', lureRate: 0.3, proximity: 'nearWeighted' },
};

export function getLureStagePolicy(stage: LureStageId): LureStagePolicy {
    return POLICIES[stage];
}

export function isLureStageId(value: string): value is LureStageId {
    return (LURE_STAGES as string[]).includes(value);
}

/**
 * History lag offsets relative to effective N (lag = effectiveN + offset).
 * Drop n−1 (offset -1) when session n < 3.
 */
export function lureOffsetsForStage(stage: LureStageId, sessionN: number): number[] {
    const policy = getLureStagePolicy(stage);
    const allowMinusOne = sessionN >= 3;

    switch (policy.proximity) {
        case 'none':
            return [];
        case 'distant':
            return [sessionN];
        case 'near':
            return allowMinusOne ? [-1, 1] : [1];
        case 'mixed':
            return allowMinusOne ? [-1, 1, sessionN] : [1, sessionN];
        case 'nearWeighted':
            // Prefer near lags by listing them twice before distant.
            return allowMinusOne ? [-1, 1, -1, 1, sessionN] : [1, 1, sessionN];
    }
}

export function nextLureStage(stage: LureStageId): LureStageId | null {
    const idx = LURE_STAGES.indexOf(stage);
    if (idx < 0 || idx >= LURE_STAGES.length - 1) return null;
    return LURE_STAGES[idx + 1];
}

export function prevLureStage(stage: LureStageId): LureStageId | null {
    const idx = LURE_STAGES.indexOf(stage);
    if (idx <= 0) return null;
    return LURE_STAGES[idx - 1];
}

/** Drop lure stage by 1–2 steps after n increase (plan R6). */
export function reduceLureStageAfterNUp(stage: LureStageId, steps = 2): LureStageId {
    let current = stage;
    for (let i = 0; i < steps; i++) {
        const prev = prevLureStage(current);
        if (prev == null) return current;
        current = prev;
    }
    return current;
}
