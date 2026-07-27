import { useGameStore } from '../../store/gameStore';
import { ModalityId, DEFAULT_KEYS, MODALITY_LABELS } from '../../model/modalities';

interface ActionButtonProps {
    modality: ModalityId;
}

const ActionButton = ({ modality }: ActionButtonProps) => {
    const stateClass = useGameStore((state) => state.btns[modality] ?? 'None');

    return (
        <div className="keybindings-notice">
            <div className={`keybinding-line user-match-notice ${stateClass}`}>
                <strong>{DEFAULT_KEYS[modality].toUpperCase()}</strong> — match{' '}
                {MODALITY_LABELS[modality].toLowerCase()}
            </div>
        </div>
    );
};

export default ActionButton;
