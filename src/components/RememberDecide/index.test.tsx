import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateRound } from '../../model/rememberDecide';
import type { RememberDecideConfig, RememberDecideRound } from '../../model/rememberDecide';
import RememberDecide from '.';

// Deterministic fixtures only. Production continues to sample truth independently.
const fixture = vi.hoisted(() => ({ generation: 0, oneTruthClass: false }));
vi.mock('../../model/rememberDecide', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../model/rememberDecide')>();
    return {
        ...actual,
        generateRound: vi.fn((config: RememberDecideConfig) => {
            const generation = fixture.generation++;
            const round: RememberDecideRound = {
                config: { ...config },
                items: Array.from({ length: config.sequenceLength }, (_, index) => {
                    const isSymmetric = fixture.oneTruthClass || index % 2 === 0;
                    return {
                        index,
                        // A, B, A at length three; shift on restart to demonstrate a fresh round.
                        location: { row: index % 2, column: (index % 2 + generation) % 4 },
                        pattern: actual.createSymmetryPattern(isSymmetric, config.symmetryDifficulty, () => .37),
                        isSymmetric,
                    };
                }),
            };
            return { ok: true as const, value: round };
        }),
    };
});

function latestRound(): RememberDecideRound {
    const result = vi.mocked(generateRound).mock.results.at(-1)?.value as ReturnType<typeof generateRound> | undefined;
    if (!result?.ok) throw new Error('Expected a generated fixture round.');
    return result.value;
}

function enterRecallLocations(round: RememberDecideRound): void {
    for (const item of round.items) {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`Row ${item.location.row + 1}, column ${item.location.column + 1}`) }));
    }
}

describe('The Moth Keeper assembled flow', () => {
    let clock = 0;
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        clock = 0;
        fixture.generation = 0;
        fixture.oneTruthClass = false;
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
    function toDecision(): void { advance(1000); advance(250); }
    function answerItem(answer: 'Yes' | 'No'): void {
        toDecision();
        fireEvent.click(screen.getByRole('button', { name: answer }));
        advance(250);
    }
    function completeInspections(round: RememberDecideRound): void {
        for (const item of round.items) answerItem(item.isSymmetric ? 'Yes' : 'No');
    }

    it('retains defaults and the unscored example and freezes settings after start', () => {
        render(<RememberDecide onExit={vi.fn()} />);
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'The night shift is yours.' }));
        expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Sequence length' }).value).toBe('3');
        expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Pattern differences' }).value).toBe('more');
        expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Judgement deadline' }).value).toBe('5000');
        expect(screen.getByText('Example · not scored')).toBeTruthy();
        expect(generateRound).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        expect(screen.queryByRole('combobox')).toBeNull();
        expect(screen.queryByText('Example answer: Yes.')).toBeNull();
        expect(generateRound).toHaveBeenCalledTimes(1);
    });

    it('runs location, judgement, and recall for all three items before independent results', () => {
        const { container } = render(<RememberDecide onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        const round = latestRound();
        for (let index = 0; index < round.items.length; index++) {
            expect(screen.getByText(`Firefly ${index + 1} of 3`)).toBeTruthy();
            expect(screen.getByRole('img', { name: /highlighted/i })).toBeTruthy();
            expect(container.querySelectorAll('.moth-pot__firefly')).toHaveLength(1);
            advance(1000);
            expect(screen.queryByRole('img', { name: /highlighted/i })).toBeNull();
            expect(container.querySelector('.moth-pot__firefly')).toBeNull();
            expect(container.querySelector('.remember-decide-memory-grid')).toBeNull();
            advance(250);
            expect(screen.getByRole('heading', { name: 'Is this vertically symmetrical?' })).toBeTruthy();
            expect(container.querySelectorAll('.remember-decide-pattern__cell')).toHaveLength(36);
            expect(container.innerHTML).not.toContain('isSymmetric');
            fireEvent.click(screen.getByRole('button', { name: round.items[index].isSymmetric ? 'Yes' : 'No' }));
            expect(container.querySelector('.remember-decide-pattern')).toBeNull();
            advance(250);
        }
        expect(screen.getByRole('heading', { name: 'Place your lanterns in order' })).toBeTruthy();
        expect(container.querySelector('.moth-pot-lantern')).toBeNull();
        enterRecallLocations(round);
        expect(screen.getAllByText('R1C1')).toHaveLength(2);
        expect(screen.queryByText('positions correct')).toBeNull();
        expect(screen.getByRole('status').textContent).toBe('Recall 3 of 3.');
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
        expect(screen.getAllByText('3/3', { selector: 'strong' })).toHaveLength(2);
        expect(screen.getByText('positions correct')).toBeTruthy();
        expect(screen.getByText('decisions correct')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Try next length' })).toBeTruthy();
        expect(screen.getByRole('status').textContent).toBe('Results available.');
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Lanterns in place.' }));
        expect(container.querySelectorAll('.remember-decide-review-list > li')).toHaveLength(3);
        expect(container.querySelectorAll('.remember-decide-pattern-review > li')).toHaveLength(3);
    });

    it.each(['more', 'some', 'fewer'] as const)('starts %s differences without renaming it a calibrated level', (differences) => {
        render(<RememberDecide onExit={vi.fn()} />);
        fireEvent.change(screen.getByRole('combobox', { name: 'Pattern differences' }), { target: { value: differences } });
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        expect(latestRound().config.symmetryDifficulty).toBe(differences);
        toDecision();
        expect(document.querySelectorAll('.remember-decide-pattern__cell.is-filled')).toHaveLength(18);
    });

    it.each([3000, 5000, 8000] as const)('times out an unanswered inspection at its %i ms deadline without feedback', (deadline) => {
        const { container } = render(<RememberDecide onExit={vi.fn()} />);
        fireEvent.change(screen.getByRole('combobox', { name: 'Judgement deadline' }), { target: { value: String(deadline) } });
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        toDecision();
        advance(deadline - 1);
        expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy();
        advance(1);
        expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull();
        expect(screen.getByRole('status').textContent).toBe('Time expired for pattern 1.');
        expect(container.querySelector('.remember-decide-pattern')).toBeNull();
        expect(container.innerHTML).not.toContain('isSymmetric');
        expect(screen.queryByText(/Correct answer:/)).toBeNull();
        advance(250);
        expect(screen.getByText('Firefly 2 of 3')).toBeTruthy();
    });

    it.each([4999.99, 5000, 5001])('settles an answer at %s ms by monotonic time before the timer callback runs', (elapsed) => {
        render(<RememberDecide onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        toDecision();
        clock += elapsed;
        fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
        const message = elapsed < 5000 ? 'Answer recorded for pattern 1.' : 'Time expired for pattern 1.';
        expect(screen.getByRole('status').textContent).toBe(message);
        advance(250);
        expect(screen.getByText('Firefly 2 of 3')).toBeTruthy();
    });

    it('keeps a timeout independent from exact recall and withholds the length-three recommendation', () => {
        render(<RememberDecide onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        const round = latestRound();
        toDecision();
        advance(5000);
        advance(250);
        answerItem('No');
        answerItem('Yes');
        enterRecallLocations(round);
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
        expect(screen.getByText('3/3', { selector: 'strong' })).toBeTruthy();
        expect(screen.getByText('2/3', { selector: 'strong' })).toBeTruthy();
        expect(screen.getByText('timeouts').parentElement?.textContent).toBe('1timeouts');
        expect(screen.queryByRole('button', { name: 'Try next length' })).toBeNull();
    });

    it('scores single-truth-class rounds normally but does not recommend a new length', () => {
        fixture.oneTruthClass = true;
        render(<RememberDecide onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        const round = latestRound();
        completeInspections(round);
        enterRecallLocations(round);
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
        expect(screen.getAllByText('3/3', { selector: 'strong' })).toHaveLength(2);
        expect(screen.getByText('Try another round to answer both pattern types.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Try next length' })).toBeNull();
    });

    it('changes only length on explicit advancement; New round preserves settings and Settings restores setup', () => {
        render(<RememberDecide onExit={vi.fn()} />);
        fireEvent.change(screen.getByRole('combobox', { name: 'Pattern differences' }), { target: { value: 'fewer' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Judgement deadline' }), { target: { value: '8000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        let round = latestRound();
        completeInspections(round);
        enterRecallLocations(round);
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
        expect(generateRound).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: 'Try next length' }));
        round = latestRound();
        expect(round.config).toEqual({ sequenceLength: 4, symmetryDifficulty: 'fewer', judgementDeadlineMs: 8000 });
        completeInspections(round);
        enterRecallLocations(round);
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
        fireEvent.click(screen.getByRole('button', { name: 'New round' }));
        expect(latestRound().config).toEqual(round.config);
        fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
        fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
        expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Sequence length' }).value).toBe('4');
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'The night shift is yours.' }));
    });

    it('stops optional advancement at eight', () => {
        render(<RememberDecide onExit={vi.fn()} />);
        fireEvent.change(screen.getByRole('combobox', { name: 'Sequence length' }), { target: { value: '8' } });
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        const round = latestRound();
        completeInspections(round);
        enterRecallLocations(round);
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
        expect(screen.getAllByText('8/8', { selector: 'strong' })).toHaveLength(2);
        expect(screen.queryByRole('button', { name: 'Try next length' })).toBeNull();
        expect(screen.getByText('You completed the maximum sequence length.')).toBeTruthy();
    });

    function reachPhase(phase: string): void {
        if (phase === 'location') return;
        if (phase === 'recall') {
            completeInspections(latestRound());
            fireEvent.click(screen.getByRole('button', { name: /Row 4, column 4/ }));
            return;
        }
        advance(1000);
        if (phase === 'location-blank') return;
        advance(250);
        if (phase === 'decision') return;
        fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    }

    for (const trigger of ['pause', 'page hiding'] as const) {
        it.each(['location', 'location-blank', 'decision', 'decision-blank', 'recall'])(`${trigger} discards all material during %s and restarts fresh`, (phase) => {
            const { container } = render(<RememberDecide onExit={vi.fn()} />);
            fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
            const previous = latestRound();
            reachPhase(phase);
            expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
            expect(screen.getByRole('button', { name: 'Exit' })).toBeTruthy();
            if (trigger === 'pause') fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
            else {
                const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
                act(() => document.dispatchEvent(new Event('visibilitychange')));
                hidden.mockRestore();
            }
            expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Round interrupted' }));
            expect(container.querySelector('.remember-decide-memory-grid, .remember-decide-pattern, .moth-pot__firefly, .moth-pot-lantern, .remember-decide-answer-strip')).toBeNull();
            expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull();
            expect(screen.queryByText('positions correct')).toBeNull();
            expect(vi.getTimerCount()).toBe(0);
            advance(10000);
            fireEvent.click(screen.getByRole('button', { name: 'Restart round' }));
            expect(latestRound().config).toEqual(previous.config);
            expect(latestRound().items[0].location).not.toEqual(previous.items[0].location);
            expect(screen.getByText('Firefly 1 of 3')).toBeTruthy();
            completeInspections(latestRound());
            expect(screen.getByRole('status').textContent).toBe('Recall 0 of 3.');
        });
    }

    it.each(['Pause', 'Exit'])('preserves focus on %s through automatic phase transitions including recall', (control) => {
        render(<RememberDecide onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        const button = screen.getByRole('button', { name: control });
        button.focus();
        for (let index = 0; index < 3; index++) {
            advance(1000);
            expect(document.activeElement).toBe(button);
            advance(250);
            expect(document.activeElement).toBe(button);
            advance(5000);
            expect(document.activeElement).toBe(button);
            advance(250);
        }
        expect(document.activeElement).toBe(button);
        expect(screen.getByRole('heading', { name: 'Place your lanterns in order' })).toBeTruthy();
    });

    it('suppresses held Enter/Space activation while retaining fresh native activation', () => {
        render(<RememberDecide onExit={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        const pause = screen.getByRole('button', { name: 'Pause' });
        expect(fireEvent.keyDown(pause, { key: 'Enter', repeat: true })).toBe(false);
        expect(screen.getByText('Firefly 1 of 3')).toBeTruthy();
        toDecision();
        const yes = screen.getByRole('button', { name: 'Yes' });
        expect(fireEvent.keyDown(yes, { key: ' ', repeat: true })).toBe(false);
        expect(fireEvent.keyDown(yes, { key: 'Enter', repeat: true })).toBe(false);
        expect(screen.getByRole('heading', { name: 'Is this vertically symmetrical?' })).toBeTruthy();
        fireEvent.click(yes);
        expect(screen.getByRole('status').textContent).toBe('Answer recorded for pattern 1.');
        fireEvent.click(pause);
        expect(screen.getByRole('heading', { name: 'Round interrupted' })).toBeTruthy();
    });

    it('keeps one timer under StrictMode and cancels it on Exit and unmount', () => {
        const onExit = vi.fn();
        const rendered = render(<StrictMode><RememberDecide onExit={onExit} /></StrictMode>);
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        expect(vi.getTimerCount()).toBe(1);
        toDecision();
        expect(vi.getTimerCount()).toBe(1);
        fireEvent.click(screen.getByRole('button', { name: 'Exit' }));
        expect(onExit).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
        fireEvent.click(screen.getByRole('button', { name: 'Start round' }));
        expect(vi.getTimerCount()).toBe(1);
        rendered.unmount();
        expect(vi.getTimerCount()).toBe(0);
    });
});
