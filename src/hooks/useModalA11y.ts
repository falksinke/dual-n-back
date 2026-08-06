import { useEffect, useRef, type RefObject } from 'react';

export type ModalRestoreTarget = HTMLElement | string | (() => HTMLElement | null);

export interface UseModalA11yOptions {
    active: boolean;
    onEscape: () => void;
    restoreTarget?: ModalRestoreTarget;
    initialFocusRef?: RefObject<HTMLElement | null>;
    /** When true (default), Tab cycles within the container. Initial focus still runs when active. */
    enableTrap?: boolean;
    containerRef: RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function resolveRestoreTarget(target: ModalRestoreTarget): HTMLElement | null {
    if (typeof target === 'string') {
        return document.querySelector<HTMLElement>(target);
    }
    if (typeof target === 'function') {
        return target();
    }
    return target;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export const useModalA11y = ({
    active,
    onEscape,
    restoreTarget,
    initialFocusRef,
    enableTrap = true,
    containerRef,
}: UseModalA11yOptions): void => {
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const prevActiveRef = useRef(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        if (active) {
            container.setAttribute('data-modal-open', '');
        } else {
            container.removeAttribute('data-modal-open');
        }

        return () => {
            container.removeAttribute('data-modal-open');
        };
    }, [active, containerRef]);

    useEffect(() => {
        if (!active) {
            return;
        }

        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.key !== 'Escape') {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            onEscape();
        };

        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [active, onEscape]);

    useEffect(() => {
        if (!active || !enableTrap) {
            return;
        }

        const container = containerRef.current;
        if (!container) {
            return;
        }

        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.key !== 'Tab') {
                return;
            }

            const focusable = getFocusableElements(container);
            if (focusable.length < 2) {
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
                return;
            }

            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        container.addEventListener('keydown', onKeyDown);
        return () => container.removeEventListener('keydown', onKeyDown);
    }, [active, enableTrap, containerRef]);

    useEffect(() => {
        const container = containerRef.current;
        const wasActive = prevActiveRef.current;

        if (active && !wasActive) {
            previousFocusRef.current =
                document.activeElement instanceof HTMLElement ? document.activeElement : null;

            if (initialFocusRef?.current) {
                initialFocusRef.current.focus();
            } else if (container) {
                getFocusableElements(container)[0]?.focus();
            }
        }

        if (!active && wasActive) {
            const explicitTarget = restoreTarget ? resolveRestoreTarget(restoreTarget) : null;
            const fallbackTarget = previousFocusRef.current;
            const target =
                explicitTarget && document.contains(explicitTarget)
                    ? explicitTarget
                    : fallbackTarget && document.contains(fallbackTarget)
                      ? fallbackTarget
                      : null;

            target?.focus();
        }

        prevActiveRef.current = active;
    }, [active, restoreTarget, initialFocusRef, containerRef]);
};
