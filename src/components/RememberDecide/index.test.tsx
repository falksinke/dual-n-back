import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RememberDecideRound } from '../../model/rememberDecide';
import RememberDecide from '.';

const assembledRound = vi.hoisted((): RememberDecideRound => ({
    config: { sequenceLength: 3, symmetryDifficulty: 'more', judgementDeadlineMs: 3000 },
    items: [true, false, true].map((isSymmetric, index) => ({
        index,
        location: { row: index, column: (index + 1) % 4 },
        pattern: { cells: Array.from({ length: 36 }, (_, cell) => cell % 4 === index) },
        isSymmetric,
    })),
}));

vi.mock('../../model/rememberDecide', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../model/rememberDecide')>();
    return { ...actual, generateRound: () => ({ ok: true, value: assembledRound }) };
});

describe('Remember & Decide assembled flow', () => {
    let clock = 0;

    beforeEach(() => {
        vi.useFakeTimers();
        clock = 0;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    function advance(milliseconds: number): void {
        clock += milliseconds;
        act(() => vi.advanceTimersByTime(milliseconds));
    }

    it('runs location, judgement, and recall for all three items before independent results', () => {
        render(<RememberDecide onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        for (let index = 0; index < assembledRound.items.length; index++) {
            expect(screen.getByText(`Location ${index + 1} of 3`)).toBeTruthy();
            expect(screen.getByRole('img', { name: /highlighted/i })).toBeTruthy();
            advance(1000);
            expect(screen.queryByRole('img', { name: /highlighted/i })).toBeNull();
            advance(250);
            expect(screen.getByRole('heading', { name: 'Is this vertically symmetrical?' })).toBeTruthy();
            fireEvent.click(screen.getByRole('button', { name: assembledRound.items[index].isSymmetric ? 'Yes' : 'No' }));
            advance(250);
        }
        expect(screen.getByRole('heading', { name: 'Select every location in order' })).toBeTruthy();
        for (const item of assembledRound.items) {
            fireEvent.click(screen.getByRole('button', { name: new RegExp(`Row ${item.location.row + 1}, column ${item.location.column + 1}`) }));
        }
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
        expect(screen.getAllByText('3/3', { selector: 'strong' })).toHaveLength(2);
        expect(screen.getByText('positions correct')).toBeTruthy();
        expect(screen.getByText('decisions correct')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Try next length' })).toBeTruthy();
    });

    it('removes all task material on Pause and suppresses held native activation', () => {
        render(<RememberDecide onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        const pause = screen.getByRole('button', { name: 'Pause' });
        fireEvent.keyDown(pause, { key: 'Enter', repeat: true });
        expect(screen.getByText('Location 1 of 3')).toBeTruthy();
        fireEvent.click(pause);
        expect(screen.getByRole('heading', { name: 'Round interrupted' })).toBeTruthy();
        expect(screen.queryByText('Location 1 of 3')).toBeNull();
        expect(screen.queryByRole('img', { name: /highlighted/i })).toBeNull();
    });
});
