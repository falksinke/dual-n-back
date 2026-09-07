import { GRID_DIMENSIONS } from './difficulty';
import type { AtomicOperation, SwappingLayout } from './types';

export function isGroupOperation(operation: AtomicOperation): boolean {
    return operation.type !== 'swap';
}

export function listCompatibleOperations(
    layout: SwappingLayout,
    length: number,
    includeGroups: boolean
): AtomicOperation[] {
    const operations: AtomicOperation[] = [];
    for (let first = 0; first < length - 1; first++) {
        for (let second = first + 1; second < length; second++) {
            operations.push({ type: 'swap', first, second });
        }
    }
    if (!includeGroups) return operations;

    if (layout === 'sequence') {
        for (let start = 0; start <= length - 3; start++) {
            for (let end = start + 2; end < length; end++) {
                operations.push({ type: 'reverse-span', start, end });
                operations.push({ type: 'shift-span', start, end, direction: 'left' });
                operations.push({ type: 'shift-span', start, end, direction: 'right' });
            }
        }
        return operations;
    }

    const { rows, columns } = GRID_DIMENSIONS[layout];
    for (let first = 0; first < rows - 1; first++) {
        for (let second = first + 1; second < rows; second++) {
            operations.push({ type: 'swap-rows', first, second });
        }
    }
    for (let first = 0; first < columns - 1; first++) {
        for (let second = first + 1; second < columns; second++) {
            operations.push({ type: 'swap-columns', first, second });
        }
    }
    operations.push({ type: 'mirror-left-right' }, { type: 'mirror-top-bottom' });
    if (rows === columns) operations.push({ type: 'rotate-clockwise' });
    return operations;
}

