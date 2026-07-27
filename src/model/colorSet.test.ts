import { describe, expect, it } from 'vitest';
import { COLOR_IDS, COLORS, getColorHex } from './colorSet';

describe('colorSet', () => {
    it('has eight unique high-contrast colors', () => {
        expect(COLOR_IDS).toHaveLength(8);
        expect(new Set(COLORS).size).toBe(8);
        COLORS.forEach((hex) => expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/));
    });

    it('returns hex by id', () => {
        expect(getColorHex(0)).toBe(COLORS[0]);
    });
});
