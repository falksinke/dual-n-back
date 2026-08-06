import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import StrategyInstruction from './index';

const EXIT_MS = 220;

function mockMatchMedia(reducedMotion = false) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

describe('StrategyInstruction', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockMatchMedia(false);
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('has aria-modal="true"', () => {
        render(<StrategyInstruction n={2} onContinue={vi.fn()} />);
        expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    });

    it('sets data-modal-open while open and not leaving', () => {
        const { container } = render(<StrategyInstruction n={2} onContinue={vi.fn()} />);
        const dialog = container.querySelector('.strategy-instruction');
        expect(dialog?.hasAttribute('data-modal-open')).toBe(true);
    });

    it('does not call onContinue when Escape is pressed', () => {
        const onContinue = vi.fn();
        render(<StrategyInstruction n={2} onContinue={onContinue} />);

        fireEvent.keyDown(document, { key: 'Escape', bubbles: true });

        vi.advanceTimersByTime(EXIT_MS);
        expect(onContinue).not.toHaveBeenCalled();
    });

    it('calls onContinue after exit delay when CTA is clicked', () => {
        const onContinue = vi.fn();
        render(<StrategyInstruction n={2} onContinue={onContinue} />);

        fireEvent.click(screen.getByRole('button', { name: 'Start teach' }));

        expect(onContinue).not.toHaveBeenCalled();
        vi.advanceTimersByTime(EXIT_MS);
        expect(onContinue).toHaveBeenCalledOnce();
    });

    it('removes data-modal-open when leaving', () => {
        const { container } = render(<StrategyInstruction n={2} onContinue={vi.fn()} />);
        const dialog = container.querySelector('.strategy-instruction');

        fireEvent.click(screen.getByRole('button', { name: 'Start teach' }));
        expect(dialog?.hasAttribute('data-modal-open')).toBe(false);
    });
});
