import { useGameStore } from '../../store/gameStore';
import { GameResult } from '../../model/GameResult';
import { ResultPanel } from '../ResultPanel';
import './Board.scss';
import BoardSquare from './BoardSquare';

const Board = () => {
    const game = useGameStore((state) => state.game);
    const lastResult = useGameStore((state) => state.results.last);
    const displayTarget = useGameStore((state) => state.settings.displayTarget);
    const pendingContinue = useGameStore((state) => state.adaptiveSession?.pendingContinue === true);

    const showBoard = game !== null || lastResult === null;

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
            {game === null && !pendingContinue && (
                <p className="start-prompt keybindings-notice">
                    <span className="keybinding-line">
                        Press <kbd className="key-space">Space</kbd> to start
                    </span>
                </p>
            )}
        </div>
    );
};

export default Board;
