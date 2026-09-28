import { interferenceLureOffsets } from '../../model/interference';

export const CELL_COUNT = 9;
export const MIDDLE_CELL = 4;
const ALL_CELLS = Array.from({ length: CELL_COUNT }, (_, cell) => cell);

function deliveryCells(middleWindowEnabled: boolean): number[] {
    return middleWindowEnabled ? ALL_CELLS : ALL_CELLS.filter((cell) => cell !== MIDDLE_CELL);
}

/** Reuse the regular game's near-miss lags over the actual presentation history. */
export function createSequence(
    length: number,
    previous: number[],
    history: number[],
    interference: number,
    middleWindowEnabled = true,
): number[] {
    const next: number[] = [];
    const cells = deliveryCells(middleWindowEnabled);
    for (let index = 0; index < length; index += 1) {
        const seen = [...history, ...next];
        const reference = seen[seen.length - length];
        const lures = interferenceLureOffsets(length)
            .map((offset) => seen[seen.length - (length + offset)])
            .filter((cell): cell is number => cell !== undefined && cell !== reference && cells.includes(cell));
        const unused = cells.filter((cell) => !next.includes(cell));
        // Nine stops still fit an eight-window village; repeat a window after all eight are used.
        const pool = Math.random() < interference && lures.length > 0 ? lures : unused.length > 0 ? unused : cells;
        next.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    // A fresh round must differ even at length one or with saturated interference.
    if (next.every((cell, index) => cell === previous[index])) {
        const replacement = cells.find((cell) => !next.includes(cell));
        if (replacement !== undefined) next[0] = replacement;
        else if (next.length > 1 && next[0] !== next[1]) [next[0], next[1]] = [next[1], next[0]];
        else next[0] = cells.find((cell) => cell !== next[0]) ?? next[0];
    }
    return next;
}

/** Keep the last N-1 stops and add one fresh draw at the end. */
export function advanceEndbackSequence(previous: number[], interference: number, middleWindowEnabled = true): number[] {
    const retained = previous.slice(1);
    const cells = deliveryCells(middleWindowEnabled);
    const unused = cells.filter((cell) => !previous.includes(cell));
    const freeAfterDrop = cells.filter((cell) => !retained.includes(cell));
    // When every address is occupied, a repeated stop is unavoidable.
    const pool = retained.length > 0 && Math.random() < interference
        ? retained : unused.length > 0 ? unused : freeAfterDrop.length > 0 ? freeAfterDrop : cells;
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
