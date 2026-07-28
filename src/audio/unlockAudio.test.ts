import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Howler } from 'howler';
import { ensureAudioReady, preferPlaybackAudioSession, resumeHowlerContext } from './unlockAudio';

vi.mock('howler', () => {
    const ctx = {
        state: 'suspended',
        resume: vi.fn(() => Promise.resolve()),
        addEventListener: vi.fn(),
    };
    return {
        Howler: {
            ctx,
            mute: vi.fn(),
        },
    };
});

describe('unlockAudio', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (Howler.ctx as { state: string }).state = 'suspended';
    });

    it('sets navigator.audioSession.type to playback when available', () => {
        const session = { type: 'auto' };
        vi.stubGlobal('navigator', { audioSession: session });
        preferPlaybackAudioSession();
        expect(session.type).toBe('playback');
        vi.unstubAllGlobals();
    });

    it('resumes a suspended Howler context', async () => {
        await resumeHowlerContext();
        expect(Howler.ctx.resume).toHaveBeenCalled();
    });

    it('ensureAudioReady unmutes and resumes', async () => {
        await ensureAudioReady();
        expect(Howler.mute).toHaveBeenCalledWith(false);
        expect(Howler.ctx.resume).toHaveBeenCalled();
    });
});
