import { useGameStore } from '../../store/gameStore';
import { getColorHex } from '../../model/colorSet';
import { getImageSrc } from '../../model/imageSet';

interface BoardSquareProps {
    index: number;
}

const BoardSquare = ({ index }: BoardSquareProps) => {
    const highlighted = useGameStore((state) => state.boardState.positionIndex === index);
    const stimulusEpoch = useGameStore((state) => state.boardState.stimulusEpoch);
    const colorId = useGameStore((state) => state.boardState.colorId);
    const imageId = useGameStore((state) => state.boardState.imageId);
    const activeModalities = useGameStore((state) => state.activeModalities);

    const showColor = highlighted && activeModalities.includes('color') && colorId !== null;
    const showImage = highlighted && activeModalities.includes('image') && imageId !== null;

    const fillColor = showColor ? getColorHex(colorId) : undefined;

    return (
        <div className={`square square-${index}${highlighted ? ' highlighted' : ''}`}>
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
