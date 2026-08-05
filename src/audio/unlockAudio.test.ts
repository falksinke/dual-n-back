import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Howler } from 'howler';
import {
    clearStuckBackgroundAudioMute,
    ensureAudioReady,
    isAudioSuspendedForBackground,
    preferPlaybackAudioSession,
    resumeAudioFromBackground,
    resumeHowlerContext,
    suspendAudioForBackground,
} from './unlockAudio';

vi.mock('howler', () => {
    const ctx = {
        state: 'suspended',
        resume: vi.fn(() => Promise.resolve()),
        suspend: vi.fn(() => Promise.resolve()),
        addEventListener: vi.fn(),
    };
    return {
        Howler: {
            ctx,
            mute: vi.fn(),
            stop: vi.fn(),
        },
    };
});

describe('unlockAudio', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (Howler.ctx as { state: string }).state = 'suspended';
        if (isAudioSuspendedForBackground()) {
            resumeAudioFromBackground();
            vi.clearAllMocks();
        }
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

    it('suspends audio for background and blocks ensureAudioReady while hidden', async () => {
        (Howler.ctx as { state: string }).state = 'running';
        suspendAudioForBackground();
        expect(Howler.stop).toHaveBeenCalled();
        expect(Howler.mute).toHaveBeenCalledWith(true);
        expect(Howler.ctx.suspend).toHaveBeenCalled();
        expect(isAudioSuspendedForBackground()).toBe(true);

        vi.stubGlobal('document', { visibilityState: 'hidden' });
        vi.clearAllMocks();
        await ensureAudioReady();
        expect(Howler.mute).not.toHaveBeenCalled();
        expect(Howler.ctx.resume).not.toHaveBeenCalled();
        vi.unstubAllGlobals();

        resumeAudioFromBackground();
        expect(isAudioSuspendedForBackground()).toBe(false);
    });

    it('clears stuck background mute when the document is visible again', async () => {
        suspendAudioForBackground();
        expect(isAudioSuspendedForBackground()).toBe(true);

        vi.stubGlobal('document', { visibilityState: 'visible' });
        expect(clearStuckBackgroundAudioMute()).toBe(true);
        expect(isAudioSuspendedForBackground()).toBe(false);

        vi.clearAllMocks();
        await ensureAudioReady();
        expect(Howler.mute).toHaveBeenCalledWith(false);
        vi.unstubAllGlobals();
    });
});
