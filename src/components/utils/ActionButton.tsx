import { useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ModalityId, DEFAULT_KEYS, MODALITY_LABELS } from '../../model/modalities';
import { useHapticsEnabled } from '../../haptics/HapticsEnabledContext';
import {
    hasSwitchInputSupport,
    isIOS,
    markIosSwitchGesture,
} from '../../haptics/haptics';

interface ActionButtonProps {
    modality: ModalityId;
}

const ActionButton = ({ modality }: ActionButtonProps) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const stateClass = useGameStore((state) => state.btns[modality] ?? 'None');
    const selectModality = useGameStore((state) => state.selectModality);
    const inSession = useGameStore((state) => state.game !== null);
    const hapticsEnabled = useHapticsEnabled();
    const useIosSwitch =
        hapticsEnabled && inSession && isIOS() && hasSwitchInputSupport();

    return (
        <div className="match-claim-wrap haptic-host">
            <button
                ref={buttonRef}
                type="button"
                className={`match-claim-btn user-match-notice ${stateClass}`}
                aria-label={`Match ${MODALITY_LABELS[modality].toLowerCase()}`}
                disabled={!inSession}
                data-haptic="light"
                onClick={() => selectModality(modality)}
            >
                <kbd className="match-claim-key">{DEFAULT_KEYS[modality].toUpperCase()}</kbd>
                <span className="match-claim-label">{MODALITY_LABELS[modality]}</span>
            </button>
            {useIosSwitch && (
                <input
                    type="checkbox"
                    className="ios-haptic-switch"
                    aria-hidden="true"
                    tabIndex={-1}
                    ref={(node) => {
                        if (node) node.setAttribute('switch', '');
                    }}
                    onChange={(event) => {
                        event.currentTarget.checked = false;
                        const button = buttonRef.current;
                        if (button) markIosSwitchGesture(button);
                        if (inSession) selectModality(modality);
                    }}
                />
            )}
        </div>
    );
};

export default ActionButton;
