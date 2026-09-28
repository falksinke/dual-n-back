import { blockLength, fixedOnsets, planRoles } from '../engine';
import { pick } from '../random';
import type { BlockPlan, Difficulty, LureType, Rng, Trial } from '../types';

/** Direction 0 is north; directions step clockwise in 45° turns. */
export interface WayfinderStimulus {
    dir: number;
    steps: number;
}

type Vec = [number, number];

/** Screen convention: y grows downwards, so north is -y. */
const UNIT: Vec[] = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
export const DIRECTION_NAMES = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

const MOVES: WayfinderStimulus[] = UNIT.flatMap((_, dir) => [1, 2, 3].map((steps) => ({ dir, steps })));

export const moveVector = ({ dir, steps }: WayfinderStimulus): Vec => [UNIT[dir][0] * steps, UNIT[dir][1] * steps];

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const isZero = (v: Vec): boolean => v[0] === 0 && v[1] === 0;
const chebyshev = (v: Vec): number => Math.max(Math.abs(v[0]), Math.abs(v[1]));

/** The single move that produces `v`, if one exists. */
function moveFor(v: Vec): WayfinderStimulus | null {
    return MOVES.find((m) => {
        const mv = moveVector(m);
        return mv[0] === v[0] && mv[1] === v[1];
    }) ?? null;
}

function sumMoves(moves: WayfinderStimulus[], from: number, to: number): Vec {
    let total: Vec = [0, 0];
    for (let i = Math.max(0, from); i <= to; i++) total = add(total, moveVector(moves[i]));
    return total;
}

/** Positions after each move; the walk starts at the origin. */
export function wayfinderPositions(moves: WayfinderStimulus[]): Vec[] {
    let position: Vec = [0, 0];
    return moves.map((move) => (position = add(position, moveVector(move))));
}

export function generateWayfinder(difficulty: Difficulty, rng: Rng): BlockPlan<WayfinderStimulus> {
    const n = Math.max(2, difficulty.n);
    const length = blockLength(n);
    const roles = planRoles(length, n, difficulty.lureRate, rng);
    const moves: WayfinderStimulus[] = [];
    const trials: Trial<WayfinderStimulus>[] = [];

    for (let t = 0; t < length; t++) {
        // Displacement since the position n moves ago, before this trial's move.
        const window = t >= n ? sumMoves(moves, t - n + 1, t - 1) : null;
        const windowBefore = t >= n && n >= 3 ? sumMoves(moves, t - n + 2, t - 1) : null;
        const windowAfter = t >= n ? sumMoves(moves, t - n, t - 1) : null;
        const echoes = (m: WayfinderStimulus): boolean => {
            const v = moveVector(m);
            return (windowBefore !== null && isZero(add(windowBefore, v)))
                || (windowAfter !== null && isZero(add(windowAfter, v)));
        };
        let candidates: WayfinderStimulus[] = [];
        let lureType: LureType | null = null;

        if (roles[t] === 'target' && window) {
            const move = moveFor([-window[0], -window[1]]);
            if (move) candidates = [move];
        } else if (roles[t] === 'lure' && window) {
            const offByOne = MOVES.filter((m) => chebyshev(add(window, moveVector(m))) === 1);
            const echo = MOVES.filter((m) => echoes(m) && !isZero(add(window, moveVector(m))));
            const useEcho = echo.length > 0 && (offByOne.length === 0 || rng() < 0.4);
            candidates = useEcho ? echo : offByOne;
            if (candidates.length > 0) lureType = useEcho ? 'n-minus-1' : 'off-by-one';
        }

        if (candidates.length === 0) {
            lureType = null;
            candidates = MOVES.filter((m) => !window || (chebyshev(add(window, moveVector(m))) > 1 && !echoes(m)));
            if (candidates.length === 0) candidates = MOVES;
        }

        // When the next trial must return home, keep that return a single legal move.
        if (roles[t + 1] === 'target' && t + 1 >= n && lureType === null && roles[t] !== 'target') {
            const prefix = sumMoves(moves, t - n + 2, t - 1);
            const reachable = candidates.filter((m) => {
                const v = add(prefix, moveVector(m));
                return !isZero(v) && moveFor([-v[0], -v[1]]) !== null;
            });
            if (reachable.length > 0) candidates = reachable;
        }

        const move = pick(rng, candidates);
        if (lureType === 'n-minus-1' && !(windowBefore && isZero(add(windowBefore, moveVector(move))))) {
            lureType = 'n-plus-1';
        }
        moves.push(move);
        const displacement = window ? add(window, moveVector(move)) : null;
        trials.push({
            index: t,
            stimulus: move,
            isTarget: displacement !== null && isZero(displacement),
            isLure: lureType !== null,
            lureType,
            rule: null,
        });
    }

    return {
        game: 'wayfinder',
        track: 'wayfinder',
        difficulty: { ...difficulty, n },
        trials,
        onsets: fixedOnsets(length, difficulty),
        rules: [],
        holdout: false,
    };
}
