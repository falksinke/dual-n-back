import { GRID_DIMENSIONS, getGridSize } from './difficulty';
import { sameTokenIdentity } from './tokens';
import type {
    AtomicOperation,
    GridLayout,
    OperationCard,
    SwappingLayout,
    SwappingResult,
    SwappingToken,
} from './types';

function invalidOperation(message: string): SwappingResult<never> {
    return { ok: false, error: { code: 'invalid-operation', message } };
}

function isValidIndex(index: number, length: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < length;
}

function validateGridLength(
    arrangement: readonly SwappingToken[],
    layout: GridLayout
): SwappingResult<{ rows: number; columns: number }> {
    const dimensions = GRID_DIMENSIONS[layout];
    if (arrangement.length !== getGridSize(layout)) {
        return invalidOperation(`${layout} operations require ${getGridSize(layout)} items.`);
    }
    return { ok: true, value: dimensions };
}

export function observableArrangementsEqual(
    first: readonly SwappingToken[],
    second: readonly SwappingToken[]
): boolean {
    return (
        first.length === second.length &&
        first.every((token, index) => sameTokenIdentity(token, second[index]))
    );
}

export function applyAtomicOperation(
    arrangement: readonly SwappingToken[],
    operation: AtomicOperation,
    layout: SwappingLayout
): SwappingResult<readonly SwappingToken[]> {
    const next = [...arrangement];

    switch (operation.type) {
        case 'swap': {
            if (
                !isValidIndex(operation.first, next.length) ||
                !isValidIndex(operation.second, next.length) ||
                operation.first === operation.second
            ) {
                return invalidOperation('Swap requires two distinct positions on the board.');
            }
            [next[operation.first], next[operation.second]] = [
                next[operation.second],
                next[operation.first],
            ];
            return { ok: true, value: next };
        }

        case 'reverse-span':
        case 'shift-span': {
            if (layout !== 'sequence') {
                return invalidOperation('Span operations are available for sequences only.');
            }
            if (
                !isValidIndex(operation.start, next.length) ||
                !isValidIndex(operation.end, next.length) ||
                operation.end - operation.start + 1 < 3
            ) {
                return invalidOperation('A span must contain at least three consecutive positions.');
            }

            const span = next.slice(operation.start, operation.end + 1);
            if (operation.type === 'reverse-span') {
                span.reverse();
            } else if (operation.direction === 'left') {
                span.push(span.shift()!);
            } else {
                span.unshift(span.pop()!);
            }
            next.splice(operation.start, span.length, ...span);
            return { ok: true, value: next };
        }

        case 'swap-rows': {
            if (layout === 'sequence') {
                return invalidOperation('Row operations require a grid.');
            }
            const grid = validateGridLength(arrangement, layout);
            if (!grid.ok) return grid;
            const { rows, columns } = grid.value;
            if (
                !isValidIndex(operation.first, rows) ||
                !isValidIndex(operation.second, rows) ||
                operation.first === operation.second
            ) {
                return invalidOperation('Swap rows requires two distinct rows.');
            }
            for (let column = 0; column < columns; column++) {
                const firstIndex = operation.first * columns + column;
                const secondIndex = operation.second * columns + column;
                [next[firstIndex], next[secondIndex]] = [next[secondIndex], next[firstIndex]];
            }
            return { ok: true, value: next };
        }

        case 'swap-columns': {
            if (layout === 'sequence') {
                return invalidOperation('Column operations require a grid.');
            }
            const grid = validateGridLength(arrangement, layout);
            if (!grid.ok) return grid;
            const { rows, columns } = grid.value;
            if (
                !isValidIndex(operation.first, columns) ||
                !isValidIndex(operation.second, columns) ||
                operation.first === operation.second
            ) {
                return invalidOperation('Swap columns requires two distinct columns.');
            }
            for (let row = 0; row < rows; row++) {
                const firstIndex = row * columns + operation.first;
                const secondIndex = row * columns + operation.second;
                [next[firstIndex], next[secondIndex]] = [next[secondIndex], next[firstIndex]];
            }
            return { ok: true, value: next };
        }

        case 'mirror-left-right': {
            if (layout === 'sequence') {
                return invalidOperation('Grid mirroring requires a grid.');
            }
            const grid = validateGridLength(arrangement, layout);
            if (!grid.ok) return grid;
            const { rows, columns } = grid.value;
            for (let row = 0; row < rows; row++) {
                const start = row * columns;
                next.splice(start, columns, ...next.slice(start, start + columns).reverse());
            }
            return { ok: true, value: next };
        }

        case 'mirror-top-bottom': {
            if (layout === 'sequence') {
                return invalidOperation('Grid mirroring requires a grid.');
            }
            const grid = validateGridLength(arrangement, layout);
            if (!grid.ok) return grid;
            const { rows, columns } = grid.value;
            const reversed: SwappingToken[] = [];
            for (let row = rows - 1; row >= 0; row--) {
                reversed.push(...next.slice(row * columns, (row + 1) * columns));
            }
            return { ok: true, value: reversed };
        }

        case 'rotate-clockwise': {
            if (layout === 'sequence' || layout === '2x3') {
                return invalidOperation('Clockwise rotation requires a square grid.');
            }
            const grid = validateGridLength(arrangement, layout);
            if (!grid.ok) return grid;
            const { rows, columns } = grid.value;
            const rotated = Array<SwappingToken>(next.length);
            for (let row = 0; row < rows; row++) {
                for (let column = 0; column < columns; column++) {
                    const targetRow = column;
                    const targetColumn = rows - 1 - row;
                    rotated[targetRow * columns + targetColumn] = next[row * columns + column];
                }
            }
            return { ok: true, value: rotated };
        }
    }
}

export function applyNovelOperation(
    current: readonly SwappingToken[],
    operation: AtomicOperation,
    layout: SwappingLayout,
    history: readonly (readonly SwappingToken[])[]
): SwappingResult<readonly SwappingToken[]> {
    const applied = applyAtomicOperation(current, operation, layout);
    if (!applied.ok) return applied;

    if (observableArrangementsEqual(current, applied.value)) {
        return {
            ok: false,
            error: {
                code: 'no-observable-change',
                message: 'The operation does not visibly change this arrangement.',
            },
        };
    }
    if (history.some((state) => observableArrangementsEqual(state, applied.value))) {
        return {
            ok: false,
            error: {
                code: 'repeated-state',
                message: 'The operation returns to an arrangement already seen in this round.',
            },
        };
    }
    return applied;
}

export function evaluateCards(
    initial: readonly SwappingToken[],
    cards: readonly OperationCard[],
    layout: SwappingLayout
): SwappingResult<readonly (readonly SwappingToken[])[]> {
    const states: (readonly SwappingToken[])[] = [[...initial]];
    let current = states[0];

    for (const card of cards) {
        if (card.operations.length < 1 || card.operations.length > 2) {
            return invalidOperation('An instruction card must contain one or two operations.');
        }
        for (const operation of card.operations) {
            const applied = applyNovelOperation(current, operation, layout, states);
            if (!applied.ok) return applied;
            current = applied.value;
            states.push(current);
        }
    }

    return { ok: true, value: states };
}

export function countAtomicOperations(cards: readonly OperationCard[]): number {
    return cards.reduce((count, card) => count + card.operations.length, 0);
}

export {
    describeAtomicOperation,
    getAccessiblePositionLabel,
    getPositionLabel,
} from './instructions';
