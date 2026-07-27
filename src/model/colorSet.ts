/** Eight high-contrast task colors (not theme chrome). */
export const COLOR_IDS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export type ColorId = (typeof COLOR_IDS)[number];

export const COLORS: readonly string[] = [
    '#E6194B',
    '#3CB44B',
    '#4363D8',
    '#F58231',
    '#911EB4',
    '#42D4F4',
    '#F032E6',
    '#BFEF45',
];

export function getColorHex(id: ColorId): string {
    return COLORS[id];
}

export function getRandomColorId(random: () => number): ColorId {
    return Math.floor(random() * COLOR_IDS.length) as ColorId;
}
