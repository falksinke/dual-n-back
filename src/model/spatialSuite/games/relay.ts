import { blockLength, planRoles } from '../engine';
import { between, distance, pick, shuffle } from '../random';
import type { BlockPlan, Difficulty, LureType, Point, Rng, Trial } from '../types';

/** Straight-line motion reflected off the arena walls, so any moment has a closed form. */
export interface Mover {
    x0: number;
    y0: number;
    vx: number;
    vy: number;
}

export interface RelayStimulus {
    /** Object that flashes on this trial. */
    object: number;
    /** Where it was when it flashed. */
    p: Point;
}

export interface RelayPlan extends BlockPlan<RelayStimulus> {
    movers: Mover[];
    /** Objects the player must also keep track of until the end of the block. */
    tracked: number[];
    /** Motion starts this long before the first flash so the tracked targets can be learned. */
    previewMs: number;
}

const MIN = 0.07;
const MAX = 0.93;
export const RELAY_TOLERANCE = 0.14;
export const RELAY_PREVIEW_MS = 3000;
const TRACKED = 2;

/** Triangle wave that folds an unbounded coordinate back into [MIN, MAX]. */
function fold(value: number): number {
    const span = MAX - MIN;
    const m = (((value - MIN) % (2 * span)) + 2 * span) % (2 * span);
    return MIN + (m <= span ? m : 2 * span - m);
}

/** Position of a mover `ms` after motion starts. */
export function moverAt(mover: Mover, ms: number): Point {
    const s = ms / 1000;
    return { x: fold(mover.x0 + mover.vx * s), y: fold(mover.y0 + mover.vy * s) };
}

function createMovers(rng: Rng, count: number): Mover[] {
    const movers: Mover[] = [];
    while (movers.length < count) {
        const x0 = between(rng, MIN, MAX);
        const y0 = between(rng, MIN, MAX);
        if (movers.some((m) => Math.hypot(m.x0 - x0, m.y0 - y0) < 0.18)) continue;
        const angle = rng() * Math.PI * 2;
        const speed = between(rng, 0.15, 0.22);
        movers.push({ x0, y0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
    }
    return movers;
}

interface Candidate {
    time: number;
    object: number;
    p: Point;
}

export function generateRelay(difficulty: Difficulty, rng: Rng): RelayPlan {
    const { n } = difficulty;
    const r = RELAY_TOLERANCE;
    const count = Math.round(difficulty.extra) || 4;
    const length = blockLength(n);
    const roles = planRoles(length, n, difficulty.lureRate, rng);
    const movers = createMovers(rng, count);
    const tracked = shuffle(rng, movers.map((_, i) => i)).slice(0, TRACKED);
    const period = difficulty.stimulusMs + difficulty.isiMs;
    // Flashes land at irregular moments; the jitter also gives the planner room to place targets.
    const jitter = Math.min(450, difficulty.isiMs * 0.3);
    const flashes: Candidate[] = [];
    const trials: Trial<RelayStimulus>[] = [];

    for (let t = 0; t < length; t++) {
        const base = RELAY_PREVIEW_MS + t * period;
        const earliest = t === 0 ? base : Math.max(base - jitter, flashes[t - 1].time + difficulty.stimulusMs + 500);
        // Planned targets may wait longer for an object to pass the remembered spot.
        const latest = base + (roles[t] === 'target' ? Math.max(jitter, difficulty.isiMs * 0.55) : jitter);
        const candidates: Candidate[] = [];
        for (let time = earliest; time <= latest; time += 50) {
            movers.forEach((mover, object) => {
                // The same object rarely flashes twice running, unless it is carrying a target.
                if (t > 0 && object === flashes[t - 1].object && roles[t] !== 'target') return;
                candidates.push({ time, object, p: moverAt(mover, time) });
            });
        }
        const ref = t >= n ? flashes[t - n].p : undefined;
        const before = t - n + 1 >= 0 && n >= 2 ? flashes[t - n + 1].p : undefined;
        const after = t - n - 1 >= 0 ? flashes[t - n - 1].p : undefined;
        const far = (c: Candidate, p: Point | undefined, min: number) => !p || distance(c.p, p) > min;
        let pool: Candidate[] = [];
        let lureType: LureType | null = null;

        if (roles[t] === 'target' && ref) {
            pool = candidates.filter((c) => distance(c.p, ref) <= r * 0.85);
        } else if (roles[t] === 'lure' && ref) {
            const near = candidates.filter((c) => {
                const d = distance(c.p, ref);
                return d >= r * 1.2 && d <= r * 1.6;
            });
            const echo = candidates.filter((c) => far(c, ref, r * 2)
                && ((before && distance(c.p, before) <= r * 0.6) || (after && distance(c.p, after) <= r * 0.6)));
            pool = echo.length > 0 && (near.length === 0 || rng() < 0.4) ? echo : near;
            if (pool.length > 0) lureType = pool === near ? 'near-miss' : 'n-minus-1';
        }

        if (pool.length === 0) {
            lureType = null;
            const clean = candidates.filter((c) => far(c, ref, r * 2) && far(c, before, r) && far(c, after, r));
            const fallback = candidates.filter((c) => far(c, ref, r));
            const onTime = (options: Candidate[]) => options.filter((c) => Math.abs(c.time - base) <= 150);
            const inWindow = (c: Candidate) => c.time <= base + jitter;
            pool = [onTime(clean), clean.filter(inWindow), fallback.filter(inWindow), candidates.filter(inWindow)]
                .find((options) => options.length > 0) ?? candidates;
        }

        // Plan ahead: if trial t + n must match this flash, flash where another object will pass by then.
        if (roles[t + n] === 'target') {
            const futureBase = RELAY_PREVIEW_MS + (t + n) * period;
            const reachable = pool.filter((c) => movers.some((mover, object) => {
                if (object === c.object && n === 1) return false;
                for (let time = futureBase - jitter; time <= futureBase + Math.max(jitter, difficulty.isiMs * 0.55); time += 50) {
                    if (distance(moverAt(mover, time), c.p) <= r * 0.7) return true;
                }
                return false;
            }));
            if (reachable.length > 0) pool = reachable;
        }

        const chosen = pick(rng, pool);
        if (lureType === 'n-minus-1' && !(before && distance(chosen.p, before) <= r * 0.6)) lureType = 'n-plus-1';
        flashes.push(chosen);
        trials.push({
            index: t,
            stimulus: { object: chosen.object, p: chosen.p },
            isTarget: ref !== undefined && distance(chosen.p, ref) <= r,
            isLure: lureType !== null,
            lureType,
            rule: null,
        });
    }

    return {
        game: 'relay',
        track: 'relay',
        difficulty,
        trials,
        onsets: flashes.map((flash) => flash.time),
        rules: [],
        holdout: false,
        movers,
        tracked,
        previewMs: RELAY_PREVIEW_MS,
    };
}
