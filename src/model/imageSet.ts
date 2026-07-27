export const IMAGE_IDS = ['poly-0', 'poly-1', 'poly-2', 'poly-3', 'poly-4', 'poly-5', 'poly-6', 'poly-7'] as const;

export type ImageId = (typeof IMAGE_IDS)[number];

const base = import.meta.env.BASE_URL;

export function getImageSrc(id: ImageId): string {
    return `${base}assets/images/${id}.svg`;
}

export function getRandomImageId(random: () => number): ImageId {
    return IMAGE_IDS[Math.floor(random() * IMAGE_IDS.length)];
}
