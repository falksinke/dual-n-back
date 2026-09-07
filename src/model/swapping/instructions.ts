import { GRID_DIMENSIONS } from './difficulty';
import type { AtomicOperation, SwappingLayout } from './types';

export function getPositionLabel(index: number, layout: SwappingLayout): string {
    if (layout === 'sequence') return `position ${index + 1}`;
    const { columns } = GRID_DIMENSIONS[layout];
    return `R${Math.floor(index / columns) + 1}C${(index % columns) + 1}`;
}

export function getAccessiblePositionLabel(index: number, layout: SwappingLayout): string {
    if (layout === 'sequence') return `position ${index + 1}`;
    const { columns } = GRID_DIMENSIONS[layout];
    return `row ${Math.floor(index / columns) + 1}, column ${(index % columns) + 1}`;
}

export function describeAtomicOperation(
    operation: AtomicOperation,
    layout: SwappingLayout
): string {
    switch (operation.type) {
        case 'swap':
            return `Swap ${getPositionLabel(operation.first, layout)} and ${getPositionLabel(operation.second, layout)}`;
        case 'reverse-span':
            return `Reverse positions ${operation.start + 1} through ${operation.end + 1}`;
        case 'shift-span':
            return `Shift positions ${operation.start + 1} through ${operation.end + 1} one place ${operation.direction}`;
        case 'swap-rows':
            return `Swap rows ${operation.first + 1} and ${operation.second + 1}`;
        case 'swap-columns':
            return `Swap columns ${operation.first + 1} and ${operation.second + 1}`;
        case 'mirror-left-right':
            return 'Mirror the grid left to right';
        case 'mirror-top-bottom':
            return 'Mirror the grid top to bottom';
        case 'rotate-clockwise':
            return 'Rotate the grid clockwise';
    }
}

export function describeAccessibleAtomicOperation(
    operation: AtomicOperation,
    layout: SwappingLayout
): string {
    if (operation.type !== 'swap' || layout === 'sequence') {
        return describeAtomicOperation(operation, layout);
    }

    return `Swap ${getAccessiblePositionLabel(operation.first, layout)} and ${getAccessiblePositionLabel(operation.second, layout)}`;
}
