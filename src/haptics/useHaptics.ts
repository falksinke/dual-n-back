import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { augmentHapticTargets } from './hapticTargets';
import { installHapticCaptureBridge, installIosHapticClickBridge } from './haptics';

export interface UseHapticsOptions {
    rootRef: RefObject<HTMLElement | null>;
    enabled: boolean;
    /** Bump when the interactive DOM set changes (settings, modalities, session). */
    uiRevision: string | number;
}

/**
 * React re-renders wipe injected iOS switch overlays.
 * Re-apply after each commit and whenever the subtree mutates.
 */
export function useHaptics({ rootRef, enabled, uiRevision }: UseHapticsOptions): void {
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    useEffect(() => {
        const isLive = () => enabledRef.current;
        const uninstallCapture = installHapticCaptureBridge(isLive);
        const uninstallIos = installIosHapticClickBridge(isLive);
        return () => {
            uninstallCapture();
            uninstallIos();
        };
    }, []);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const apply = (): void => {
            augmentHapticTargets(root, { enabled });
        };

        apply();

        let frame = 0;
        const schedule = (): void => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                apply();
            });
        };

        const observer = new MutationObserver(schedule);
        observer.observe(root, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            if (frame) cancelAnimationFrame(frame);
        };
    }, [rootRef, enabled, uiRevision]);
}
