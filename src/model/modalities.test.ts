import { describe, expect, it } from 'vitest';
import {
    DEFAULT_KEYS,
    MODE_PRESETS,
    getModalitiesForMode,
    modalityFromKey,
} from './modalities';

describe('modalities', () => {
    it('dual preset lists exactly position and audio', () => {
        expect(MODE_PRESETS.dual).toEqual(['position', 'audio']);
        expect(getModalitiesForMode('dual')).toEqual(['position', 'audio']);
    });

    it('triple preset is position, color, audio', () => {
        expect(MODE_PRESETS.triple).toEqual(['position', 'color', 'audio']);
    });

    it('quad preset is position, color, image, audio', () => {
        expect(MODE_PRESETS.quad).toEqual(['position', 'color', 'image', 'audio']);
    });

    it('maps keys to active modalities case-insensitively', () => {
        const active = getModalitiesForMode('quad');
        expect(modalityFromKey('A', active)).toBe('position');
        expect(modalityFromKey('f', active)).toBe('color');
        expect(modalityFromKey('J', active)).toBe('image');
        expect(modalityFromKey('l', active)).toBe('audio');
    });

    it('ignores keys for inactive modalities', () => {
        const dual = getModalitiesForMode('dual');
        expect(modalityFromKey('f', dual)).toBeNull();
        expect(modalityFromKey('j', dual)).toBeNull();
    });

    it('exposes BW default keys', () => {
        expect(DEFAULT_KEYS).toEqual({
            position: 'a',
            color: 'f',
            image: 'j',
            audio: 'l',
        });
    });
});
