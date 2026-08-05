/** Spatial board layout for position stimuli. */
export type PositionGrid = '3x3' | '2x2';

export const POSITION_GRID_OPTIONS: PositionGrid[] = ['3x3', '2x2'];

export function isPositionGrid(value: unknown): value is PositionGrid {
    return value === '3x3' || value === '2x2';
}

/** How many distinct position cells can receive a stimulus. */
export function positionCellCount(grid: PositionGrid, allowCenterStimulus: boolean): number {
    if (grid === '2x2') return 4;
    return allowCenterStimulus ? 9 : 8;
}
