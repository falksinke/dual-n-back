import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLetterPlayer } from './audio';

interface MockHowlOptions {
    src: string[];
    onload?: () => void;
    onplay?: () => void;
    onend?: () => void;
    onloaderror?: (id: number, error: unknown) => void;
    onplayerror?: (id: number, error: unknown) => void;
}

const mocks = vi.hoisted(() => ({
    howls: [] as Array<{
        options: MockHowlOptions;
        play: ReturnType<typeof vi.fn>;
        stop: ReturnType<typeof vi.fn>;
        unload: ReturnType<typeof vi.fn>;
        off: ReturnType<typeof vi.fn>;
        state: ReturnType<typeof vi.fn>;
    }>,
    ensureAudioReady: vi.fn(() => Promise.resolve()),
}));

vi.mock('howler', () => ({
    Howl: vi.fn().mockImplementation((options: MockHowlOptions) => {
        const howl = {
            options,
            play: vi.fn(() => {
                options.onplay?.();
                return 1;
            }),
            stop: vi.fn(),
            unload: vi.fn(),
            off: vi.fn(),
            state: vi.fn(() => 'loading'),
        };
        mocks.howls.push(howl);
        return howl;
    }),
}));

vi.mock('../../audio/unlockAudio', () => ({
    ensureAudioReady: mocks.ensureAudioReady,
}));

const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

describe('createLetterPlayer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mocks.howls.length = 0;
        mocks.ensureAudioReady.mockReset();
        mocks.ensureAudioReady.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('plays full letter clips in order with a 300 ms gap and no overlap', async () => {
        const onToken = vi.fn();
        const onComplete = vi.fn();
        const player = createLetterPlayer();

        player.play(['c', 'h'], { onToken, onComplete, onError: vi.fn() });
        expect(mocks.howls[0]?.options.src).toEqual([
            '/assets/sounds/letters/c.wav',
            '/assets/sounds/letters/c.mp3',
        ]);

        mocks.howls[0]?.options.onload?.();
        await flushPromises();
        expect(onToken).toHaveBeenCalledWith(0);
        expect(mocks.howls).toHaveLength(1);

        mocks.howls[0]?.options.onend?.();
        vi.advanceTimersByTime(299);
        expect(mocks.howls).toHaveLength(1);
        vi.advanceTimersByTime(1);
        expect(mocks.howls).toHaveLength(2);

        mocks.howls[1]?.options.onload?.();
        await flushPromises();
        mocks.howls[1]?.options.onend?.();
        expect(onToken.mock.calls).toEqual([[0], [1]]);
        expect(onComplete).toHaveBeenCalledOnce();
    });

    it('cancels owned audio and suppresses late playback callbacks', async () => {
        const callbacks = { onToken: vi.fn(), onComplete: vi.fn(), onError: vi.fn() };
        const player = createLetterPlayer();

        player.play(['k'], callbacks);
        const howl = mocks.howls[0]!;
        player.cancel();

        expect(howl.off).toHaveBeenCalledOnce();
        expect(howl.stop).toHaveBeenCalledOnce();
        expect(howl.unload).toHaveBeenCalledOnce();
        howl.options.onload?.();
        howl.options.onplay?.();
        howl.options.onend?.();
        howl.options.onplayerror?.(1, 'late error');
        await flushPromises();
        vi.runAllTimers();
        expect(callbacks.onToken).not.toHaveBeenCalled();
        expect(callbacks.onComplete).not.toHaveBeenCalled();
        expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('invalidates an earlier pass when replay starts', async () => {
        const first = { onToken: vi.fn(), onComplete: vi.fn(), onError: vi.fn() };
        const second = { onToken: vi.fn(), onComplete: vi.fn(), onError: vi.fn() };
        const player = createLetterPlayer();

        player.play(['q'], first);
        const staleHowl = mocks.howls[0]!;
        player.play(['r'], second);
        staleHowl.options.onend?.();
        staleHowl.options.onload?.();

        mocks.howls[1]?.options.onload?.();
        await flushPromises();
        mocks.howls[1]?.options.onend?.();
        expect(first.onToken).not.toHaveBeenCalled();
        expect(first.onComplete).not.toHaveBeenCalled();
        expect(second.onToken).toHaveBeenCalledWith(0);
        expect(second.onComplete).toHaveBeenCalledOnce();
    });

    it('ignores a queued error from a completed clip after the next clip begins', async () => {
        const callbacks = { onToken: vi.fn(), onComplete: vi.fn(), onError: vi.fn() };
        const player = createLetterPlayer();

        player.play(['c', 'h'], callbacks);
        const completedHowl = mocks.howls[0]!;
        completedHowl.options.onload?.();
        await flushPromises();
        completedHowl.options.onend?.();

        vi.advanceTimersByTime(300);
        const activeHowl = mocks.howls[1]!;
        activeHowl.options.onload?.();
        await flushPromises();
        completedHowl.options.onplayerror?.(1, 'queued old error');

        expect(callbacks.onError).not.toHaveBeenCalled();
        activeHowl.options.onend?.();
        expect(callbacks.onToken.mock.calls).toEqual([[0], [1]]);
        expect(callbacks.onComplete).toHaveBeenCalledOnce();
    });

    it('starts the watchdog before audio readiness resolves', async () => {
        mocks.ensureAudioReady.mockReturnValue(new Promise<void>(() => undefined));
        const callbacks = { onToken: vi.fn(), onComplete: vi.fn(), onError: vi.fn() };
        const player = createLetterPlayer();

        player.play(['s'], callbacks);
        mocks.howls[0]?.options.onload?.();
        vi.advanceTimersByTime(9_999);
        expect(callbacks.onError).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);

        expect(callbacks.onError).toHaveBeenCalledWith(
            'The letter audio could not be played. Retry or return to setup.'
        );
        expect(mocks.howls[0]?.unload).toHaveBeenCalledOnce();
        await flushPromises();
    });

    it('times out a clip that starts but never finishes', async () => {
        const callbacks = { onToken: vi.fn(), onComplete: vi.fn(), onError: vi.fn() };
        const player = createLetterPlayer();

        player.play(['l'], callbacks);
        mocks.howls[0]?.options.onload?.();
        await flushPromises();
        expect(callbacks.onToken).toHaveBeenCalledWith(0);

        vi.advanceTimersByTime(10_000);
        expect(callbacks.onComplete).not.toHaveBeenCalled();
        expect(callbacks.onError).toHaveBeenCalledWith(
            'The letter audio could not be played. Retry or return to setup.'
        );
        expect(mocks.howls[0]?.unload).toHaveBeenCalledOnce();
    });

    it('reports load and play failures once and releases the owned clip', async () => {
        const onError = vi.fn();
        const player = createLetterPlayer();

        player.play(['t'], { onToken: vi.fn(), onComplete: vi.fn(), onError });
        const howl = mocks.howls[0]!;
        howl.options.onloaderror?.(0, 'missing');
        howl.options.onplayerror?.(0, 'late');
        await flushPromises();

        expect(onError).toHaveBeenCalledOnce();
        expect(howl.off).toHaveBeenCalledOnce();
        expect(howl.stop).toHaveBeenCalledOnce();
        expect(howl.unload).toHaveBeenCalledOnce();
    });

    it('dispose cancels playback and makes future play calls silent', () => {
        const callbacks = { onToken: vi.fn(), onComplete: vi.fn(), onError: vi.fn() };
        const player = createLetterPlayer();

        player.play(['c'], callbacks);
        player.dispose();
        player.play(['h'], callbacks);

        expect(mocks.howls).toHaveLength(1);
        expect(mocks.howls[0]?.unload).toHaveBeenCalledOnce();
        expect(callbacks.onError).not.toHaveBeenCalled();
    });
});
