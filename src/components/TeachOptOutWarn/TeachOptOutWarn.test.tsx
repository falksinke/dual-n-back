import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import TeachOptOutWarn from './index';

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

describe('TeachOptOutWarn', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockMatchMedia(false);
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('has aria-modal="true"', () => {
        render(<TeachOptOutWarn onKeepPracticing={vi.fn()} onConfirm={vi.fn()} />);
        expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    });

    it('uses z-index 45 so it stacks above session exit', () => {
        const scss = readFileSync(resolve(__dirname, 'TeachOptOutWarn.scss'), 'utf8');
        expect(scss).toMatch(/z-index:\s*45/);
    });

    it('sets data-modal-open while open', () => {
        const { container } = render(
            <TeachOptOutWarn onKeepPracticing={vi.fn()} onConfirm={vi.fn()} />
        );
        const dialog = container.querySelector('.teach-opt-out-warn');
        expect(dialog?.hasAttribute('data-modal-open')).toBe(true);
    });

    it('Escape dismisses via onKeepPracticing, not onConfirm', () => {
        const onKeepPracticing = vi.fn();
        const onConfirm = vi.fn();
        render(
            <TeachOptOutWarn onKeepPracticing={onKeepPracticing} onConfirm={onConfirm} />
        );

        fireEvent.keyDown(document, { key: 'Escape', bubbles: true });

        expect(onKeepPracticing).not.toHaveBeenCalled();
        expect(onConfirm).not.toHaveBeenCalled();

        vi.advanceTimersByTime(EXIT_MS);
        expect(onKeepPracticing).toHaveBeenCalledOnce();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('Keep practicing button dismisses via onKeepPracticing', () => {
        const onKeepPracticing = vi.fn();
        const onConfirm = vi.fn();
        render(
            <TeachOptOutWarn onKeepPracticing={onKeepPracticing} onConfirm={onConfirm} />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Keep practicing' }));

        vi.advanceTimersByTime(EXIT_MS);
        expect(onKeepPracticing).toHaveBeenCalledOnce();
        expect(onConfirm).not.toHaveBeenCalled();
    });
});
