import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY } from '../../model/spatialSuite/storage';
import SpatialSuite from '.';

const store = new Map<string, string>();
const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
};

beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', localStorage);
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'Date'] });
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

/** Advance in frame-sized steps, as a browser would. */
function play(ms: number) {
    for (let t = 0; t < ms; t += 16) act(() => vi.advanceTimersByTime(16));
}

describe('Spatial suite', () => {
    it('lists the five games without intelligence claims', () => {
        render(<SpatialSuite onExit={() => {}} />);
        for (const name of ['Drift', 'Pattern', 'Wayfinder', 'Shift', 'Relay']) {
            expect(screen.getByRole('button', { name: new RegExp(`^${name}`) })).toBeTruthy();
        }
        expect(document.body.textContent).not.toMatch(/\bIQ\b|brain age/i);
        expect(screen.getByRole('button', { name: 'Take the check' })).toBeTruthy();
    });

    it('explains every game on the hub and before the first block', () => {
        render(<SpatialSuite onExit={() => {}} />);
        expect(screen.getByRole('heading', { name: 'How the games work' })).toBeTruthy();
        expect(screen.getAllByText('Press Match when')).toHaveLength(6);
        fireEvent.click(screen.getByRole('button', { name: /^Shift/ }));
        expect(screen.getByText('Press Match when')).toBeTruthy();
        expect(screen.getByText(/Under the rule shown now/)).toBeTruthy();
    });

    it('plays a Drift block end to end, logs it and adapts', () => {
        render(<SpatialSuite onExit={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: /^Drift/ }));
        expect(screen.getByRole('heading', { name: 'Drift' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
        expect(screen.getByRole('region', { name: /^Drift · block 1/ })).toBeTruthy();

        // 21 trials at 3 s each, plus a little slack for the final frame.
        play(21 * 3000 + 200);

        expect(screen.getByRole('heading', { name: /accuracy/ })).toBeTruthy();
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        expect(saved.blocks).toHaveLength(1);
        expect(saved.trials).toHaveLength(21);
        // Never pressing Match scores 0% and cannot lower the starting level.
        expect(saved.blocks[0].accuracy).toBe(0);
        expect(saved.tracks.drift.n).toBe(1);
    });

    it('scores a press on the current trial once', () => {
        render(<SpatialSuite onExit={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: /^Wayfinder/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
        play(100);
        fireEvent.keyDown(window, { key: ' ' });
        fireEvent.keyDown(window, { key: ' ' });
        expect(screen.getByText('Not a match')).toBeTruthy();
        play(22 * 3000 + 200);
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        expect(saved.trials.filter((t: { response: boolean }) => t.response)).toHaveLength(1);
        expect(saved.blocks[0].falseAlarms).toBe(1);
    });

    it('stops a block with Escape without saving it', () => {
        render(<SpatialSuite onExit={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: /^Shift/ }));
        expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(2); // the dealt rules
        fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
        play(5000);
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.getByRole('heading', { name: 'Spatial suite' })).toBeTruthy();
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).blocks).toHaveLength(0);
    });

    it('discards a block when the page is hidden mid-block', () => {
        render(<SpatialSuite onExit={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: /^Drift/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
        play(4000);
        const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        act(() => { document.dispatchEvent(new Event('visibilitychange')); });
        visibility.mockRestore();
        expect(screen.getByRole('heading', { name: 'Block paused' })).toBeTruthy();
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).blocks).toHaveLength(0);
        fireEvent.click(screen.getByRole('button', { name: 'Restart block' }));
        expect(screen.getByRole('button', { name: 'Start block' })).toBeTruthy();
    });

    it('asks for the tracked discs at the end of a Relay block', () => {
        render(<SpatialSuite onExit={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: /^Relay/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
        play(3000 + 21 * 3000 + 1200);
        const confirm = screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement;
        expect(confirm.disabled).toBe(true);
        const discs = screen.getAllByRole('button', { name: /^Disc/ });
        fireEvent.click(discs[0]);
        fireEvent.click(discs[1]);
        expect(confirm.disabled).toBe(false);
        fireEvent.click(confirm);
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        expect(saved.blocks[0].trackedTotal).toBe(2);
        expect(screen.getByText('Tracked')).toBeTruthy();
    });

    it('runs a session across three different games', () => {
        render(<SpatialSuite onExit={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start session' }));
        expect(screen.getByText('Game 1 of 3 · block 1 of 4')).toBeTruthy();
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        expect(new Set(saved.lastSessionMix).size).toBe(3);
    });
});
