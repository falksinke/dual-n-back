import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
    OperationCard,
    SwappingConfig,
    SwappingRound,
    SwappingScore,
    SwappingToken,
} from '../../model/swapping/types';
import AudioEncoding from './AudioEncoding';
import Instruction from './Instruction';
import Result from './Result';
import Setup from './Setup';

afterEach(cleanup);

const config: SwappingConfig = {
    content: 'letters',
    layout: 'sequence',
    length: 4,
    pattern: 'unique',
    tier: 'compound',
    operationCount: 2,
};

describe('Swapping phase views', () => {
    it('keeps incompatible settings editable and explains why Start is disabled', () => {
        const onChange = vi.fn();
        render(
            <Setup
                config={{ ...config, content: 'audio', layout: '2x2' }}
                validationError="Spoken letters are available for sequences only."
                onChange={onChange}
                onStart={vi.fn()}
                onSample={vi.fn()}
            />
        );

        expect(screen.getByRole('alert').textContent).toContain('sequences only');
        expect(screen.getByRole('button', { name: 'Start round' })).toHaveProperty('disabled', true);
        expect(screen.getByRole('option', { name: 'Spoken letters' })).toBeTruthy();
        expect(screen.getByRole('option', { name: '2 × 2 grid' })).toBeTruthy();
    });

    it('shows a concrete compound example before starting', () => {
        render(
            <Setup
                config={config}
                onChange={vi.fn()}
                onStart={vi.fn()}
                onSample={vi.fn()}
            />
        );

        expect(screen.getByLabelText('Operation example').textContent).toContain(
            'Apply step 2 to the changed order'
        );
    });

    it('shows only the current instruction and identical covered bays', () => {
        const card: OperationCard = {
            operations: [
                { type: 'swap', first: 0, second: 2 },
                { type: 'reverse-span', start: 1, end: 3 },
            ],
        };
        const onDone = vi.fn();
        render(
            <Instruction
                config={config}
                card={card}
                cardIndex={0}
                cardCount={1}
                onDone={onDone}
                onPause={vi.fn()}
            />
        );

        expect(screen.getByText('Swap position 1 and position 3')).toBeTruthy();
        expect(screen.getByText('Reverse positions 2 through 4')).toBeTruthy();
        const board = screen.getByRole('list', {
            name: 'Covered bays with affected positions highlighted',
        });
        expect(within(board).getAllByLabelText(/covered/)).toHaveLength(4);
        expect(within(board).queryByText(/[A-Z]/)).toBeNull();
        expect(board.querySelectorAll('img, .swapping-cargo__mark')).toHaveLength(0);
        expect(board.querySelectorAll('.swapping-cargo__cover')).toHaveLength(4);

        const reconstruct = screen.getByRole('button', { name: 'Reconstruct' });
        fireEvent.keyDown(reconstruct, { key: 'Enter', repeat: true });
        expect(onDone).not.toHaveBeenCalled();
    });

    it('expands compact grid positions into one unambiguous spoken swap instruction', () => {
        render(
            <Instruction
                config={{ ...config, layout: '2x2', length: 4, tier: 'basic' }}
                card={{ operations: [{ type: 'swap', first: 0, second: 3 }] }}
                cardIndex={0}
                cardCount={1}
                onDone={vi.fn()}
                onPause={vi.fn()}
            />
        );

        const instruction = screen.getByRole('listitem', {
            name: 'Swap row 1, column 1 and row 2, column 2',
        });
        const visibleText = within(instruction).getByText('Swap R1C1 and R2C2');
        expect(visibleText.getAttribute('aria-hidden')).toBe('true');
    });

    it('never renders written letters during audio encoding', () => {
        const onReady = vi.fn();
        const { rerender } = render(
            <AudioEncoding
                config={{ ...config, content: 'audio' }}
                status="playing"
                currentIndex={1}
                onReady={onReady}
                onReplay={vi.fn()}
                onRetry={vi.fn()}
                onBack={vi.fn()}
                onPause={vi.fn()}
            />
        );

        expect(screen.getByRole('button', { name: 'Ready' })).toHaveProperty('disabled', true);
        expect(screen.getByRole('button', { name: 'Replay' })).toHaveProperty('disabled', true);
        expect(screen.queryByText(/^C$|^H$|^K$|^L$/)).toBeNull();

        rerender(
            <AudioEncoding
                config={{ ...config, content: 'audio' }}
                status="ready"
                currentIndex={3}
                onReady={onReady}
                onReplay={vi.fn()}
                onRetry={vi.fn()}
                onBack={vi.fn()}
                onPause={vi.fn()}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: 'Ready' }));
        expect(onReady).toHaveBeenCalledOnce();
    });

    it('reports exact placement score, settings and the full solution only after submission', () => {
        const initial: readonly SwappingToken[] = [
            { id: 'number:1:0', kind: 'number', value: '1', label: '1' },
            { id: 'letter:H:0', kind: 'letter', value: 'H', label: 'H' },
            { id: 'letter:C:0', kind: 'letter', value: 'C', label: 'C' },
            { id: 'letter:K:0', kind: 'letter', value: 'K', label: 'K' },
        ];
        const correct = [initial[2], initial[1], initial[0], initial[3]];
        const round: SwappingRound = {
            config: { ...config, content: 'mixed', tier: 'basic', operationCount: 1 },
            initial,
            cards: [{ operations: [{ type: 'swap', first: 0, second: 2 }] }],
            states: [initial, correct],
            final: correct,
        };
        const score: SwappingScore = {
            exact: false,
            correctlyPlaced: 2,
            total: 4,
            submitted: initial,
            correct,
        };
        render(
            <Result round={round} score={score} onNewRound={vi.fn()} onSetup={vi.fn()} />
        );

        expect(screen.getByText('2 of 4 positions correct')).toBeTruthy();
        expect(screen.getByText('Mixed')).toBeTruthy();
        expect(screen.getByText('Sequence · 4 items')).toBeTruthy();
        expect(screen.getByRole('list', { name: 'Your submitted arrangement' })).toBeTruthy();
        expect(screen.getByRole('list', { name: 'Correct arrangement' })).toBeTruthy();
        expect(screen.getByText('Show step-by-step solution')).toBeTruthy();
        const log = screen.getByText('Show step-by-step solution').closest('details');
        expect(log).not.toBeNull();
        log!.open = true;
        fireEvent(log!, new Event('toggle'));
        expect(screen.getByRole('list', { name: 'Starting arrangement' })).toBeTruthy();
        expect(screen.getByText('Swap position 1 and position 3')).toBeTruthy();
    });
});
