import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SlotPointerHud from './index';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('SlotPointerHud', () => {
    it('renders active slot for full mode and nothing when off', () => {
        const { rerender } = render(
            <SlotPointerHud n={3} trialIndex={1} pointerMode="full" stimulusEpoch={1} />
        );
        expect(screen.getByLabelText('Active slot 2 of 3')).toBeTruthy();

        rerender(<SlotPointerHud n={3} trialIndex={1} pointerMode="off" stimulusEpoch={1} />);
        expect(screen.queryByLabelText(/Active slot/)).toBeNull();
    });

    it('shows fill copy on warmup trials without Continue', () => {
        render(
            <SlotPointerHud
                n={2}
                trialIndex={0}
                pointerMode="full"
                stimulusEpoch={1}
                paced
                opStep={null}
                onAdvanceOp={vi.fn()}
            />
        );
        expect(screen.getByText(/Fill slot 1/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    });

    it('shows paced compare/replace copy and Continue without auto-advancing', () => {
        vi.useFakeTimers();
        const onAdvanceOp = vi.fn();
        const { rerender } = render(
            <SlotPointerHud
                n={2}
                trialIndex={2}
                pointerMode="full"
                stimulusEpoch={2}
                paced
                opStep="COMPARE"
                onAdvanceOp={onAdvanceOp}
                revealPositionIndex={4}
                revealLetter="K"
                currentLetter="M"
                currentPositionIndex={1}
            />
        );

        expect(screen.getByText(/Compare slot 1/)).toBeTruthy();
        expect(screen.getByText(/remembered K vs now M/)).toBeTruthy();

        vi.advanceTimersByTime(900);
        expect(screen.getByText(/Compare slot 1/)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(onAdvanceOp).toHaveBeenCalledOnce();

        rerender(
            <SlotPointerHud
                n={2}
                trialIndex={2}
                pointerMode="full"
                stimulusEpoch={2}
                paced
                opStep="REPLACE"
                onAdvanceOp={onAdvanceOp}
                revealPositionIndex={4}
                revealLetter="K"
                currentLetter="M"
                currentPositionIndex={1}
            />
        );
        expect(screen.getByText('Replace slot 1: K → M')).toBeTruthy();
        vi.useRealTimers();
    });

    it('greys the slot on REPLACE', () => {
        const { container } = render(
            <SlotPointerHud
                n={2}
                trialIndex={2}
                pointerMode="full"
                stimulusEpoch={1}
                paced
                opStep="REPLACE"
                onAdvanceOp={vi.fn()}
            />
        );
        const active = container.querySelector('.slot-pointer-hud__slot.is-active');
        expect(active?.className).toContain('is-replace');
        expect(container.querySelector('.slot-pointer-hud__continue')).toBeTruthy();
    });

    it('places Continue and trailing action in one horizontal row', () => {
        const { container } = render(
            <SlotPointerHud
                n={2}
                trialIndex={2}
                pointerMode="full"
                stimulusEpoch={1}
                paced
                opStep="COMPARE"
                onAdvanceOp={vi.fn()}
                trailingAction={<button type="button">I&apos;ve got it</button>}
            />
        );
        const actions = container.querySelector('.slot-pointer-hud__actions');
        expect(actions).toBeTruthy();
        expect(actions?.querySelector('.slot-pointer-hud__continue')).toBeTruthy();
        expect(actions?.textContent).toContain("I've got it");
    });

    it('puts Back left of Continue and calls onRetreatOp', () => {
        const onRetreatOp = vi.fn();
        const { container } = render(
            <SlotPointerHud
                n={2}
                trialIndex={2}
                pointerMode="full"
                stimulusEpoch={1}
                paced
                opStep="REPLACE"
                onAdvanceOp={vi.fn()}
                onRetreatOp={onRetreatOp}
            />
        );
        const actions = container.querySelector('.slot-pointer-hud__actions');
        expect(actions).toBeTruthy();
        const row = within(actions as HTMLElement);
        const buttons = row.getAllByRole('button');
        expect(buttons[0]?.textContent).toBe('Back');
        expect(buttons[1]?.textContent).toBe('Continue');
        fireEvent.click(row.getByRole('button', { name: 'Back' }));
        expect(onRetreatOp).toHaveBeenCalledOnce();
    });
});
