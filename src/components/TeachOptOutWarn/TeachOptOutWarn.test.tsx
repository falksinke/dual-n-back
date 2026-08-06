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

    it('Move to speed ramp dismisses via onConfirm', () => {
        const onKeepPracticing = vi.fn();
        const onConfirm = vi.fn();
        render(
            <TeachOptOutWarn onKeepPracticing={onKeepPracticing} onConfirm={onConfirm} />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Move to speed ramp' }));

        vi.advanceTimersByTime(EXIT_MS);
        expect(onConfirm).toHaveBeenCalledOnce();
        expect(onKeepPracticing).not.toHaveBeenCalled();
    });

    it('keeps the keyboard gate through the exit animation until unmount', () => {
        const { container, unmount } = render(
            <TeachOptOutWarn onKeepPracticing={vi.fn()} onConfirm={vi.fn()} />
        );
        const dialog = container.querySelector('.teach-opt-out-warn');

        fireEvent.click(screen.getByRole('button', { name: 'Keep practicing' }));
        expect(dialog?.hasAttribute('data-modal-open')).toBe(true);

        vi.advanceTimersByTime(EXIT_MS);
        unmount();
        expect(document.querySelector('[data-modal-open]')).toBeNull();
    });

    it('ignores a second Escape during the exit animation', () => {
        const onKeepPracticing = vi.fn();
        render(
            <TeachOptOutWarn onKeepPracticing={onKeepPracticing} onConfirm={vi.fn()} />
        );

        fireEvent.keyDown(document, { key: 'Escape', bubbles: true });
        fireEvent.keyDown(document, { key: 'Escape', bubbles: true });

        vi.advanceTimersByTime(EXIT_MS);
        expect(onKeepPracticing).toHaveBeenCalledOnce();
    });

    it('restores focus to the opt-out invoker on unmount after dismiss', () => {
        const invoker = document.createElement('button');
        invoker.className = 'teach-opt-out__btn';
        document.body.appendChild(invoker);

        const onKeepPracticing = vi.fn();
        const { unmount } = render(
            <TeachOptOutWarn onKeepPracticing={onKeepPracticing} onConfirm={vi.fn()} />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Keep practicing' }));
        vi.advanceTimersByTime(EXIT_MS);
        expect(onKeepPracticing).toHaveBeenCalledOnce();

        unmount();
        expect(document.activeElement).toBe(invoker);

        invoker.remove();
    });

    it('skips the exit delay under prefers-reduced-motion', () => {
        mockMatchMedia(true);
        const onKeepPracticing = vi.fn();
        render(
            <TeachOptOutWarn onKeepPracticing={onKeepPracticing} onConfirm={vi.fn()} />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Keep practicing' }));
        vi.advanceTimersByTime(0);
        expect(onKeepPracticing).toHaveBeenCalledOnce();
    });
});
