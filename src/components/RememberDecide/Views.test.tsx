import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MemoryLocation, RememberDecideRound, RememberDecideScore } from '../../model/rememberDecide';
import Recall from './Recall';
import Result from './Result';
import SymmetryDecision from './SymmetryDecision';
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
        pattern: { cells: Array.from({ length: 36 }, (_, cell) => (cell + index) % 3 === 0) },
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

describe('Remember & Decide phase views', () => {
    it('keeps decision markup free of remembered locations and symmetry truth', () => {
        const { container } = render(<SymmetryDecision pattern={mixedRound.items[0].pattern} itemIndex={0} itemCount={2}
            deadlineMs={5000} onMounted={vi.fn()} onAnswer={vi.fn()} />);
        expect(screen.getByRole('heading', { name: 'Is this vertically symmetrical?' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy();
        expect(container.textContent).not.toContain('R1C2');
        expect(container.innerHTML).not.toContain('isSymmetric');
        expect(container.innerHTML).not.toContain('correct');
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
        expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(screen.getAllByText('R1C1')).toHaveLength(1);
        expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
        expect(screen.queryByText('R1C1')).toBeNull();
    });

    it('shows both score components, result-only truth, and the all-one-truth message regardless of score reason', () => {
        const oneClassRound: RememberDecideRound = {
            ...mixedRound,
            items: mixedRound.items.map((item) => ({ ...item, isSymmetric: true })),
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
        expect(styles).toContain('flex-wrap: wrap');
        expect(styles).toContain('min-width: 0');
        expect(styles).toContain('@media (max-width: 20rem)');
        expect(styles).not.toContain('overflow-x: scroll');
    });
});
