import { describe, expect, it } from 'vitest';
import {
    SWAPPING_PRESETS,
    createPresetConfig,
    validateConfig,
} from './difficulty';
import type { SwappingConfig } from './types';

function config(overrides: Partial<SwappingConfig> = {}): SwappingConfig {
    return {
        content: 'numbers',
        layout: 'sequence',
        length: 4,
        pattern: 'unique',
        tier: 'basic',
        operationCount: 1,
        ...overrides,
    };
}

function errorCode(value: SwappingConfig): string | null {
    const result = validateConfig(value);
    return result.ok ? null : result.error.code;
}

describe('Swapping difficulty', () => {
    it('accepts the sequence boundaries and rejects sizes outside them', () => {
        expect(validateConfig(config({ length: 3 })).ok).toBe(true);
        expect(validateConfig(config({ content: 'mixed', length: 12 })).ok).toBe(true);
        expect(errorCode(config({ length: 2 }))).toBe('sequence-length');
        expect(errorCode(config({ content: 'mixed', length: 13 }))).toBe('sequence-length');
    });

    it('requires each grid length to match its fully occupied layout', () => {
        expect(validateConfig(config({ layout: '2x2', length: 4 })).ok).toBe(true);
        expect(errorCode(config({ layout: '2x3', length: 5 }))).toBe('grid-length');
        expect(validateConfig(config({ layout: '3x3', length: 9 })).ok).toBe(true);
    });

    it('reports incompatible audio, Compound and unique-pool settings', () => {
        expect(errorCode(config({ content: 'audio', layout: '2x2', length: 4 }))).toBe(
            'audio-layout'
        );
        expect(errorCode(config({ tier: 'compound', operationCount: 1 }))).toBe(
            'compound-operation-count'
        );
        expect(errorCode(config({ content: 'icons', length: 9 }))).toBe(
            'unique-pool-too-small'
        );
    });

    it('caps atomic operation count from one through eight', () => {
        expect(errorCode(config({ operationCount: 0 }))).toBe('operation-count');
        expect(validateConfig(config({ operationCount: 1 })).ok).toBe(true);
        expect(validateConfig(config({ length: 4, operationCount: 8 })).ok).toBe(true);
        expect(errorCode(config({ operationCount: 9 }))).toBe('operation-count');
    });

    it('rejects settings whose distinct arrangements cannot cover the history', () => {
        expect(
            errorCode(
                config({
                    content: 'letters',
                    length: 3,
                    pattern: 'repeated',
                    tier: 'compound',
                    operationCount: 3,
                })
            )
        ).toBe('permutation-capacity');
    });

    it('exposes the four specified presets and maps them to sequence or grid settings', () => {
        expect(SWAPPING_PRESETS.map((preset) => preset.id)).toEqual([
            'start',
            'chain',
            'transform',
            'combine',
        ]);
        expect(createPresetConfig('chain', 'letters', 'sequence')).toEqual({
            content: 'letters',
            layout: 'sequence',
            length: 5,
            pattern: 'unique',
            operationCount: 3,
            tier: 'basic',
        });
        expect(createPresetConfig('combine', 'numbers', '2x2')).toEqual({
            content: 'numbers',
            layout: '3x3',
            length: 9,
            pattern: 'repeated',
            operationCount: 6,
            tier: 'compound',
        });
    });

    it('uses the sequence size when an audio preset is chosen from a grid', () => {
        const audioPreset = createPresetConfig('chain', 'audio', '2x2');

        expect(audioPreset).toEqual({
            content: 'audio',
            layout: 'sequence',
            length: 5,
            pattern: 'unique',
            operationCount: 3,
            tier: 'basic',
        });
        expect(validateConfig(audioPreset).ok).toBe(true);
    });
});
