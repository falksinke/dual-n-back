export const IMAGE_IDS = ['poly-0', 'poly-1', 'poly-2', 'poly-3', 'poly-4', 'poly-5', 'poly-6', 'poly-7'] as const;

export type ImageDifficulty = 'easy' | 'hard';
export type LegacyImageId = (typeof IMAGE_IDS)[number];
export type EasyImageId = `easy-${string}`;
export type HardImageId = `image-${string}`;
export type ImageId = LegacyImageId | EasyImageId | HardImageId;

function createNumberedImageIds<Prefix extends string>(
    prefix: Prefix,
    count: number
): Array<`${Prefix}-${string}`> {
    return Array.from(
        { length: count },
        (_, index) =>
            `${prefix}-${String(index + 1).padStart(3, '0')}` as `${Prefix}-${string}`
    );
}

export const EASY_IMAGE_IDS: readonly EasyImageId[] = createNumberedImageIds('easy', 150);
export const HARD_IMAGE_IDS: readonly HardImageId[] = createNumberedImageIds('image', 250);

const base = import.meta.env.BASE_URL;

export function getImageSrc(id: ImageId): string {
    if (id.startsWith('easy-')) {
        return `${base}assets/nback-images-easy/${id}.svg`;
    }
    if (id.startsWith('image-')) {
        return `${base}assets/nback-images/${id}.svg`;
    }
    return `${base}assets/images/${id}.svg`;
}

export function normalizeImageDifficulty(value: unknown): ImageDifficulty {
    return value === 'hard' ? 'hard' : 'easy';
}

export function getImageIdsForDifficulty(difficulty: ImageDifficulty): readonly ImageId[] {
    return difficulty === 'hard' ? HARD_IMAGE_IDS : EASY_IMAGE_IDS;
}

export function getRandomImageId(
    random: () => number,
    difficulty: ImageDifficulty = 'easy'
): ImageId {
    const ids = getImageIdsForDifficulty(difficulty);
    const index = Math.max(0, Math.min(ids.length - 1, Math.floor(random() * ids.length)));
    return ids[index]!;
}
