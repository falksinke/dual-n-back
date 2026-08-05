import { useGameStore } from '../../store/gameStore';
import { GameResult } from '../../model/GameResult';
import { settingsFromCurriculum } from '../../model/adaptiveCurriculum';
import { ResultPanel } from '../ResultPanel';
import SessionPrimaryButton from '../SessionPrimaryButton';
import SlotPointerHud from '../SlotPointerHud';
import './Board.scss';
import BoardSquare from './BoardSquare';

const Board = () => {
    const game = useGameStore((state) => state.game);
    const countdown = useGameStore((state) => state.countdown);
    const lastResult = useGameStore((state) => state.results.last);
    const displayTarget = useGameStore((state) => state.settings.displayTarget);
    const positionGrid = useGameStore((state) => state.settings.positionGrid);
    const displayVariableNCenter = useGameStore(
        (state) => state.settings.displayVariableNCenter
    );
    const pendingContinue = useGameStore((state) => state.adaptiveSession?.pendingContinue === true);
    const playMode = useGameStore((state) => state.settings.playMode);
    const mode = useGameStore((state) => state.settings.mode);
    const level = useGameStore((state) => state.settings.level);
    const configuredTrials = useGameStore((state) => state.settings.trials);
    const currentTrials = useGameStore((state) => state.boardState.currentTrials);
    const stimulusEpoch = useGameStore((state) => state.boardState.stimulusEpoch);
    const currentPositionIndex = useGameStore((state) => state.boardState.positionIndex);
    const currentLetter = useGameStore((state) => state.boardState.audioToken);
    const cyclicLadder = useGameStore((state) => state.cyclicLadder[mode]);
    const teachIntroDismissed = useGameStore((state) => state.teachIntroDismissed);
    const teachOptOutWarnShown = useGameStore((state) => state.teachOptOutWarnShown);
    const teachOpStep = useGameStore((state) => state.teachOpStep);
    const teachRevealPositionIndex = useGameStore((state) => state.teachRevealPositionIndex);
    const teachRevealLetter = useGameStore((state) => state.teachRevealLetter);
    const requestTeachOptOut = useGameStore((state) => state.requestTeachOptOut);
    const advanceTeachOp = useGameStore((state) => state.advanceTeachOp);
    const retreatTeachOp = useGameStore((state) => state.retreatTeachOp);

    const showBoard = game !== null || lastResult === null;
    const showStart = game === null && countdown === null && !pendingContinue && lastResult === null;
    const inSession = game !== null;
    const countingDown = countdown !== null;
    const isCyclic = playMode === 'cyclic';
    // 2×2 is free-play only; ladder paths always show the standard 3×3.
    const effectiveGrid = playMode === 'free' ? positionGrid : '3x3';
    const isTwoByTwo = effectiveGrid === '2x2';
    // Crosshair sits on the middle of a 3×3 — hide when Variable N owns that cell.
    const showCenterCross = !isTwoByTwo && displayTarget && !displayVariableNCenter;
    const curriculumSettings = settingsFromCurriculum(cyclicLadder);
    const inTeachDecide = isCyclic && cyclicLadder.stage === 'teach_decide' && inSession;
    const showTeachOptOut =
        isCyclic &&
        inSession &&
        (inTeachDecide ||
            (cyclicLadder.stage === 'teach_walkthrough' && teachIntroDismissed));
    const showSlotPointer =
        isCyclic &&
        (inSession || countingDown) &&
        curriculumSettings.pointerMode !== 'off';
    const showTeachChrome = showSlotPointer || showTeachOptOut;
    // boardState.currentTrials is remaining; pointer needs 0-based onset index.
    const pointerTrialIndex =
        currentTrials >= 0 ? Math.max(0, configuredTrials - currentTrials) : 0;

    return (
        <div className="board-container">
            {showTeachChrome && (
                <div
                    className={`teach-top-chrome${curriculumSettings.teachPacedOps ? ' is-paced' : ''}`}
                >
                    {showSlotPointer ? (
                        <SlotPointerHud
                            n={level}
                            trialIndex={pointerTrialIndex}
                            pointerMode={curriculumSettings.pointerMode}
                            stimulusEpoch={stimulusEpoch}
                            paced={curriculumSettings.teachPacedOps}
                            opStep={teachOpStep}
                            onAdvanceOp={advanceTeachOp}
                            onRetreatOp={retreatTeachOp}
                            revealPositionIndex={teachRevealPositionIndex}
                            revealLetter={teachRevealLetter}
                            currentPositionIndex={
                                currentPositionIndex >= 0 ? currentPositionIndex : null
                            }
                            currentLetter={currentLetter}
                            trailingAction={
                                showTeachOptOut && !teachOptOutWarnShown ? (
                                    <button
                                        type="button"
                                        className="teach-opt-out__btn"
                                        onClick={requestTeachOptOut}
                                    >
                                        I&apos;ve got it
                                    </button>
                                ) : null
                            }
                        />
                    ) : (
                        showTeachOptOut &&
                        !teachOptOutWarnShown && (
                            <button
                                type="button"
                                className="teach-opt-out__btn"
                                onClick={requestTeachOptOut}
                            >
                                I&apos;ve got it
                            </button>
                        )
                    )}
                </div>
            )}
            {showBoard ? (
                <div
                    className={`board${isTwoByTwo ? ' board--2x2' : ''}`}
                    aria-label={isTwoByTwo ? 'Four-square n-back board' : 'Dual n-back board'}
                >
                    {isTwoByTwo ? (
                        <>
                            <div className="row">
                                <BoardSquare index={0} />
                                <BoardSquare index={1} />
                            </div>
                            <div className="row">
                                <BoardSquare index={2} />
                                <BoardSquare index={3} />
                            </div>
                        </>
                    ) : (
                        <>
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
                        </>
                    )}
                    {showCenterCross && <div className="center" aria-hidden="true" />}
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
