import { mountIosHapticSwitch } from './hapticOverlay';
import {
    hasSwitchInputSupport,
    inferHapticKind,
    isButtonHapticReachable,
    isIOS,
    type HapticKind,
} from './haptics';

const AUGMENTED_ATTR = 'data-haptic-augmented';

export type HapticTargetOptions = {
    enabled: boolean;
};

function clearHapticTarget(button: HTMLButtonElement): void {
    button.removeAttribute('data-haptic');
    button.classList.remove('haptic-target');
    button.removeAttribute(AUGMENTED_ATTR);
    button.querySelectorAll('.ios-haptic-switch').forEach((node) => node.remove());
}

function hapticKindForButton(button: HTMLButtonElement): HapticKind {
    return inferHapticKind(button);
}

export function augmentHapticTargets(root: HTMLElement, options: HapticTargetOptions): void {
    const buttons = root.querySelectorAll<HTMLButtonElement>('button:not([data-haptic-skip])');

    if (!options.enabled) {
        buttons.forEach((button) => {
            if (button.hasAttribute(AUGMENTED_ATTR)) clearHapticTarget(button);
        });
        return;
    }

    const overlayActive = isIOS() && hasSwitchInputSupport();

    buttons.forEach((button) => {
        if (button.disabled || !isButtonHapticReachable(button, root)) {
            if (button.hasAttribute(AUGMENTED_ATTR)) clearHapticTarget(button);
            return;
        }

        button.setAttribute('data-haptic', hapticKindForButton(button));
        button.classList.add('haptic-target');
        button.setAttribute(AUGMENTED_ATTR, 'true');
        mountIosHapticSwitch(button, overlayActive);
    });
}
