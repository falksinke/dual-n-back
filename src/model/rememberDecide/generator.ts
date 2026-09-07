import type {
    MemoryLocation,
    RandomSource,
    RememberDecideConfig,
    RememberDecideResult,
    RememberDecideRound,
    SymmetryDifficulty,
    SymmetryPattern,
} from './types';

export const MEMORY_GRID_SIZE = 4;
export const PATTERN_GRID_SIZE = 6;
export const MIN_SEQUENCE_LENGTH = 2;
export const MAX_SEQUENCE_LENGTH = 8;
export const JUDGEMENT_DEADLINES_MS = [3000, 5000, 8000] as const;
export const SYMMETRY_DIFFICULTIES = ['more', 'some', 'fewer'] as const;

const PAIR_COUNT = (PATTERN_GRID_SIZE * PATTERN_GRID_SIZE) / 2;
const FILLED_PAIR_COUNT = 9;

export function validateConfig(
    config: RememberDecideConfig
): RememberDecideResult<Readonly<RememberDecideConfig>> {
    if (
        !Number.isFinite(config.sequenceLength) ||
        !Number.isInteger(config.sequenceLength) ||
        config.sequenceLength < MIN_SEQUENCE_LENGTH ||
        config.sequenceLength > MAX_SEQUENCE_LENGTH
    ) {
        return {
            ok: false,
            error: { code: 'sequence-length', message: 'Sequence length must be an integer from 2 through 8.' },
        };
    }
    if (!SYMMETRY_DIFFICULTIES.includes(config.symmetryDifficulty as SymmetryDifficulty)) {
        return {
            ok: false,
            error: { code: 'symmetry-difficulty', message: 'Choose more, some, or fewer differences.' },
        };
    }
    if (!JUDGEMENT_DEADLINES_MS.includes(config.judgementDeadlineMs)) {
        return {
            ok: false,
            error: { code: 'judgement-deadline', message: 'Judgement deadline must be 3, 5, or 8 seconds.' },
        };
    }
    return { ok: true, value: { ...config } };
}

function randomIndex(length: number, random: RandomSource): number {
    const value = random();
    const normalized = Number.isFinite(value) ? Math.min(0.999999999999, Math.max(0, value)) : 0;
    return Math.floor(normalized * length);
}

function shuffle<T>(values: readonly T[], random: RandomSource): T[] {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index--) {
        const other = randomIndex(index + 1, random);
        [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
}

function pairCells(pair: number): readonly [number, number] {
    const row = Math.floor(pair / (PATTERN_GRID_SIZE / 2));
    const leftColumn = pair % (PATTERN_GRID_SIZE / 2);
    return [
        row * PATTERN_GRID_SIZE + leftColumn,
        row * PATTERN_GRID_SIZE + (PATTERN_GRID_SIZE - 1 - leftColumn),
    ];
}

export function isVerticallySymmetric(pattern: SymmetryPattern): boolean {
    if (pattern.cells.length !== PATTERN_GRID_SIZE * PATTERN_GRID_SIZE) return false;
    for (let row = 0; row < PATTERN_GRID_SIZE; row++) {
        for (let column = 0; column < PATTERN_GRID_SIZE / 2; column++) {
            const mirror = PATTERN_GRID_SIZE - 1 - column;
            if (pattern.cells[row * PATTERN_GRID_SIZE + column] !== pattern.cells[row * PATTERN_GRID_SIZE + mirror]) {
                return false;
            }
        }
    }
    return true;
}

export function countMismatchedMirrorPairs(pattern: SymmetryPattern): number {
    if (pattern.cells.length !== PATTERN_GRID_SIZE * PATTERN_GRID_SIZE) return 0;
    let count = 0;
    for (let pair = 0; pair < PAIR_COUNT; pair++) {
        const [left, right] = pairCells(pair);
        if (pattern.cells[left] !== pattern.cells[right]) count++;
    }
    return count;
}

export function createSymmetryPattern(
    symmetric: boolean,
    difficulty: SymmetryDifficulty,
    random: RandomSource = Math.random
): SymmetryPattern {
    const pairs = shuffle(Array.from({ length: PAIR_COUNT }, (_, index) => index), random);
    const filledPairs = pairs.slice(0, FILLED_PAIR_COUNT);
    const emptyPairs = pairs.slice(FILLED_PAIR_COUNT);
    const cells = Array<boolean>(PATTERN_GRID_SIZE * PATTERN_GRID_SIZE).fill(false);
    for (const pair of filledPairs) {
        const [left, right] = pairCells(pair);
        cells[left] = true;
        cells[right] = true;
    }

    if (!symmetric) {
        const relocations = difficulty === 'more' ? 3 : difficulty === 'some' ? 2 : 1;
        for (let index = 0; index < relocations; index++) {
            const source = pairCells(filledPairs[index]);
            const destination = pairCells(emptyPairs[index]);
            cells[source[randomIndex(2, random)]] = false;
            cells[destination[randomIndex(2, random)]] = true;
        }
    }
    return { cells };
}

function createLocation(previous: number | null, random: RandomSource): { index: number; location: MemoryLocation } {
    const cellCount = MEMORY_GRID_SIZE * MEMORY_GRID_SIZE;
    let index = randomIndex(previous == null ? cellCount : cellCount - 1, random);
    if (previous != null && index >= previous) index++;
    return {
        index,
        location: { row: Math.floor(index / MEMORY_GRID_SIZE), column: index % MEMORY_GRID_SIZE },
    };
}

export function generateRound(
    config: RememberDecideConfig,
    random: RandomSource = Math.random
): RememberDecideResult<RememberDecideRound> {
    const validation = validateConfig(config);
    if (!validation.ok) return validation;

    let previousLocation: number | null = null;
    const items = Array.from({ length: config.sequenceLength }, (_, index) => {
        const generatedLocation = createLocation(previousLocation, random);
        previousLocation = generatedLocation.index;
        const requestedTruth = random() < 0.5;
        const pattern = createSymmetryPattern(requestedTruth, config.symmetryDifficulty, random);
        return {
            index,
            location: generatedLocation.location,
            pattern,
            isSymmetric: isVerticallySymmetric(pattern),
        };
    });
    return { ok: true, value: { config: validation.value, items } };
}
