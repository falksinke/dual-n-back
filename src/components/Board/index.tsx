import { useGameStore } from '../../store/gameStore';
import { GameResult } from '../../model/GameResult';
import { ResultPanel } from '../ResultPanel';
import SessionPrimaryButton from '../SessionPrimaryButton';
import './Board.scss';
import BoardSquare from './BoardSquare';

const Board = () => {
    const game = useGameStore((state) => state.game);
    const countdown = useGameStore((state) => state.countdown);
    const lastResult = useGameStore((state) => state.results.last);
    const displayTarget = useGameStore((state) => state.settings.displayTarget);
    const pendingContinue = useGameStore((state) => state.adaptiveSession?.pendingContinue === true);

    const showBoard = game !== null || lastResult === null;
    const showStart = game === null && countdown === null && !pendingContinue && lastResult === null;

    return (
        <div className="board-container">
            {showBoard ? (
                <div className="board" aria-label="Dual n-back board">
                    <div className="row">
                        <BoardSquare index={0} />
                        <BoardSquare index={1} />
                        <BoardSquare index={2} />
                    </div>
                    <div className="row">
                        <BoardSquare index={3} />
                        <BoardSquare index={4} />
                        <BoardSquare index={5} />
                    </div>
                    <div className="row">
                        <BoardSquare index={6} />
                        <BoardSquare index={7} />
                        <BoardSquare index={8} />
                    </div>
                    {displayTarget && <div className="center" aria-hidden="true" />}
                </div>
            ) : (
                <ResultPanel result={lastResult as GameResult} />
            )}
            {showStart && (
                <div className="start-prompt">
                    <SessionPrimaryButton label="Start" />
                </div>
            )}
        </div>
    );
};

export default Board;
