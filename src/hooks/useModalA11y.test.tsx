import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import { useModalA11y } from './useModalA11y';

describe('useModalA11y', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('calls onEscape and prevents default while active', () => {
        const onEscape = vi.fn();
        const container = document.createElement('div');
        document.body.appendChild(container);

        const containerRef = { current: container };
        renderHook(() =>
            useModalA11y({
                active: true,
                onEscape,
                containerRef,
            })
        );

        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        document.dispatchEvent(event);

        expect(onEscape).toHaveBeenCalledOnce();
        expect(event.defaultPrevented).toBe(true);
    });

    it('does not call onEscape while inactive', () => {
        const onEscape = vi.fn();
        const container = document.createElement('div');
        document.body.appendChild(container);

        const containerRef = { current: container };
        renderHook(() =>
            useModalA11y({
                active: false,
                onEscape,
                containerRef,
            })
        );

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(onEscape).not.toHaveBeenCalled();
    });

    it('sets data-modal-open while active and removes it when inactive', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const containerRef = { current: container };

        const { rerender } = renderHook(
            ({ active }) =>
                useModalA11y({
                    active,
                    onEscape: vi.fn(),
                    containerRef,
                }),
            { initialProps: { active: true } }
        );

        expect(container.hasAttribute('data-modal-open')).toBe(true);

        rerender({ active: false });
        expect(container.hasAttribute('data-modal-open')).toBe(false);
    });

    it('wraps Tab from last to first focusable when enableTrap is true', () => {
        const container = document.createElement('div');
        const first = document.createElement('button');
        first.textContent = 'First';
        const last = document.createElement('button');
        last.textContent = 'Last';
        container.append(first, last);
        document.body.appendChild(container);

        const containerRef = { current: container };
        renderHook(() =>
            useModalA11y({
                active: true,
                onEscape: vi.fn(),
                enableTrap: true,
                containerRef,
            })
        );

        last.focus();
        expect(document.activeElement).toBe(last);

        act(() => {
            container.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
            );
        });

        expect(document.activeElement).toBe(first);
    });

    it('wraps Shift+Tab from first to last focusable when enableTrap is true', () => {
        const container = document.createElement('div');
        const first = document.createElement('button');
        first.textContent = 'First';
        const last = document.createElement('button');
        last.textContent = 'Last';
        container.append(first, last);
        document.body.appendChild(container);

        const containerRef = { current: container };
        renderHook(() =>
            useModalA11y({
                active: true,
                onEscape: vi.fn(),
                enableTrap: true,
                containerRef,
            })
        );

        first.focus();
        expect(document.activeElement).toBe(first);

        act(() => {
            container.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Tab',
                    shiftKey: true,
                    bubbles: true,
                    cancelable: true,
                })
            );
        });

        expect(document.activeElement).toBe(last);
    });

    it('does not wrap Tab when enableTrap is false', () => {
        const container = document.createElement('div');
        const only = document.createElement('button');
        only.textContent = 'Only';
        container.appendChild(only);
        document.body.appendChild(container);

        const containerRef = { current: container };
        renderHook(() =>
            useModalA11y({
                active: true,
                onEscape: vi.fn(),
                enableTrap: false,
                containerRef,
            })
        );

        only.focus();

        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        container.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(only);
    });

    it('restores focus to an HTMLElement restoreTarget when active becomes false', () => {
        const trigger = document.createElement('button');
        trigger.textContent = 'Trigger';
        document.body.appendChild(trigger);
        trigger.focus();

        const container = document.createElement('div');
        const modalButton = document.createElement('button');
        modalButton.textContent = 'Modal';
        container.appendChild(modalButton);
        document.body.appendChild(container);

        const containerRef = { current: container };
        const { rerender } = renderHook(
            ({ active }) =>
                useModalA11y({
                    active,
                    onEscape: vi.fn(),
                    restoreTarget: trigger,
                    containerRef,
                }),
            { initialProps: { active: true } }
        );

        expect(document.activeElement).toBe(modalButton);

        rerender({ active: false });
        expect(document.activeElement).toBe(trigger);
    });

    it('restores focus via selector restoreTarget when active becomes false', () => {
        const trigger = document.createElement('button');
        trigger.className = 'restore-trigger';
        trigger.textContent = 'Trigger';
        document.body.appendChild(trigger);
        trigger.focus();

        const container = document.createElement('div');
        const modalButton = document.createElement('button');
        modalButton.textContent = 'Modal';
        container.appendChild(modalButton);
        document.body.appendChild(container);

        const containerRef = { current: container };
        const { rerender } = renderHook(
            ({ active }) =>
                useModalA11y({
                    active,
                    onEscape: vi.fn(),
                    restoreTarget: '.restore-trigger',
                    containerRef,
                }),
            { initialProps: { active: true } }
        );

        expect(document.activeElement).toBe(modalButton);

        rerender({ active: false });
        expect(document.activeElement).toBe(trigger);
    });

    it('restores focus via callback restoreTarget when active becomes false', () => {
        const trigger = document.createElement('button');
        trigger.id = 'callback-restore';
        trigger.textContent = 'Trigger';
        document.body.appendChild(trigger);
        trigger.focus();

        const container = document.createElement('div');
        const modalButton = document.createElement('button');
        modalButton.textContent = 'Modal';
        container.appendChild(modalButton);
        document.body.appendChild(container);

        const containerRef = { current: container };
        const { rerender } = renderHook(
            ({ active }) =>
                useModalA11y({
                    active,
                    onEscape: vi.fn(),
                    restoreTarget: () => document.getElementById('callback-restore'),
                    containerRef,
                }),
            { initialProps: { active: true } }
        );

        expect(document.activeElement).toBe(modalButton);

        rerender({ active: false });
        expect(document.activeElement).toBe(trigger);
    });

    it('restores focus on unmount while still active (animated exit path)', () => {
        const trigger = document.createElement('button');
        trigger.className = 'unmount-restore';
        trigger.textContent = 'Trigger';
        document.body.appendChild(trigger);

        const container = document.createElement('div');
        const modalButton = document.createElement('button');
        modalButton.textContent = 'Modal';
        container.appendChild(modalButton);
        document.body.appendChild(container);

        const containerRef = { current: container };
        const { unmount } = renderHook(() =>
            useModalA11y({
                active: true,
                onEscape: vi.fn(),
                restoreTarget: '.unmount-restore',
                containerRef,
            })
        );

        expect(document.activeElement).toBe(modalButton);

        unmount();
        expect(document.activeElement).toBe(trigger);
        expect(container.hasAttribute('data-modal-open')).toBe(false);
    });
});
