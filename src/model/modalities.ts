export type ModalityId = 'position' | 'color' | 'image' | 'audio';

export type ModeId = 'dual' | 'triple' | 'quad';

export const MODE_PRESETS: Record<ModeId, ModalityId[]> = {
    dual: ['position', 'audio'],
    triple: ['position', 'color', 'audio'],
    quad: ['position', 'color', 'image', 'audio'],
};

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

export function getModalitiesForMode(mode: ModeId): ModalityId[] {
    return [...MODE_PRESETS[mode]];
}

export function modalityFromKey(key: string, activeModalities: ModalityId[]): ModalityId | null {
    const normalized = key.toLowerCase();
    for (const modality of activeModalities) {
        if (DEFAULT_KEYS[modality] === normalized) {
            return modality;
        }
    }
    return null;
}
