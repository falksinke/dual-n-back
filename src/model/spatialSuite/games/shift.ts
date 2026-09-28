import { blockLength, fixedOnsets, planRoles } from '../engine';
import { between, pick, sampleUntil, shuffle } from '../random';
import type { BlockPlan, Difficulty, LureType, Point, Rng, Trial } from '../types';

export type ShiftRule = 'screen' | 'object' | 'mirror' | 'angle' | 'radius';
export type MirrorAxis = 'vertical' | 'horizontal';

export const SHIFT_RULES: ShiftRule[] = ['screen', 'object', 'mirror', 'angle', 'radius'];

export const RULE_LABELS: Record<ShiftRule, { name: string; cue: string }> = {
    screen: { name: 'Screen', cue: 'Same spot on screen' },
    object: { name: 'Object', cue: 'Same spot relative to the marker' },
    mirror: { name: 'Mirror', cue: 'Mirror the earlier spot across the line' },
    angle: { name: 'Angle', cue: 'Same direction from the centre' },
    radius: { name: 'Radius', cue: 'Same distance from the centre' },
};

export interface ShiftStimulus {
    p: Point;
    /** Rotation of the reference marker, in degrees. */
    frame: number;
    rule: ShiftRule;
    axis: MirrorAxis | null;
}

export const CENTRE: Point = { x: 0.5, y: 0.5 };
export const ARENA_RADIUS = 0.44;
const MIN_R = 0.1;
const MAX_R = 0.4;
const POSITION_TOLERANCE = 0.075;
const ANGLE_TOLERANCE = 14;
const RADIUS_TOLERANCE = 0.035;

interface Polar {
    r: number;
    /** Degrees, 0 = east, clockwise on screen. */
    a: number;
}

const toPolar = (p: Point): Polar => ({
    r: Math.hypot(p.x - CENTRE.x, p.y - CENTRE.y),
    a: ((Math.atan2(p.y - CENTRE.y, p.x - CENTRE.x) * 180) / Math.PI + 360) % 360,
});

const fromPolar = ({ r, a }: Polar): Point => ({
    x: CENTRE.x + r * Math.cos((a * Math.PI) / 180),
    y: CENTRE.y + r * Math.sin((a * Math.PI) / 180),
});

const angleGap = (a: number, b: number): number => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
};

const mirrorPoint = (p: Point, axis: MirrorAxis): Point =>
    axis === 'vertical' ? { x: 1 - p.x, y: p.y } : { x: p.x, y: 1 - p.y };

/** Where the earlier spot should appear now for a match under `rule`. */
function expected(rule: ShiftRule, earlier: ShiftStimulus, current: { frame: number; axis: MirrorAxis | null }): Point | null {
    switch (rule) {
        case 'screen': return earlier.p;
        case 'object': {
            const polar = toPolar(earlier.p);
            return fromPolar({ r: polar.r, a: polar.a - earlier.frame + current.frame });
        }
        case 'mirror': return mirrorPoint(earlier.p, current.axis ?? 'vertical');
        default: return null;
    }
}

/** True when `current` matches `earlier` under the current trial's rule. */
export function shiftMatches(rule: ShiftRule, earlier: ShiftStimulus, current: ShiftStimulus): boolean {
    const now = toPolar(current.p);
    const then = toPolar(earlier.p);
    if (rule === 'angle') return angleGap(now.a, then.a) <= ANGLE_TOLERANCE;
    if (rule === 'radius') return Math.abs(now.r - then.r) <= RADIUS_TOLERANCE;
    const spot = expected(rule, earlier, current)!;
    return Math.hypot(spot.x - current.p.x, spot.y - current.p.y) <= POSITION_TOLERANCE;
}

const randomPolar = (rng: Rng): Polar => ({ r: between(rng, MIN_R, MAX_R), a: rng() * 360 });

/** A spot that matches `earlier` under `rule`, comfortably inside tolerance. */
function matchingSpot(rng: Rng, rule: ShiftRule, earlier: ShiftStimulus, current: { frame: number; axis: MirrorAxis | null }): Point {
    const then = toPolar(earlier.p);
    if (rule === 'angle') {
        // Same bearing at a clearly different distance, so it is not a screen match too.
        const r = sampleUntil(() => between(rng, MIN_R, MAX_R), (value) => Math.abs(value - then.r) > 0.1) ?? MAX_R;
        return fromPolar({ r, a: then.a + between(rng, -4, 4) });
    }
    if (rule === 'radius') {
        const a = sampleUntil(() => rng() * 360, (value) => angleGap(value, then.a) > 60) ?? (then.a + 180);
        return fromPolar({ r: then.r + between(rng, -0.01, 0.01), a });
    }
    const spot = expected(rule, earlier, current)!;
    const polar = toPolar(spot);
    return fromPolar({ r: Math.min(MAX_R, polar.r + between(rng, -0.012, 0.012)), a: polar.a + between(rng, -2, 2) });
}

/** Rule sequence for a block: runs of one rule with adaptive switch probability. */
export function planRules(length: number, deck: ShiftRule[], switchRate: number, rng: Rng): ShiftRule[] {
    const rules: ShiftRule[] = [];
    let current = pick(rng, deck);
    for (let t = 0; t < length; t++) {
        if (t > 0 && deck.length > 1 && rng() < switchRate) current = pick(rng, deck.filter((r) => r !== current));
        rules.push(current);
    }
    return rules;
}

/** Draws this session's deck: 2–3 trained rules, never the same set twice running. */
export function drawDeck(rng: Rng, holdout: ShiftRule, previous: ShiftRule[] | null): ShiftRule[] {
    const trained = SHIFT_RULES.filter((rule) => rule !== holdout);
    const key = (deck: ShiftRule[]) => [...deck].sort().join(',');
    for (let i = 0; i < 50; i++) {
        const deck = shuffle(rng, trained).slice(0, rng() < 0.5 ? 2 : 3);
        if (!previous || key(deck) !== key(previous)) return deck;
    }
    return trained.slice(0, 2);
}

export function generateShift(
    difficulty: Difficulty,
    deck: ShiftRule[],
    rng: Rng,
    holdout = false
): BlockPlan<ShiftStimulus> {
    const { n } = difficulty;
    const length = blockLength(n);
    const roles = planRoles(length, n, difficulty.lureRate, rng);
    const rules = planRules(length, deck, difficulty.extra, rng);
    const stimuli: ShiftStimulus[] = [];
    const trials: Trial<ShiftStimulus>[] = [];

    for (let t = 0; t < length; t++) {
        const rule = rules[t];
        const frame = rng() * 360;
        const axis: MirrorAxis | null = rule === 'mirror' ? pick(rng, ['vertical', 'horizontal'] as const) : null;
        const shell = { frame, axis, rule };
        const earlier = t >= n ? stimuli[t - n] : undefined;
        const matches = (p: Point, r: ShiftRule) => earlier !== undefined && shiftMatches(r, earlier, { ...shell, p });
        let p: Point | null = null;
        let lureType: LureType | null = null;

        if (roles[t] === 'target' && earlier) {
            p = matchingSpot(rng, rule, earlier, shell);
        } else if (roles[t] === 'lure' && earlier) {
            // A lure is a match under another rule: the one a switch cost would trap you with.
            const others = SHIFT_RULES.filter((r) => r !== rule);
            const preferred = others.filter((r) => deck.includes(r));
            const pool = preferred.length > 0 ? preferred : others;
            for (const other of shuffle(rng, pool)) {
                const candidate = matchingSpot(rng, other, earlier, shell);
                const polar = toPolar(candidate);
                if (!matches(candidate, rule) && polar.r >= MIN_R * 0.8 && polar.r <= MAX_R) {
                    p = candidate;
                    lureType = 'other-rule';
                    break;
                }
            }
        }

        if (!p) {
            p = sampleUntil(
                () => fromPolar(randomPolar(rng)),
                (c) => !earlier || deck.concat(rule).every((r) => !matches(c, r))
            ) ?? sampleUntil(() => fromPolar(randomPolar(rng)), (c) => !matches(c, rule)) ?? fromPolar(randomPolar(rng));
        }

        const stimulus: ShiftStimulus = { p, frame, rule, axis };
        stimuli.push(stimulus);
        trials.push({
            index: t,
            stimulus,
            isTarget: earlier !== undefined && shiftMatches(rule, earlier, stimulus),
            isLure: lureType !== null,
            lureType,
            rule,
        });
    }

    return {
        game: 'shift',
        track: 'shift',
        difficulty,
        trials,
        onsets: fixedOnsets(length, difficulty),
        rules: deck,
        holdout,
    };
}
