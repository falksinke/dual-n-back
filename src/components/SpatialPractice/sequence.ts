import { interferenceLureOffsets } from '../../model/interference';

export const CELL_COUNT = 9;

/** Reuse the regular game's near-miss lags over the actual presentation history. */
export function createSequence(
    length: number,
    previous: number[],
    history: number[],
    interference: number,
): number[] {
    const next: number[] = [];
    for (let index = 0; index < length; index += 1) {
        const seen = [...history, ...next];
        const reference = seen[seen.length - length];
        const lures = interferenceLureOffsets(length)
            .map((offset) => seen[seen.length - (length + offset)])
            .filter((cell): cell is number => cell !== undefined && cell !== reference);
        const unused = Array.from({ length: CELL_COUNT }, (_, cell) => cell)
            .filter((cell) => !next.includes(cell));
        const pool = Math.random() < interference && lures.length > 0 ? lures : unused;
        next.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    // A fresh round must differ even at length one or with saturated interference.
    if (next.every((cell, index) => cell === previous[index])) {
        const replacement = Array.from({ length: CELL_COUNT }, (_, cell) => cell)
            .find((cell) => !next.includes(cell));
        if (replacement !== undefined) next[0] = replacement;
        else [next[0], next[1]] = [next[1], next[0]];
    }
    return next;
}

/** Keep the last N-1 stops and add one fresh draw at the end. */
export function advanceEndbackSequence(previous: number[], interference: number): number[] {
    const retained = previous.slice(1);
    const unused = Array.from({ length: CELL_COUNT }, (_, cell) => cell)
        .filter((cell) => !previous.includes(cell));
    // At length nine every window was already used, so the dropped stop is the only free one.
    const pool = retained.length > 0 && Math.random() < interference
        ? retained : unused.length > 0 ? unused : [previous[0]];
    return [...retained, pool[Math.floor(Math.random() * pool.length)]];
}

export type HiddenPlacement = 'first' | 'random';

/** The newly appended stop must stay visible: it cannot be recalled otherwise. */
export function chooseHiddenPositions(length: number, count: number, placement: HiddenPlacement): Set<number> {
    const candidates = Array.from({ length: Math.max(0, length - 1) }, (_, index) => index);
    if (placement === 'random') {
        for (let index = candidates.length - 1; index > 0; index -= 1) {
            const swap = Math.floor(Math.random() * (index + 1));
            [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]];
        }
    }
    return new Set(candidates.slice(0, count));
}
