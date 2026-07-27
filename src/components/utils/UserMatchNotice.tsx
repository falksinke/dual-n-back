import ActionButton from './ActionButton';
import { useGameStore } from '../../store/gameStore';
import './UserMatchNotice.scss';

const UserMatchNotice = () => {
    const activeModalities = useGameStore((state) => state.activeModalities);

    return (
        <div className="match-notice">
            {activeModalities.map((modality) => (
                <ActionButton key={modality} modality={modality} />
            ))}
        </div>
    );
};

export default UserMatchNotice;
