import { useGameStore } from '../../store/gameStore';
import { getColorHex } from '../../model/colorSet';
import { getImageSrc } from '../../model/imageSet';

interface BoardSquareProps {
    index: number;
}

const BoardSquare = ({ index }: BoardSquareProps) => {
    const highlighted = useGameStore((state) => state.boardState.positionIndex === index);
    const teachRevealIndex = useGameStore((state) => state.teachRevealPositionIndex);
    const stimulusEpoch = useGameStore((state) => state.boardState.stimulusEpoch);
    const colorId = useGameStore((state) => state.boardState.colorId);
    const imageId = useGameStore((state) => state.boardState.imageId);
    const activeModalities = useGameStore((state) => state.activeModalities);
    const nForTrial = useGameStore((state) => state.boardState.nForTrial);
    const level = useGameStore((state) => state.settings.level);
    const variableN = useGameStore((state) => state.settings.variableN);
    const displayVariableNCenter = useGameStore(
        (state) => state.settings.displayVariableNCenter
    );
    const showPositionRecency = useGameStore((state) => state.settings.showPositionRecency);
    const mode = useGameStore((state) => state.settings.mode);
    const singleModality = useGameStore((state) => state.settings.singleModality);
    const positionRecency = useGameStore(
        (state) => state.boardState.positionRecency[index] ?? null
    );
    const allowCenterStimulus = useGameStore((state) => state.settings.allowCenterStimulus);
    const inSession = useGameStore(
        (state) => state.game !== null || state.countdown !== null
    );

    const showColor = highlighted && activeModalities.includes('color') && colorId !== null;
    const showImage = highlighted && activeModalities.includes('image') && imageId !== null;
    const centerN =
        index === 4 &&
        displayVariableNCenter &&
        !allowCenterStimulus &&
        variableN &&
        inSession
            ? nForTrial > 0
                ? nForTrial
                : level
            : null;

    const fillColor = showColor ? getColorHex(colorId) : undefined;
    const recencyLabel =
        showPositionRecency &&
        mode === 'single' &&
        singleModality === 'position' &&
        inSession
            ? positionRecency
            : null;

    return (
        <div
            className={[
                `square square-${index}`,
                highlighted ? 'highlighted' : '',
                teachRevealIndex === index && !highlighted ? 'is-teach-reveal' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {centerN != null && (
                <span
                    key={centerN}
                    className="center-n"
                    aria-live="polite"
                    aria-atomic="true"
                    aria-label={`${centerN}-back`}
                >
                    {centerN}
                </span>
            )}
            {recencyLabel != null && (
                <span className="position-recency" aria-label={`${recencyLabel}-back`}>
                    {recencyLabel}
                </span>
            )}
            <div
                key={highlighted ? `on-${stimulusEpoch}` : 'off'}
                className="inner-square"
                style={{
                    backgroundColor: fillColor ?? undefined,
                }}
            >
                {showImage && (
                    <img
                        className="stimulus-image"
                        src={getImageSrc(imageId)}
                        alt=""
                        aria-hidden="true"
                    />
                )}
            </div>
        </div>
    );
};

export default BoardSquare;
