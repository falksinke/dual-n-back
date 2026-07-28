import { describe, expect, it, vi } from 'vitest';
import { Speech } from './Speech';
import { LETTERS } from './constants';
import { PIANO_TOKENS } from './audioPacks';

vi.mock('howler', () => ({
    Howl: vi.fn().mockImplementation((options: { src: string[]; html5?: boolean }) => ({
        src: options.src,
        html5: options.html5,
        play: vi.fn(),
    })),
    Howler: {
        ctx: null,
        mute: vi.fn(),
    },
}));

vi.mock('../audio/unlockAudio', () => ({
    ensureAudioReady: vi.fn(() => Promise.resolve()),
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

    it('initializes all tokens for the selected pack with html5 audio', async () => {
        const { Howl } = await import('howler');
        new Speech('piano');
        expect(Howl).toHaveBeenCalled();
        const firstCall = vi.mocked(Howl).mock.calls[0]?.[0] as { html5?: boolean };
        expect(firstCall.html5).toBe(true);
        for (const token of PIANO_TOKENS) {
            expect(token.length).toBeGreaterThan(0);
        }
        expect(LETTERS.length).toBe(8);
    });
});
