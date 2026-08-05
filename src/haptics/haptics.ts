import Haptic from 'browser-haptic';

export type HapticKind = 'selection' | 'light' | 'success' | 'warning';
export type HapticCue = HapticKind;

const captureBridgeDebounceMs = 400;
const iosSwitchGestureMs = 150;
const iosSwitchGestureUntil = new WeakMap<Element, number>();

export function isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    const msStreamBlocked = typeof window !== 'undefined' && 'MSStream' in window;
    return (
        (/iPad|iPhone|iPod/.test(navigator.userAgent) && !msStreamBlocked) ||
        (navigator.maxTouchPoints > 1 && /MacIntel/.test(navigator.platform))
    );
}

export function hasSwitchInputSupport(): boolean {
    if (typeof document === 'undefined' || typeof HTMLInputElement === 'undefined') return false;
    return 'switch' in HTMLInputElement.prototype;
}

function hasVibrationAPI(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function hapticsSupported(): boolean {
    return hasVibrationAPI() || (isIOS() && hasSwitchInputSupport());
}

/** Only augment / fire haptics on buttons the user can actually reach. */
export function isButtonHapticReachable(button: HTMLButtonElement, root: HTMLElement): boolean {
    if (button.closest('[aria-hidden="true"]')) return false;

    const dialog = button.closest<HTMLElement>('[role="dialog"]');
    if (dialog) {
        return root.contains(dialog);
    }

    return root.contains(button);
}

export function inferHapticKind(element: Element): HapticKind {
    if (element.getAttribute('data-action') === 'toggle-haptics') return 'selection';
    const label = (
        element.getAttribute('aria-label') ??
        element.getAttribute('title') ??
        ''
    ).toLowerCase();
    if (label.includes('reset') || label.includes('clear')) return 'warning';
    return 'light';
}

/**
 * iOS 18.4+ only fires switch Taptic under an active user gesture.
 * Must stay synchronous (no setTimeout).
 */
export function fireIosSwitchHapticSync(): boolean {
    if (!isIOS() || !hasSwitchInputSupport() || typeof document === 'undefined') return false;
    try {
        const label = document.createElement('label');
        label.setAttribute('aria-hidden', 'true');
        label.style.cssText =
            'position:fixed;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;opacity:0.01;';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.setAttribute('switch', '');
        label.appendChild(input);
        document.body.appendChild(label);
        label.click();
        label.remove();
        return true;
    } catch {
        return false;
    }
}

export function fireKind(kind: HapticKind): boolean {
    if (isIOS()) {
        return fireIosSwitchHapticSync();
    }
    if (kind === 'success') {
        if (Haptic.isSupported()) {
            Haptic.success();
            return true;
        }
        if (hasVibrationAPI()) return navigator.vibrate([18, 28, 18]);
        return false;
    }
    if (kind === 'warning') {
        if (Haptic.isSupported()) {
            Haptic.warning();
            return true;
        }
        if (hasVibrationAPI()) return navigator.vibrate([36, 24, 42]);
        return false;
    }
    if (Haptic.isSupported()) {
        Haptic.light();
        return true;
    }
    if (!hasVibrationAPI()) return false;
    // Short pulse — overlapping multi-target presses should each register.
    return navigator.vibrate(12);
}

/**
 * True when this control's host already owns an iOS switch overlay.
 * Capture-bridge sync helpers must not steal dual-finger gestures from those overlays.
 */
export function hostOwnsIosHapticSwitch(element: Element): boolean {
    const host = element.closest('.haptic-host');
    return Boolean(host?.querySelector('.ios-haptic-switch'));
}

export function markIosSwitchGesture(element: Element): void {
    iosSwitchGestureUntil.set(element, Date.now() + iosSwitchGestureMs);
}

export function iosSwitchGestureRecentlyFired(element: Element): boolean {
    return Date.now() < (iosSwitchGestureUntil.get(element) ?? 0);
}

/** Fallback when an overlay switch exists but the tap hit button content instead. */
export function fireIosSwitchHaptic(target: Element | null): void {
    if (!target || !isIOS() || !hasSwitchInputSupport()) return;
    if (iosSwitchGestureRecentlyFired(target)) return;
    if (fireIosSwitchHapticSync()) {
        markIosSwitchGesture(target);
        return;
    }
    const input = target.querySelector('input.ios-haptic-switch') as HTMLInputElement | null;
    if (!input) return;
    input.checked = false;
    input.click();
    markIosSwitchGesture(target);
}

export function installHapticCaptureBridge(isEnabled: () => boolean = () => true): () => void {
    if (typeof document === 'undefined') return () => {};

    const lastFire = new WeakMap<Element, number>();

    const handle = (event: Event) => {
        if (!isEnabled()) return;
        const eventTarget = event.target as Element | null;
        if (!eventTarget) return;
        // iOS host overlays own Taptic via the real switch gesture.
        if (eventTarget.closest('.ios-haptic-switch')) return;

        const target = eventTarget.closest('[data-haptic]');
        if (!target) return;
        if ((target as HTMLButtonElement).disabled) return;
        // Dual-finger: leave Taptic to each host's native switch; sync helper
        // would serialize and drop the second press.
        if (isIOS() && hostOwnsIosHapticSwitch(target)) return;

        const kind = target.getAttribute('data-haptic') as HapticKind | null;
        if (!kind) return;

        const now = Date.now();
        const previous = lastFire.get(target) ?? 0;
        if (now - previous < captureBridgeDebounceMs) return;
        lastFire.set(target, now);

        // Prefer pointerdown so the temporary iOS switch still runs under the gesture.
        if (isIOS()) {
            fireIosSwitchHapticSync();
            return;
        }
        fireKind(kind);
    };

    document.addEventListener('pointerdown', handle, { capture: true, passive: true });
    document.addEventListener('click', handle, { capture: true, passive: true });
    return () => {
        document.removeEventListener('pointerdown', handle, { capture: true });
        document.removeEventListener('click', handle, { capture: true });
    };
}

/** iOS — fire Taptic when the overlay did not receive the tap. */
export function installIosHapticClickBridge(isEnabled: () => boolean = () => true): () => void {
    if (typeof document === 'undefined' || !isIOS() || !hasSwitchInputSupport()) {
        return () => {};
    }

    const lastFire = new WeakMap<Element, number>();

    const handlePointerUp = (event: Event) => {
        if (!isEnabled()) return;
        const target = event.target as Element | null;
        if (!target || target.closest('.ios-haptic-switch')) return;
        const button = target.closest('.haptic-target');
        if (!button) return;
        const appRoot = document.getElementById('root');
        const hapticButton = button as HTMLButtonElement;
        if (!appRoot || !isButtonHapticReachable(hapticButton, appRoot)) return;
        if (iosSwitchGestureRecentlyFired(button)) return;

        const now = Date.now();
        const previous = lastFire.get(button) ?? 0;
        if (now - previous < captureBridgeDebounceMs) return;
        lastFire.set(button, now);
        fireIosSwitchHaptic(button);
    };

    document.addEventListener('pointerup', handlePointerUp, { capture: true, passive: true });
    return () => document.removeEventListener('pointerup', handlePointerUp, { capture: true });
}

/** Programmatic cues: Android only; iOS no-op outside a trusted switch gesture. */
export function playHaptic(cue: HapticCue, enabled: boolean): void {
    if (!hapticsSupported()) return;
    if (!enabled || (typeof document !== 'undefined' && document.hidden)) return;
    if (isIOS()) return;

    // Allow rapid multi-modality cues (e.g. dual claim) — no global coalesce.
    fireKind(cue);
}
