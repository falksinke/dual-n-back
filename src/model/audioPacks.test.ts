import { describe, expect, it } from 'vitest';
import { getSoundSrc, getTokensForPack, PIANO_TOKENS } from './audioPacks';
import { LETTERS } from './constants';

describe('audioPacks', () => {
    it('letters pack uses letter tokens', () => {
        expect(getTokensForPack('letters')).toEqual(LETTERS);
        expect(getSoundSrc('letters', 'c')).toEqual([
            '/assets/sounds/letters/c.wav',
            '/assets/sounds/letters/c.mp3',
        ]);
    });

    it('piano pack uses note tokens under piano folder', () => {
        expect(getTokensForPack('piano')).toEqual(PIANO_TOKENS);
        expect(getSoundSrc('piano', 'c4')).toEqual([
            '/assets/sounds/piano/c4.wav',
            '/assets/sounds/piano/c4.mp3',
        ]);
    });
});
