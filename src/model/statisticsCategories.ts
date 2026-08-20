import { MODE_PRESETS, MODALITY_LABELS, type ModalityId } from './modalities';
import type { StatisticsRound } from './statistics';

export const STATISTICS_INTERFERENCE_LEVELS = [
    'easy',
    0,
    0.125,
    0.25,
    0.375,
    0.5,
    0.625,
    0.75,
    0.875,
    1,
] as const;

export type StatisticsInterferenceLevel = (typeof STATISTICS_INTERFERENCE_LEVELS)[number];
export type StatisticsCategoryFilter = 'all' | `category:${string}`;

export interface StatisticsCategory {
    id: Exclude<StatisticsCategoryFilter, 'all'>;
    label: string;
}

function isModalityId(value: unknown): value is ModalityId {
    return MODE_PRESETS.quad.includes(value as ModalityId);
}

export function isStatisticsInterferenceLevel(
    value: unknown
): value is StatisticsInterferenceLevel {
    return STATISTICS_INTERFERENCE_LEVELS.includes(value as StatisticsInterferenceLevel);
}

export function isStatisticsModalityCombination(value: unknown): value is ModalityId[] {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.length <= MODE_PRESETS.quad.length &&
        value.every(isModalityId) &&
        new Set(value).size === value.length
    );
}

function orderedModalities(modalities: ModalityId[]): ModalityId[] {
    return [...modalities].sort(
        (left, right) => MODE_PRESETS.quad.indexOf(left) - MODE_PRESETS.quad.indexOf(right)
    );
}

function interferenceLabel(level: StatisticsInterferenceLevel): string {
    if (level === 'easy') return 'Easy';
    const fractions: Record<number, string> = {
        0: 'Off',
        0.125: '1/8',
        0.25: '1/4',
        0.375: '3/8',
        0.5: '1/2',
        0.625: '5/8',
        0.75: '3/4',
        0.875: '7/8',
        1: '1',
    };
    return fractions[level];
}

export function statisticsCategoryId(
    round: Pick<StatisticsRound, 'modalities' | 'interferenceLevel'>
): Exclude<StatisticsCategoryFilter, 'all'> {
    const modalities = orderedModalities(round.modalities).join('+');
    return `category:${modalities}|interference:${round.interferenceLevel}`;
}

export function statisticsCategoryLabel(
    round: Pick<StatisticsRound, 'modalities' | 'interferenceLevel'>
): string {
    const modalities = orderedModalities(round.modalities)
        .map((modality) => MODALITY_LABELS[modality])
        .join(' + ');
    return `${modalities} · Interference ${interferenceLabel(round.interferenceLevel)}`;
}

export function buildStatisticsCategories(rounds: StatisticsRound[]): StatisticsCategory[] {
    const categories = new Map<
        StatisticsCategory['id'],
        StatisticsCategory & { modalityKey: string; interferenceIndex: number }
    >();
    for (const round of rounds) {
        const id = statisticsCategoryId(round);
        categories.set(id, {
            id,
            label: statisticsCategoryLabel(round),
            modalityKey: orderedModalities(round.modalities).join('+'),
            interferenceIndex: STATISTICS_INTERFERENCE_LEVELS.indexOf(round.interferenceLevel),
        });
    }
    return [...categories.values()]
        .sort(
            (left, right) =>
                left.modalityKey.localeCompare(right.modalityKey) ||
                left.interferenceIndex - right.interferenceIndex
        )
        .map(({ id, label }) => ({ id, label }));
}
