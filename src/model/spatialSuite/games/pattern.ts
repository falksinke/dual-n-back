import { blockLength, fixedOnsets, planRoles } from '../engine';
import { between, distance, pick } from '../random';
import type { BlockPlan, Difficulty, LureType, Point, Rng, Trial } from '../types';

export type PatternVariant = 'shape' | 'relation';

/** Level A: a constellation. Identity is the shape up to translation and scale. */
export interface ShapeStimulus {
    kind: 'shape';
    formId: number;
    points: Point[];
}

/** Level B: two objects. Identity is the direction of A as seen from B. */
export interface RelationStimulus {
    kind: 'relation';
    relation: number;
    a: Point;
    b: Point;
}

export type PatternStimulus = ShapeStimulus | RelationStimulus;

export const RELATION_NAMES = ['above', 'above-right', 'right', 'below-right', 'below', 'below-left', 'left', 'above-left'];

/** Normalised form: centred on its bounding box, longest side 1. */
function normalise(points: Point[]): Point[] {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const size = Math.max(maxX - minX, maxY - minY) || 1;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return points.map((p) => ({ x: (p.x - cx) / size, y: (p.y - cy) / size }));
}

/** Largest nearest-neighbour gap between two point sets: 0 means identical forms. */
export function formDistance(a: Point[], b: Point[]): number {
    const na = normalise(a);
    const nb = normalise(b);
    return Math.max(...na.map((p) => Math.min(...nb.map((q) => distance(p, q)))));
}

function randomForm(rng: Rng, dots: number): Point[] {
    for (;;) {
        const points: Point[] = [];
        while (points.length < dots) {
            const p = { x: rng(), y: rng() };
            if (points.every((q) => distance(p, q) > 0.28)) points.push(p);
        }
        const form = normalise(points);
        // Near-symmetric forms would make the mirror lure identical to a target.
        if (formDistance(form, mirror(form)) > 0.18) return form;
    }
}

const mirror = (form: Point[]): Point[] => form.map((p) => ({ x: -p.x, y: p.y }));

function displace(rng: Rng, form: Point[]): Point[] {
    for (;;) {
        const i = Math.floor(rng() * form.length);
        const angle = rng() * Math.PI * 2;
        const shift = between(rng, 0.22, 0.34);
        const moved = form.map((p, j) => j === i ? { x: p.x + Math.cos(angle) * shift, y: p.y + Math.sin(angle) * shift } : p);
        const next = normalise(moved);
        const spaced = next.every((p, a) => next.every((q, b) => a === b || distance(p, q) > 0.2));
        if (spaced && formDistance(next, form) > 0.12) return next;
    }
}

/** Places a normalised form at a random scale and position in the unit square. */
function place(rng: Rng, form: Point[]): Point[] {
    const scale = between(rng, 0.34, 0.62);
    const half = scale / 2 + 0.06;
    const cx = between(rng, half, 1 - half);
    const cy = between(rng, half, 1 - half);
    return form.map((p) => ({ x: cx + p.x * scale, y: cy + p.y * scale }));
}

function generateShapes(difficulty: Difficulty, rng: Rng): Trial<ShapeStimulus>[] {
    const { n } = difficulty;
    const dots = Math.round(difficulty.extra) || 3;
    const length = blockLength(n);
    const roles = planRoles(length, n, difficulty.lureRate, rng);
    const forms = new Map<number, Point[]>();
    const ids: number[] = [];
    let nextId = 0;
    const register = (form: Point[]): number => {
        forms.set(nextId, form);
        return nextId++;
    };

    return Array.from({ length }, (_, t): Trial<ShapeStimulus> => {
        const refId = t >= n ? ids[t - n] : undefined;
        let formId: number;
        let lureType: LureType | null = null;
        if (roles[t] === 'target' && refId !== undefined) {
            formId = refId;
        } else if (roles[t] === 'lure' && refId !== undefined) {
            const echoes = [t - n + 1, t - n - 1]
                .filter((i) => i >= 0 && i < t && (i !== t - n + 1 || n >= 2) && ids[i] !== refId);
            const options: LureType[] = ['mirror', 'displaced', ...(echoes.length > 0 ? ['n-minus-1' as const] : [])];
            lureType = pick(rng, options);
            const ref = forms.get(refId)!;
            if (lureType === 'mirror') formId = register(mirror(ref));
            else if (lureType === 'displaced') formId = register(displace(rng, ref));
            else {
                const echo = pick(rng, echoes);
                lureType = echo === t - n + 1 ? 'n-minus-1' : 'n-plus-1';
                formId = ids[echo];
            }
        } else {
            formId = register(randomForm(rng, dots));
        }
        ids.push(formId);
        return {
            index: t,
            stimulus: { kind: 'shape', formId, points: place(rng, forms.get(formId)!) },
            isTarget: refId !== undefined && refId === formId,
            isLure: lureType !== null,
            lureType,
            rule: 'shape',
        };
    });
}

function placeRelation(rng: Rng, relation: number): { a: Point; b: Point } {
    // Jitter stays well inside the 45° sector so the relation is never ambiguous.
    const angle = (relation * 45 - 90 + between(rng, -8, 8)) * (Math.PI / 180);
    const gap = between(rng, 0.2, 0.36);
    const dx = (Math.cos(angle) * gap) / 2;
    const dy = (Math.sin(angle) * gap) / 2;
    const margin = 0.1;
    const cx = between(rng, margin + Math.abs(dx), 1 - margin - Math.abs(dx));
    const cy = between(rng, margin + Math.abs(dy), 1 - margin - Math.abs(dy));
    return { a: { x: cx + dx, y: cy + dy }, b: { x: cx - dx, y: cy - dy } };
}

function generateRelations(difficulty: Difficulty, rng: Rng): Trial<RelationStimulus>[] {
    const { n } = difficulty;
    const length = blockLength(n);
    const roles = planRoles(length, n, difficulty.lureRate, rng);
    const relations: number[] = [];
    const placements: { a: Point; b: Point }[] = [];

    return Array.from({ length }, (_, t): Trial<RelationStimulus> => {
        const ref = t >= n ? relations[t - n] : undefined;
        let relation: number;
        let lureType: LureType | null = null;
        if (roles[t] === 'target' && ref !== undefined) {
            relation = ref;
        } else if (roles[t] === 'lure' && ref !== undefined) {
            lureType = 'inverse';
            relation = (ref + 4) % 8;
        } else {
            const avoid = ref === undefined ? [] : [ref, (ref + 4) % 8];
            relation = pick(rng, [0, 1, 2, 3, 4, 5, 6, 7].filter((r) => !avoid.includes(r)));
        }
        // Keep absolute positions moving: never reuse the previous screen placement.
        let placement = placeRelation(rng, relation);
        const previous = placements[t - 1];
        for (let i = 0; previous && i < 20 && distance(placement.a, previous.a) < 0.12; i++) placement = placeRelation(rng, relation);
        relations.push(relation);
        placements.push(placement);
        return {
            index: t,
            stimulus: { kind: 'relation', relation, ...placement },
            isTarget: ref !== undefined && ref === relation,
            isLure: lureType !== null,
            lureType,
            rule: 'relation',
        };
    });
}

export function generatePattern(variant: PatternVariant, difficulty: Difficulty, rng: Rng): BlockPlan<PatternStimulus> {
    const trials: Trial<PatternStimulus>[] = variant === 'shape' ? generateShapes(difficulty, rng) : generateRelations(difficulty, rng);
    return {
        game: 'pattern',
        track: variant === 'shape' ? 'pattern-shape' : 'pattern-relation',
        difficulty,
        trials,
        onsets: fixedOnsets(trials.length, difficulty),
        rules: [variant],
        holdout: false,
    };
}
