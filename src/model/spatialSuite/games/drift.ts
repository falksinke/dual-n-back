import { blockLength, fixedOnsets, planRoles } from '../engine';
import { between, distance, inBounds, pick, pointAround, sampleUntil } from '../random';
import type { BlockPlan, Difficulty, LureType, Point, Rng, Trial } from '../types';

export interface DriftStimulus {
    p: Point;
}

const MARGIN = 0.06;
/** Consecutive dots must not sit on top of each other unless the rule asks for it. */
const MIN_SPACING = 0.12;

/** Match tolerance in unit-square distance, from the diagonal fraction dial. */
export const driftTolerance = (difficulty: Difficulty): number => difficulty.extra * Math.SQRT2;

const randomPoint = (rng: Rng): Point => ({ x: between(rng, MARGIN, 1 - MARGIN), y: between(rng, MARGIN, 1 - MARGIN) });

export function generateDrift(difficulty: Difficulty, rng: Rng): BlockPlan<DriftStimulus> {
    const { n } = difficulty;
    const r = driftTolerance(difficulty);
    const length = blockLength(n);
    const roles = planRoles(length, n, difficulty.lureRate, rng);
    const points: Point[] = [];
    const trials: Trial<DriftStimulus>[] = [];

    const spaced = (p: Point, t: number): boolean => t === 0 || distance(p, points[t - 1]) >= MIN_SPACING;
    const farFrom = (p: Point, ref: Point | undefined, min: number): boolean => !ref || distance(p, ref) > min;

    for (let t = 0; t < length; t++) {
        const ref = t >= n ? points[t - n] : undefined;
        const before = t - n + 1 >= 0 && n >= 2 ? points[t - n + 1] : undefined;
        const after = t - n - 1 >= 0 ? points[t - n - 1] : undefined;
        let p: Point | null = null;
        let lureType: LureType | null = null;

        if (roles[t] === 'target' && ref) {
            p = sampleUntil(() => pointAround(rng, ref, 0, r * 0.6), (c) => inBounds(c, MARGIN));
        } else if (roles[t] === 'lure' && ref) {
            const options: LureType[] = ['near-miss', 'near-miss'];
            if (before) options.push('n-minus-1');
            if (after) options.push('n-plus-1');
            lureType = pick(rng, options);
            if (lureType === 'near-miss') {
                p = sampleUntil(() => pointAround(rng, ref, r * 1.15, r * 1.5), (c) => inBounds(c, MARGIN) && spaced(c, t));
            } else {
                const echo = lureType === 'n-minus-1' ? before! : after!;
                p = sampleUntil(
                    () => pointAround(rng, echo, 0, r * 0.6),
                    (c) => inBounds(c, MARGIN) && spaced(c, t) && farFrom(c, ref, r * 2)
                );
            }
            if (!p) lureType = null;
        }

        if (!p) {
            p = sampleUntil(
                () => randomPoint(rng),
                (c) => spaced(c, t) && farFrom(c, ref, r * 2) && farFrom(c, before, r) && farFrom(c, after, r)
            ) ?? randomPoint(rng);
        }

        points.push(p);
        trials.push({
            index: t,
            stimulus: { p },
            isTarget: ref !== undefined && distance(p, ref) <= r,
            isLure: lureType !== null,
            lureType,
            rule: null,
        });
    }

    return { game: 'drift', track: 'drift', difficulty, trials, onsets: fixedOnsets(length, difficulty), rules: [], holdout: false };
}
