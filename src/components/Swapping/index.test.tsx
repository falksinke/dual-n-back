import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Swapping from './index';
import type { LetterPlayerCallbacks } from './audio';

const audio = vi.hoisted(() => ({ play: vi.fn(), cancel: vi.fn(), dispose: vi.fn() }));
vi.mock('./audio', () => ({ createLetterPlayer: () => audio }));

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function placeNextToken() {
    const button = screen.getAllByRole('button', { name: /remaining/ })
        .find((element) => !(element as HTMLButtonElement).disabled);
    expect(button).toBeDefined();
    await act(async () => { fireEvent.click(button!); });
}

describe('assembled Swapping game', () => {
    it('hides the round on pause and reveals the solution only after submission', async () => {
        render(<Swapping onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        expect(screen.getByRole('list', { name: 'Starting arrangement' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Ready' }));
        expect(screen.queryByRole('list', { name: 'Starting arrangement' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Reconstruct' }));
        await placeNextToken();
        const firstSlot = within(screen.getByRole('list', { name: 'Answer slots' })).getAllByRole('button')[0].getAttribute('aria-label');
        const activeLabel = document.activeElement?.getAttribute('aria-label');
        fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
        expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Resume', 'Exit']);
        expect(screen.queryByRole('list')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
        expect(within(screen.getByRole('list', { name: 'Answer slots' })).getAllByRole('button')[0].getAttribute('aria-label')).toBe(firstSlot);
        expect(document.activeElement?.getAttribute('aria-label')).toBe(activeLabel);
        await placeNextToken();
        await placeNextToken();
        expect(screen.queryByRole('list', { name: 'Correct arrangement' })).toBeNull();
        expect(screen.queryByText('Show step-by-step solution')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Submit answer' }));
        expect(screen.getByRole('list', { name: 'Your submitted arrangement' })).toBeTruthy();
        expect(screen.getByRole('list', { name: 'Correct arrangement' })).toBeTruthy();
        expect(screen.getByText('Show step-by-step solution')).toBeTruthy();
        expect(screen.getByText(/of 3 positions correct/)).toBeTruthy();
    });

    it('wires audio Retry and Back without scoring playback failures', () => {
        render(<Swapping onExit={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'audio' } });
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        expect(audio.play).toHaveBeenCalledOnce();
        const first = audio.play.mock.calls[0][1] as LetterPlayerCallbacks;
        act(() => first.onError('Could not play audio'));
        expect(screen.getByRole('alert').textContent).toBe('Could not play audio');
        expect(screen.queryByText('Round complete')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        expect(audio.play).toHaveBeenCalledTimes(2);
        const second = audio.play.mock.calls[1][1] as LetterPlayerCallbacks;
        act(() => second.onError('Could not play audio'));
        fireEvent.click(screen.getByRole('button', { name: 'Back to setup' }));
        expect(screen.getByRole('button', { name: 'Start round' })).toBeTruthy();
        expect(screen.queryByText('Round complete')).toBeNull();
    });
});
