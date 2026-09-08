import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MemoryLocation, RememberDecideRound, RememberDecideScore } from '../../model/rememberDecide';
import Recall from './Recall';
import Result from './Result';
import SymmetryDecision from './SymmetryDecision';
import MothSpecimen from './MothSpecimen';
import { createSymmetryPattern } from '../../model/rememberDecide';
import styles from './RememberDecide.scss?raw';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const mixedRound: RememberDecideRound = {
    config: { sequenceLength: 2, symmetryDifficulty: 'more', judgementDeadlineMs: 5000 },
    items: [true, false].map((isSymmetric, index) => ({
        index,
        location: { row: index, column: index + 1 },
        pattern: createSymmetryPattern(isSymmetric, 'more', () => 0.37),
        isSymmetric,
    })),
};

function score(round = mixedRound, reason: RememberDecideScore['recommendation']['reason'] = 'increase'): RememberDecideScore {
    return {
        correctlyRecalled: round.items.length,
        recallTotal: round.items.length,
        exactSequence: true,
        correctJudgements: round.items.length,
        judgementTotal: round.items.length,
        timeoutCount: 0,
        requiredCorrectJudgements: round.items.length,
        correctSymmetricJudgements: round.items.filter((item) => item.isSymmetric).length,
        correctAsymmetricJudgements: round.items.filter((item) => !item.isSymmetric).length,
        recommendation: { canIncrease: reason === 'increase', nextLength: reason === 'increase' ? round.items.length + 1 : null, reason },
        recalled: round.items.map((item) => item.location),
        decisions: round.items.map((item) => ({ itemIndex: item.index, answer: item.isSymmetric ? 'yes' : 'no', timedOut: false })),
    };
}

function RecallHarness() {
    const [recalled, setRecalled] = useState<MemoryLocation[]>([]);
    return <Recall generation={3} sequenceLength={2} recalled={recalled}
        onRemember={(_, row, column) => setRecalled((current) => [...current, { row, column }])}
        onUndo={() => setRecalled((current) => current.slice(0, -1))}
        onClear={() => setRecalled([])} onSubmit={vi.fn()} />;
}

describe('The Moth Keeper phase views', () => {
    it('keeps decision markup free of remembered locations and symmetry truth', () => {
        const { container } = render(<SymmetryDecision pattern={mixedRound.items[0].pattern} itemIndex={0} itemCount={2}
            deadlineMs={5000} onMounted={vi.fn()} onAnswer={vi.fn()} />);
        expect(screen.getByRole('heading', { name: 'Is this vertically symmetrical?' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy();
        expect(container.textContent).not.toContain('R1C2');
        expect(container.innerHTML).not.toContain('isSymmetric');
        expect(container.innerHTML).not.toContain('correct');
    });

    it.each(['more', 'some', 'fewer'] as const)('keeps every Boolean cell row-major in full and compact %s specimens', (difference) => {
        for (const symmetric of [true, false]) {
            const pattern = createSymmetryPattern(symmetric, difference, () => 0.37);
            const { container, unmount } = render(<><MothSpecimen pattern={pattern} /><MothSpecimen pattern={pattern} compact /></>);
            const grids = container.querySelectorAll('.remember-decide-pattern');
            expect(grids).toHaveLength(2);
            for (const grid of grids) {
                const cells = [...grid.querySelectorAll('.remember-decide-pattern__cell')];
                expect(cells).toHaveLength(36);
                expect(cells.map((cell) => cell.classList.contains('is-filled'))).toEqual(pattern.cells);
                expect(cells.filter((cell) => cell.classList.contains('is-filled'))).toHaveLength(18);
                expect(grid.getAttribute('aria-label')).toContain('Row 1:');
                expect(grid.getAttribute('aria-label')).toContain('Row 6:');
                expect(grid.getAttribute('aria-label')).not.toMatch(/symmetr|correct|answer/i);
            }
            unmount();
        }
    });

    it('uses the same decorative frame for both truths without an overlay inside the cells', () => {
        const { container, rerender } = render(<MothSpecimen pattern={createSymmetryPattern(true, 'fewer', () => 0.4)} />);
        const frame = container.querySelector('.moth-specimen__frame')?.outerHTML;
        expect(frame).toBeTruthy();
        rerender(<MothSpecimen pattern={createSymmetryPattern(false, 'fewer', () => 0.4)} />);
        expect(container.querySelector('.moth-specimen__frame')?.outerHTML).toBe(frame);
        expect(container.querySelector('.remember-decide-pattern svg')).toBeNull();
        expect(container.querySelector('[data-symmetric], [data-truth], [data-correct], [title]')).toBeNull();
    });

    it('supports repeated cells, editing, complete-only submit, and two-dimensional arrow focus', () => {
        render(<RecallHarness />);
        const first = screen.getByRole('button', { name: /Row 1, column 1/ });
        expect(document.activeElement).toBe(first);
        fireEvent.keyDown(first, { key: 'ArrowRight' });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: /Row 1, column 2/ }));
        fireEvent.click(first);
        fireEvent.click(first);
        expect(screen.getAllByText('R1C1')).toHaveLength(2);
        expect(document.querySelectorAll('.moth-pot-lantern')).toHaveLength(1);
        expect(screen.getByText('×2')).toBeTruthy();
        expect(screen.queryByText(/positions correct/)).toBeNull();
        expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(screen.getAllByText('R1C1')).toHaveLength(1);
        expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
        expect(screen.queryByText('R1C1')).toBeNull();
        expect(document.querySelectorAll('.moth-pot-lantern')).toHaveLength(0);
        expect(document.querySelectorAll('.moth-pot__firefly')).toHaveLength(0);
    });

    it('shows both score components, result-only truth, and the all-one-truth message regardless of score reason', () => {
        const oneClassRound: RememberDecideRound = {
            ...mixedRound,
            items: mixedRound.items.map((item) => ({ ...item, isSymmetric: true, pattern: createSymmetryPattern(true, 'more', () => 0.37) })),
        };
        render(<Result round={oneClassRound} score={score(oneClassRound, 'recall-inexact')}
            onNewRound={vi.fn()} onTryNextLength={vi.fn()} onSetup={vi.fn()} onExit={vi.fn()} />);
        expect(screen.getByText('positions correct')).toBeTruthy();
        expect(screen.getByText('decisions correct')).toBeTruthy();
        expect(screen.getAllByText((_, element) => element?.tagName === 'P' && element.textContent?.startsWith('Correct answer:') === true)).toHaveLength(oneClassRound.items.length);
        expect(screen.getByText('Try another round to answer both pattern types.')).toBeTruthy();
    });

    it('encodes narrow-layout minimum targets, ordered wrapping, and overflow containment in local CSS', () => {
        expect(styles).toContain('min-height: var(--touch-min)');
        expect(styles).toContain('min-width: var(--touch-min)');
        expect(styles).toContain('aspect-ratio: 1');
        expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
        expect(styles).toContain('flex-wrap: wrap');
        expect(styles).toContain('min-width: 0');
        expect(styles).toContain('@media (max-width: 20rem)');
        expect(styles).not.toContain('overflow-x: scroll');
    });
});
