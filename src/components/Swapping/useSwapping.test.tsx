import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSwapping } from './useSwapping';
import type { LetterPlayerCallbacks } from './audio';

const audio = vi.hoisted(() => ({
    play: vi.fn(), cancel: vi.fn(), dispose: vi.fn(),
}));
vi.mock('./audio', () => ({ createLetterPlayer: () => audio }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function startAudio() {
    const exit = vi.fn();
    const hook = renderHook(() => useSwapping(exit));
    act(() => hook.result.current.configure({ content: 'audio', layout: 'sequence', length: 3, pattern: 'unique', tier: 'basic', operationCount: 1 }));
    act(() => hook.result.current.start());
    return { ...hook, exit };
}

describe('Swapping audio and page lifecycle', () => {
    it('restarts interrupted encoding and ignores callbacks from the old pass', () => {
        const hook = startAudio();
        const oldCallbacks = audio.play.mock.calls[0][1] as LetterPlayerCallbacks;
        act(() => hook.result.current.pause());
        expect(hook.result.current.view).toEqual({ phase: 'paused' });
        act(() => oldCallbacks.onComplete());
        expect(hook.result.current.view.phase).toBe('paused');
        act(() => hook.result.current.resume());
        expect(audio.play).toHaveBeenCalledTimes(2);
        expect(hook.result.current.view).toMatchObject({ phase: 'encode-audio', status: 'playing', passes: 2 });
        act(() => oldCallbacks.onComplete());
        expect(hook.result.current.view).toMatchObject({ status: 'playing' });
        const callbacks = audio.play.mock.calls[1][1] as LetterPlayerCallbacks;
        act(() => callbacks.onComplete());
        act(() => hook.result.current.ready());
        expect(hook.result.current.view.phase).toBe('manipulate');
    });

    it('pauses when the page becomes hidden and disposes on exit/unmount', () => {
        const hook = startAudio();
        const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
        act(() => document.dispatchEvent(new Event('visibilitychange')));
        expect(hook.result.current.view.phase).toBe('paused');
        act(() => hook.result.current.exit());
        expect(hook.exit).toHaveBeenCalledOnce();
        expect(hook.result.current.view.phase).toBe('setup');
        hook.unmount();
        expect(audio.dispose).toHaveBeenCalledOnce();
        hidden.mockRestore();
    });

    it('keeps playback failure separate from player scoring and permits retry', () => {
        const hook = startAudio();
        const callbacks = audio.play.mock.calls[0][1] as LetterPlayerCallbacks;
        act(() => callbacks.onError('Audio unavailable'));
        expect(hook.result.current.view).toMatchObject({ phase: 'encode-audio', status: 'error', error: 'Audio unavailable' });
        expect(hook.result.current.view).not.toHaveProperty('score');
        act(() => hook.result.current.playEncoding());
        expect(audio.play).toHaveBeenCalledTimes(2);
        expect(hook.result.current.view).toMatchObject({ status: 'playing', error: null });
    });
});
