import { hasSwitchInputSupport, isIOS, markIosSwitchGesture } from './haptics';

export const IOS_HAPTIC_SWITCH_CLASS = 'ios-haptic-switch';
export const HAPTIC_HOST_CLASS = 'haptic-host';

/**
 * Mount the iOS switch as a *sibling overlay* on `.haptic-host`, never inside
 * `<button>` (invalid HTML — WebKit often only wires the first nested control).
 */
export function mountIosHapticSwitch(button: HTMLButtonElement, active: boolean): void {
    const host = button.closest<HTMLElement>(`.${HAPTIC_HOST_CLASS}`);

    // Clear illegal nested switches from earlier builds.
    button.querySelectorAll(`.${IOS_HAPTIC_SWITCH_CLASS}`).forEach((node) => node.remove());

    if (!host) {
        return;
    }

    if (!active || !isIOS() || !hasSwitchInputSupport()) {
        host.querySelectorAll(`.${IOS_HAPTIC_SWITCH_CLASS}`).forEach((node) => node.remove());
        return;
    }

    if (host.querySelector(`.${IOS_HAPTIC_SWITCH_CLASS}`)) return;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = IOS_HAPTIC_SWITCH_CLASS;
    input.setAttribute('aria-hidden', 'true');
    input.tabIndex = -1;
    input.setAttribute('switch', '');
    input.addEventListener('change', () => {
        input.checked = false;
        markIosSwitchGesture(button);
        // Switch sits above the button for Taptic; forward the gesture.
        if (!button.disabled) {
            button.click();
        }
    });
    host.append(input);
}
