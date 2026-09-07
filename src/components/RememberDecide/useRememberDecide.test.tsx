import { StrictMode, type PropsWithChildren } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RememberDecideRound } from '../../model/rememberDecide';
import type { RememberDecideProjection } from './projection';
import { useRememberDecide } from './useRememberDecide';

const target: RememberDecideRound = {
    config: { sequenceLength: 2, symmetryDifficulty: 'more', judgementDeadlineMs: 3000 },
    items: [true, false].map((isSymmetric, index) => ({
        index,
        location: { row: index, column: index },
        pattern: { cells: Array(36).fill(false) },
        isSymmetric,
    })),
};

function wrapper({ children }: PropsWithChildren) {
    return <StrictMode>{children}</StrictMode>;
}

describe('useRememberDecide lifecycle and callback ownership', () => {
    let clock = 0;

    beforeEach(() => {
        vi.useFakeTimers();
        clock = 0;
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    function renderGame(onExit = vi.fn()) {
        const game = renderHook(
            () => useRememberDecide(onExit, { createRound: () => ({ ok: true, value: target }), now: () => clock }),
            { wrapper }
        );
        return { ...game, onExit };
    }

    function start(game: ReturnType<typeof renderGame>) {
        act(() => game.result.current.start(game.result.current.view.generation));
        return game.result.current.view;
    }

    function expectPhase<P extends RememberDecideProjection['phase']>(
        view: RememberDecideProjection,
        phase: P
    ): asserts view is Extract<RememberDecideProjection, { phase: P }> {
        expect(view.phase).toBe(phase);
    }

    function runTimedPhase(
        game: ReturnType<typeof renderGame>,
        phase: 'location' | 'location-blank' | 'decision-blank',
        milliseconds: number
    ): void {
        const view = game.result.current.view;
        expectPhase(view, phase);
        act(() => game.result.current.mountPhase(view.generation, view.phase, view.itemIndex));
        clock += milliseconds;
        act(() => vi.advanceTimersByTime(milliseconds));
    }

    function answerCurrent(game: ReturnType<typeof renderGame>, answer: 'yes' | 'no'): void {
        const view = game.result.current.view;
        expectPhase(view, 'decision');
        act(() => game.result.current.mountPhase(view.generation, view.phase, view.itemIndex));
        act(() => game.result.current.answer(view.generation, view.itemIndex, answer));
    }

    function finishItem(game: ReturnType<typeof renderGame>, answer: 'yes' | 'no'): void {
        runTimedPhase(game, 'location', 1000);
        runTimedPhase(game, 'location-blank', 250);
        answerCurrent(game, answer);
        runTimedPhase(game, 'decision-blank', 250);
    }

    it('keeps one live phase runner through Strict Mode setup and cleanup', () => {
        const game = renderGame();
        const view = start(game);
        expectPhase(view, 'location');
        act(() => game.result.current.mountPhase(view.generation, view.phase, view.itemIndex));
        expect(vi.getTimerCount()).toBe(1);
        game.unmount();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('makes retained callbacks inert after unmount', () => {
        const game = renderGame();
        const view = start(game);
        expectPhase(view, 'location');
        game.unmount();
        act(() => {
            game.result.current.mountPhase(view.generation, view.phase, view.itemIndex);
            game.result.current.start(view.generation);
            game.result.current.exit(view.generation);
        });
        expect(vi.getTimerCount()).toBe(0);
        expect(game.onExit).not.toHaveBeenCalled();
    });

    it('binds answers and recall actions to the rendered item and round', () => {
        const game = renderGame();
        let view = start(game);
        expectPhase(view, 'location');
        const firstGeneration = view.generation;
        runTimedPhase(game, 'location', 1000);
        runTimedPhase(game, 'location-blank', 250);
        view = game.result.current.view;
        expectPhase(view, 'decision');
        act(() => game.result.current.mountPhase(view.generation, view.phase, view.itemIndex));
        const firstDecisionGeneration = view.generation;
        const firstDecisionItem = view.itemIndex;
        const staleAnswer = () => game.result.current.answer(firstDecisionGeneration, firstDecisionItem, 'yes');
        act(staleAnswer);
        runTimedPhase(game, 'decision-blank', 250);

        runTimedPhase(game, 'location', 1000);
        runTimedPhase(game, 'location-blank', 250);
        view = game.result.current.view;
        expectPhase(view, 'decision');
        act(() => game.result.current.mountPhase(view.generation, view.phase, view.itemIndex));
        act(staleAnswer);
        expect(game.result.current.view).toMatchObject({ phase: 'decision', itemIndex: 1 });
        answerCurrent(game, 'no');
        runTimedPhase(game, 'decision-blank', 250);
        view = game.result.current.view;
        expectPhase(view, 'recall');
        const staleRemember = () => game.result.current.remember(firstGeneration, 3, 3);

        act(() => game.result.current.interrupt(firstGeneration));
        const interrupted = game.result.current.view;
        expectPhase(interrupted, 'interrupted');
        act(() => game.result.current.restart(interrupted.generation));
        finishItem(game, 'yes');
        finishItem(game, 'no');
        view = game.result.current.view;
        expectPhase(view, 'recall');
        act(staleRemember);
        expect(game.result.current.view).toMatchObject({ phase: 'recall', recalled: [] });
    });

    it('interrupts on page hiding and invalidates the active timer', () => {
        const game = renderGame();
        const view = start(game);
        expectPhase(view, 'location');
        act(() => game.result.current.mountPhase(view.generation, view.phase, view.itemIndex));
        const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
        act(() => document.dispatchEvent(new Event('visibilitychange')));
        expect(game.result.current.view).toMatchObject({ phase: 'interrupted' });
        expect(vi.getTimerCount()).toBe(0);
        hidden.mockRestore();
    });

    it('treats an early timer delivery as early and re-arms the remaining time', () => {
        const game = renderGame();
        const view = start(game);
        expectPhase(view, 'location');
        act(() => game.result.current.mountPhase(view.generation, view.phase, view.itemIndex));
        clock = 999;
        act(() => vi.advanceTimersByTime(1000));
        expect(game.result.current.view.phase).toBe('location');
        expect(vi.getTimerCount()).toBe(1);
        clock = 1000;
        act(() => vi.advanceTimersByTime(1));
        expect(game.result.current.view.phase).toBe('location-blank');
    });

    it('does not let a queued old timeout clear or block the current runner', () => {
        const callbacks: Array<() => void> = [];
        vi.spyOn(window, 'setTimeout').mockImplementation(((callback: TimerHandler) => {
            callbacks.push(callback as () => void);
            return callbacks.length;
        }) as typeof window.setTimeout);
        vi.spyOn(window, 'clearTimeout').mockImplementation(() => undefined);
        const game = renderGame();
        let view = start(game);
        expectPhase(view, 'location');
        act(() => game.result.current.mountPhase(view.generation, view.phase, view.itemIndex));
        clock = 1000;
        act(() => callbacks[0]());
        view = game.result.current.view;
        expectPhase(view, 'location-blank');
        act(() => game.result.current.mountPhase(view.generation, view.phase, view.itemIndex));
        expect(callbacks).toHaveLength(2);
        act(() => callbacks[0]());
        clock = 1250;
        act(() => callbacks[1]());
        expect(game.result.current.view.phase).toBe('decision');
    });
});
