import { hasSwitchInputSupport, isIOS, markIosSwitchGesture } from './haptics';

export const IOS_HAPTIC_SWITCH_CLASS = 'ios-haptic-switch';

export function mountIosHapticSwitch(container: HTMLElement, active: boolean): void {
    if (!active || !isIOS() || !hasSwitchInputSupport()) {
        container.querySelectorAll(`.${IOS_HAPTIC_SWITCH_CLASS}`).forEach((node) => node.remove());
        return;
    }
    if (container.querySelector(`.${IOS_HAPTIC_SWITCH_CLASS}`)) return;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = IOS_HAPTIC_SWITCH_CLASS;
    input.setAttribute('aria-hidden', 'true');
    input.tabIndex = -1;
    input.setAttribute('switch', '');
  input.addEventListener('change', () => {
    input.checked = false;
    markIosSwitchGesture(container);
    // The switch sits on top for Taptic; forward the same gesture to the host control.
    if (container instanceof HTMLButtonElement && !container.disabled) {
      container.click();
    }
  });
  container.append(input);
}
