import { getContentPool } from './tokens';
import type {
    GridLayout,
    OperationTier,
    StartingPattern,
    SwappingConfig,
    SwappingContent,
    SwappingLayout,
    SwappingResult,
} from './types';

export const MIN_SEQUENCE_LENGTH = 3;
export const MAX_SEQUENCE_LENGTH = 12;
export const MIN_OPERATION_COUNT = 1;
export const MAX_OPERATION_COUNT = 8;

export const GRID_DIMENSIONS: Record<GridLayout, { rows: number; columns: number }> = {
    '2x2': { rows: 2, columns: 2 },
    '2x3': { rows: 2, columns: 3 },
    '3x3': { rows: 3, columns: 3 },
};

export type SwappingPresetId = 'start' | 'chain' | 'transform' | 'combine';

export interface SwappingPreset {
    id: SwappingPresetId;
    label: string;
    sequenceLength: number;
    gridLayout: GridLayout;
    pattern: StartingPattern;
    operationCount: number;
    tier: OperationTier;
}

export const SWAPPING_PRESETS: readonly SwappingPreset[] = [
    {
        id: 'start',
        label: 'Start',
        sequenceLength: 3,
        gridLayout: '2x2',
        pattern: 'unique',
        operationCount: 1,
        tier: 'basic',
    },
    {
        id: 'chain',
        label: 'Chain',
        sequenceLength: 5,
        gridLayout: '2x3',
        pattern: 'unique',
        operationCount: 3,
        tier: 'basic',
    },
    {
        id: 'transform',
        label: 'Transform',
        sequenceLength: 6,
        gridLayout: '2x3',
        pattern: 'repeated',
        operationCount: 4,
        tier: 'group',
    },
    {
        id: 'combine',
        label: 'Combine',
        sequenceLength: 8,
        gridLayout: '3x3',
        pattern: 'repeated',
        operationCount: 6,
        tier: 'compound',
    },
];

export function getGridSize(layout: GridLayout): number {
    const dimensions = GRID_DIMENSIONS[layout];
    return dimensions.rows * dimensions.columns;
}

export function getArrangementSize(config: SwappingConfig): number {
    return config.layout === 'sequence' ? config.length : getGridSize(config.layout);
}

function factorial(value: number): number {
    let result = 1;
    for (let factor = 2; factor <= value; factor++) result *= factor;
    return result;
}

function maximumRepeatedPermutations(size: number, poolSize: number): number {
    const identityCount = Math.min(poolSize, size - 1);
    const counts = Array.from({ length: identityCount }, () => 1);
    for (let index = identityCount; index < size; index++) {
        counts[index % identityCount]++;
    }
    return counts.reduce((total, count) => total / factorial(count), factorial(size));
}

export function maximumDistinctPermutations(config: SwappingConfig): number {
    const size = getArrangementSize(config);
    if (config.pattern === 'unique') return factorial(size);
    return maximumRepeatedPermutations(size, getContentPool(config.content).length);
}

export function validateConfig(config: SwappingConfig): SwappingResult<SwappingConfig> {
    if (
        config.layout === 'sequence' &&
        (!Number.isInteger(config.length) ||
            config.length < MIN_SEQUENCE_LENGTH ||
            config.length > MAX_SEQUENCE_LENGTH)
    ) {
        return {
            ok: false,
            error: {
                code: 'sequence-length',
                message: `Sequence size must be between ${MIN_SEQUENCE_LENGTH} and ${MAX_SEQUENCE_LENGTH}.`,
            },
        };
    }

    if (config.layout !== 'sequence' && config.length !== getGridSize(config.layout)) {
        return {
            ok: false,
            error: {
                code: 'grid-length',
                message: `${config.layout} requires ${getGridSize(config.layout)} items.`,
            },
        };
    }

    if (config.content === 'audio' && config.layout !== 'sequence') {
        return {
            ok: false,
            error: {
                code: 'audio-layout',
                message: 'Spoken letters are available for sequences only.',
            },
        };
    }

    if (
        !Number.isInteger(config.operationCount) ||
        config.operationCount < MIN_OPERATION_COUNT ||
        config.operationCount > MAX_OPERATION_COUNT
    ) {
        return {
            ok: false,
            error: {
                code: 'operation-count',
                message: `Operation count must be between ${MIN_OPERATION_COUNT} and ${MAX_OPERATION_COUNT}.`,
            },
        };
    }

    if (config.tier === 'compound' && config.operationCount < 2) {
        return {
            ok: false,
            error: {
                code: 'compound-operation-count',
                message: 'Compound requires at least 2 operations.',
            },
        };
    }

    const size = getArrangementSize(config);
    const poolSize = getContentPool(config.content).length;
    if (config.pattern === 'unique' && poolSize < size) {
        return {
            ok: false,
            error: {
                code: 'unique-pool-too-small',
                message: `Unique ${config.content} supports at most ${poolSize} items. Choose Repeated or a smaller size.`,
            },
        };
    }

    const availableChanges = maximumDistinctPermutations(config) - 1;
    if (availableChanges < config.operationCount) {
        return {
            ok: false,
            error: {
                code: 'permutation-capacity',
                message: `This pattern can produce at most ${availableChanges} distinct follow-up arrangements. Choose fewer operations or more items.`,
            },
        };
    }

    return { ok: true, value: config };
}

export function createPresetConfig(
    presetId: SwappingPresetId,
    content: SwappingContent,
    currentLayout: SwappingLayout
): SwappingConfig {
    const preset = SWAPPING_PRESETS.find((candidate) => candidate.id === presetId);
    if (preset == null) throw new Error(`Unknown Swapping preset: ${presetId}`);

    const layout =
        content === 'audio' || currentLayout === 'sequence' ? 'sequence' : preset.gridLayout;
    return {
        content,
        layout,
        length: layout === 'sequence' ? preset.sequenceLength : getGridSize(layout),
        pattern: preset.pattern,
        operationCount: preset.operationCount,
        tier: preset.tier,
    };
}
