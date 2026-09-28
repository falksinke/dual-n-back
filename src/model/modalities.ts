export type ModalityId = 'position' | 'color' | 'image' | 'audio';

export type ModeId = 'single' | 'dual' | 'triple' | 'quad';

export const ALL_MODALITIES: readonly ModalityId[] = [
    'position',
    'color',
    'image',
    'audio',
] as const;

export const MODE_PRESETS: Record<ModeId, ModalityId[]> = {
    single: ['position'],
    dual: ['position', 'audio'],
    triple: ['position', 'color', 'audio'],
    quad: ['position', 'color', 'image', 'audio'],
};

/** All C(4,3) Triple combinations in stable modality order. */
export const TRIPLE_COMBINATIONS: readonly ModalityId[][] = [
    ['position', 'color', 'audio'],
    ['position', 'image', 'audio'],
    ['position', 'color', 'image'],
    ['color', 'image', 'audio'],
] as const;

export const DEFAULT_KEYS: Record<ModalityId, string> = {
    position: 'a',
    color: 'f',
    image: 'j',
    audio: 'l',
};

export const MODALITY_LABELS: Record<ModalityId, string> = {
    position: 'Position',
    color: 'Color',
    image: 'Image',
    audio: 'Audio',
};

/** Short labels for Triple combination chips. */
export const TRIPLE_COMBINATION_LABELS: Record<string, string> = {
    'position,color,audio': 'Pos·Color·Audio',
    'position,image,audio': 'Pos·Image·Audio',
    'position,color,image': 'Pos·Color·Image',
    'color,image,audio': 'Color·Image·Audio',
};

export function modalityComboKey(modalities: readonly ModalityId[]): string {
    return [...modalities].sort(compareModalityOrder).join(',');
}

function compareModalityOrder(a: ModalityId, b: ModalityId): number {
    return ALL_MODALITIES.indexOf(a) - ALL_MODALITIES.indexOf(b);
}

export function sortModalities(modalities: readonly ModalityId[]): ModalityId[] {
    return [...modalities].sort(compareModalityOrder);
}

export function getModalitiesForMode(mode: ModeId): ModalityId[] {
    return [...MODE_PRESETS[mode]];
}

/** Validate a Triple modality set; invalid / unknown → default Triple preset. */
export function normalizeTripleModalities(raw: unknown): ModalityId[] {
    const fallback = getModalitiesForMode('triple');
    if (!Array.isArray(raw) || raw.length !== 3) {
        return fallback;
    }
    const unique = new Set<ModalityId>();
    for (const item of raw) {
        if (typeof item !== 'string' || !(ALL_MODALITIES as readonly string[]).includes(item)) {
            return fallback;
        }
        unique.add(item as ModalityId);
    }
    if (unique.size !== 3) {
        return fallback;
    }
    const sorted = sortModalities([...unique]);
    const key = modalityComboKey(sorted);
    const known = TRIPLE_COMBINATIONS.some((combo) => modalityComboKey(combo) === key);
    return known ? sorted : fallback;
}

/** Validate the one stream used by Single N-back. */
export function normalizeSingleModality(raw: unknown): ModalityId {
    return typeof raw === 'string' && (ALL_MODALITIES as readonly string[]).includes(raw)
        ? (raw as ModalityId)
        : 'position';
}

/**
 * Resolve active modalities for a mode.
 * Dual/Quad use fixed presets; Triple uses the persisted custom combination.
 */
export function resolveModalities(
    mode: ModeId,
    tripleModalities?: readonly ModalityId[] | null,
    singleModality?: ModalityId | null
): ModalityId[] {
    if (mode === 'single') {
        return [normalizeSingleModality(singleModality)];
    }
    if (mode === 'triple') {
        return normalizeTripleModalities(tripleModalities ?? getModalitiesForMode('triple'));
    }
    return getModalitiesForMode(mode);
}

export function tripleCombinationLabel(modalities: readonly ModalityId[]): string {
    const key = modalityComboKey(normalizeTripleModalities(modalities));
    return TRIPLE_COMBINATION_LABELS[key] ?? TRIPLE_COMBINATION_LABELS['position,color,audio']!;
}

/** 3×3 center cell — used when Position is not an active modality. */
export const CENTER_POSITION_INDEX = 4;

export function modalityFromKey(key: string, activeModalities: ModalityId[]): ModalityId | null {
    const normalized = key.toLowerCase();
    for (const modality of activeModalities) {
        if (DEFAULT_KEYS[modality] === normalized) {
            return modality;
        }
    }
    return null;
}
