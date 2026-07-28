import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    fireKind,
    hapticsSupported,
    installHapticCaptureBridge,
    isIOS,
    playHaptic,
} from './haptics';
import { augmentHapticTargets } from './hapticTargets';

vi.mock('browser-haptic', () => ({
    default: {
        isSupported: vi.fn(() => true),
        success: vi.fn(),
        warning: vi.fn(),
        light: vi.fn(),
    },
}));

describe('haptics', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
        Object.defineProperty(global, 'navigator', {
            value: originalNavigator,
            configurable: true,
        });
        vi.restoreAllMocks();
        document.body.replaceChildren();
    });

    it('reports supported when vibrate is available', () => {
        Object.defineProperty(global, 'navigator', {
            value: { vibrate: vi.fn(() => true), userAgent: 'Android', platform: 'Linux' },
            configurable: true,
        });
        expect(hapticsSupported()).toBe(true);
    });

    it('detects iOS user agents', () => {
        Object.defineProperty(global, 'navigator', {
            value: {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
                platform: 'iPhone',
                maxTouchPoints: 5,
            },
            configurable: true,
        });
        expect(isIOS()).toBe(true);
    });
});

describe('playHaptic / fireKind gating', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(global, 'navigator', {
            value: {
                vibrate: vi.fn(() => true),
                userAgent: 'Android',
                platform: 'Linux',
                maxTouchPoints: 1,
            },
            configurable: true,
        });
    });

    it('playHaptic no-ops when disabled', async () => {
        const Haptic = (await import('browser-haptic')).default;
        playHaptic('success', false);
        expect(Haptic.success).not.toHaveBeenCalled();
        expect(navigator.vibrate).not.toHaveBeenCalled();
    });

    it('playHaptic fires success when enabled on Android', async () => {
        const Haptic = (await import('browser-haptic')).default;
        playHaptic('success', true);
        expect(Haptic.success).toHaveBeenCalled();
    });

    it('playHaptic is a no-op on iOS (programmatic cues unsupported)', async () => {
        Object.defineProperty(global, 'navigator', {
            value: {
                vibrate: vi.fn(() => true),
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X)',
                platform: 'iPhone',
                maxTouchPoints: 5,
            },
            configurable: true,
        });
        const Haptic = (await import('browser-haptic')).default;
        playHaptic('success', true);
        expect(Haptic.success).not.toHaveBeenCalled();
        expect(navigator.vibrate).not.toHaveBeenCalled();
    });

    it('fireKind uses browser-haptic light on Android', async () => {
        const Haptic = (await import('browser-haptic')).default;
        expect(fireKind('light')).toBe(true);
        expect(Haptic.light).toHaveBeenCalled();
    });
});

describe('installHapticCaptureBridge', () => {
    beforeEach(() => {
        Object.defineProperty(global, 'navigator', {
            value: {
                vibrate: vi.fn(() => true),
                userAgent: 'Android',
                platform: 'Linux',
                maxTouchPoints: 1,
            },
            configurable: true,
        });
    });

    afterEach(() => {
        document.body.replaceChildren();
    });

    it('respects the enabled gate', async () => {
        const Haptic = (await import('browser-haptic')).default;
        vi.mocked(Haptic.light).mockClear();
        const uninstall = installHapticCaptureBridge(() => false);
        const button = document.createElement('button');
        button.setAttribute('data-haptic', 'light');
        document.body.append(button);
        button.click();
        expect(Haptic.light).not.toHaveBeenCalled();
        uninstall();
    });
});

describe('augmentHapticTargets', () => {
    it('clears tags when disabled', () => {
        const root = document.createElement('div');
        const button = document.createElement('button');
        button.setAttribute('data-haptic', 'light');
        button.classList.add('haptic-target');
        button.setAttribute('data-haptic-augmented', 'true');
        root.append(button);
        document.body.append(root);

        augmentHapticTargets(root, { enabled: false });
        expect(button.hasAttribute('data-haptic')).toBe(false);
        expect(button.classList.contains('haptic-target')).toBe(false);
    });

    it('tags reachable buttons when enabled', () => {
        const root = document.createElement('div');
        root.id = 'root';
        const button = document.createElement('button');
        button.textContent = 'Start';
        root.append(button);
        document.body.append(root);

        augmentHapticTargets(root, { enabled: true });
        expect(button.getAttribute('data-haptic')).toBe('light');
        expect(button.classList.contains('haptic-target')).toBe(true);
    });
});
