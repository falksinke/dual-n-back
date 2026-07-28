import { useGameStore } from '../../store/gameStore';
import { ModalityId, DEFAULT_KEYS, MODALITY_LABELS } from '../../model/modalities';

interface ActionButtonProps {
    modality: ModalityId;
}

const ActionButton = ({ modality }: ActionButtonProps) => {
    const stateClass = useGameStore((state) => state.btns[modality] ?? 'None');
    const selectModality = useGameStore((state) => state.selectModality);
    const inSession = useGameStore((state) => state.game !== null);

    return (
        <div className="match-claim-wrap haptic-host">
            <button
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
        </div>
    );
};

export default ActionButton;
