import { describe, expect, it, vi } from 'vitest';
import { Speech } from './Speech';
import { LETTERS } from './constants';
import { PIANO_TOKENS } from './audioPacks';

vi.mock('howler', () => ({
    Howl: vi.fn().mockImplementation((options: { src: string[] }) => ({
        src: options.src,
        play: vi.fn(),
    })),
}));

describe('Speech', () => {
    it('builds wav and mp3 URLs for letters pack', () => {
        const speech = new Speech('letters');
        expect(speech.getSoundSrc('c')).toEqual([
            '/assets/sounds/letters/c.wav',
            '/assets/sounds/letters/c.mp3',
        ]);
    });

    it('builds piano pack URLs', () => {
        const speech = new Speech('piano');
        expect(speech.getSoundSrc('c4')).toEqual([
            '/assets/sounds/piano/c4.wav',
            '/assets/sounds/piano/c4.mp3',
        ]);
    });

    it('does not throw when playing unknown token', () => {
        const speech = new Speech('letters');
        expect(() => speech.play('missing')).not.toThrow();
    });

    it('initializes all tokens for the selected pack', () => {
        const speech = new Speech('piano');
        for (const token of PIANO_TOKENS) {
            expect(speech.getSoundSrc(token)[0]).toContain('/assets/sounds/piano/');
        }
        expect(LETTERS.length).toBe(8);
    });
});
