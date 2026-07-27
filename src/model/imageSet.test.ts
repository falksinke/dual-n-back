import { describe, expect, it } from 'vitest';
import { IMAGE_IDS, getImageSrc } from './imageSet';

describe('imageSet', () => {
    it('has at least six stable image ids', () => {
        expect(IMAGE_IDS.length).toBeGreaterThanOrEqual(6);
        expect(new Set(IMAGE_IDS).size).toBe(IMAGE_IDS.length);
    });

    it('builds svg paths under assets/images', () => {
        expect(getImageSrc('poly-0')).toMatch(/assets\/images\/poly-0\.svg$/);
    });
});
