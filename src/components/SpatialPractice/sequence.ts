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
