import { describe, expect, it } from 'vitest';
import {
    DEFAULT_KEYS,
    MODE_PRESETS,
    TRIPLE_COMBINATIONS,
    type ModalityId,
    getModalitiesForMode,
    modalityFromKey,
    normalizeTripleModalities,
    resolveModalities,
    tripleCombinationLabel,
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

    it('lists all four Triple combinations', () => {
        expect(TRIPLE_COMBINATIONS).toHaveLength(4);
        expect(TRIPLE_COMBINATIONS).toContainEqual(['color', 'image', 'audio']);
    });

    it('normalizes Triple modalities and rejects invalid sets', () => {
        expect(normalizeTripleModalities(['audio', 'color', 'image'])).toEqual([
            'color',
            'image',
            'audio',
        ]);
        expect(normalizeTripleModalities(['position', 'audio'])).toEqual(
            getModalitiesForMode('triple')
        );
        expect(normalizeTripleModalities(null)).toEqual(getModalitiesForMode('triple'));
        expect(normalizeTripleModalities(['position', 'position', 'audio'])).toEqual(
            getModalitiesForMode('triple')
        );
    });

    it('resolves Dual/Quad from presets and Triple from custom set', () => {
        expect(resolveModalities('dual')).toEqual(['position', 'audio']);
        expect(resolveModalities('quad')).toEqual(['position', 'color', 'image', 'audio']);
        expect(resolveModalities('triple', ['color', 'image', 'audio'])).toEqual([
            'color',
            'image',
            'audio',
        ]);
        expect(resolveModalities('triple', ['bogus'] as unknown as ModalityId[])).toEqual(
            getModalitiesForMode('triple')
        );
    });

    it('labels Triple combinations', () => {
        expect(tripleCombinationLabel(['color', 'image', 'audio'])).toBe('Color·Image·Audio');
        expect(tripleCombinationLabel(['position', 'color', 'audio'])).toBe('Pos·Color·Audio');
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
