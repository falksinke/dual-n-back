import { useRef, useState } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import './SpatialPractice.scss';
import { PracticeSounds } from './sounds';
import { CELL_COUNT, createSequence } from './sequence';
import MathChallenge from './MathChallenge';
import PracticeSettings from './PracticeSettings';

interface SpatialPracticeProps {
    onExit: () => void;
}

type Phase = 'idle' | 'showing' | 'math' | 'recall' | 'success' | 'retry' | 'paused';

const INITIAL_ITEM_MS = 1000;
const MIN_ITEM_MS = 300;
const ACTIVE_PORTION = 0.7;
const SUCCESS_PAUSE_MS = 1000;

const SpatialPractice = ({ onExit }: SpatialPracticeProps) => {
    const [length, setLength] = useState(5);
    const [increaseSpeed, setIncreaseSpeed] = useState(true);
    const [interference, setInterference] = useState(0);
    const [mathEnabled, setMathEnabled] = useState(false);
    const historyRef = useRef<number[]>([]);
    const [newSequenceOnSuccess, setNewSequenceOnSuccess] = useState(true);
    const [pressedCell, setPressedCell] = useState<number | null>(null);
    const pressRef = useRef(0);
    const soundsRef = useRef<PracticeSounds | null>(null);
    const [phase, setPhase] = useState<Phase>('idle');
    const [sequence, setSequence] = useState<number[]>([]);
    const [activeCell, setActiveCell] = useState<number | null>(null);
    const [activeOrder, setActiveOrder] = useState<number | null>(null);
    const [recall, setRecall] = useState<number[]>([]);
    const [itemMs, setItemMs] = useState(INITIAL_ITEM_MS);
    const sequenceRef = useRef<number[]>([]);
    const itemMsRef = useRef(INITIAL_ITEM_MS);
    const phaseRef = useRef<Phase>('idle');
    const recallRef = useRef<number[]>([]);
    const timersRef = useRef<Set<number>>(new Set());
    const runRef = useRef(0);

    const updatePhase = (next: Phase): void => {
        phaseRef.current = next;
        setPhase(next);
    };

    const cancelScheduled = (): void => {
        runRef.current += 1;
        soundsRef.current?.stop();
        setPressedCell(null);
        timersRef.current.forEach((timer) => window.clearTimeout(timer));
        timersRef.current.clear();
        setActiveCell(null);
        setActiveOrder(null);
    };

    const schedule = (callback: () => void, delay: number, run: number): void => {
        const timer = window.setTimeout(() => {
            timersRef.current.delete(timer);
            if (runRef.current === run) callback();
        }, delay);
        timersRef.current.add(timer);
    };

    const playSequence = (nextSequence: number[], speed: number): void => {
        cancelScheduled();
        recallRef.current = [];
        setRecall([]);
        updatePhase('showing');
        const run = runRef.current;
        const showItem = (index: number): void => {
            if (index >= nextSequence.length) {
                updatePhase(mathEnabled ? 'math' : 'recall');
                return;
            }
            historyRef.current = [...historyRef.current, nextSequence[index]].slice(-2 * length);
            soundsRef.current?.play('item');
            setActiveCell(nextSequence[index]);
            setActiveOrder(index + 1);
            schedule(() => {
                setActiveCell(null);
                setActiveOrder(null);
                schedule(() => showItem(index + 1), speed * (1 - ACTIVE_PORTION), run);
            }, speed * ACTIVE_PORTION, run);
        };
        showItem(0);
    };

    const startNewSequence = (): void => {
        const nextSequence = createSequence(length, sequenceRef.current, historyRef.current, interference);
        sequenceRef.current = nextSequence;
        itemMsRef.current = INITIAL_ITEM_MS;
        setSequence(nextSequence);
        setItemMs(INITIAL_ITEM_MS);
        playSequence(nextSequence, INITIAL_ITEM_MS);
    };

    const replaySequence = (): void => {
        if (sequenceRef.current.length > 0) {
            setSequence(sequenceRef.current);
            playSequence(sequenceRef.current, itemMsRef.current);
        }
    };

    const stop = (): void => {
        cancelScheduled();
        sequenceRef.current = [];
        historyRef.current = [];
        itemMsRef.current = INITIAL_ITEM_MS;
        setSequence([]);
        recallRef.current = [];
        setRecall([]);
        setItemMs(INITIAL_ITEM_MS);
        updatePhase('idle');
    };

    const chooseCell = (cell: number): void => {
        if (phaseRef.current !== 'recall') return;
        soundsRef.current?.play('press');
        setPressedCell(cell);
        const press = ++pressRef.current;
        schedule(() => {
            if (pressRef.current === press) setPressedCell(null);
        }, 180, runRef.current);
        const nextRecall = [...recallRef.current, cell];
        recallRef.current = nextRecall;
        setRecall(nextRecall);
        const expected = sequenceRef.current[nextRecall.length - 1];
        if (cell !== expected) {
            soundsRef.current?.play('failure');
            updatePhase('retry');
            return;
        }
        if (nextRecall.length === sequenceRef.current.length) {
            const faster = increaseSpeed
                ? Math.max(MIN_ITEM_MS, Math.round(itemMsRef.current * 0.9)) : itemMsRef.current;
            itemMsRef.current = faster;
            setItemMs(faster);
            soundsRef.current?.play('success');
            updatePhase('success');
            const run = runRef.current;
            // Select the next pattern now so a background pause resumes the intended round.
            const next = newSequenceOnSuccess
                ? createSequence(length, sequenceRef.current, historyRef.current, interference) : sequenceRef.current;
            sequenceRef.current = next;
            schedule(() => {
                setSequence(next);
                playSequence(next, faster);
            }, SUCCESS_PAUSE_MS, run);
        }
    };

    const changeLength = (nextLength: number): void => {
        cancelScheduled();
        sequenceRef.current = [];
        historyRef.current = [];
        itemMsRef.current = INITIAL_ITEM_MS;
        setLength(nextLength);
        setSequence([]);
        recallRef.current = [];
        setRecall([]);
        setItemMs(INITIAL_ITEM_MS);
        updatePhase('idle');
    };

    const exit = (): void => {
        cancelScheduled();
        onExit();
    };

    useMountEffect(() => {
        soundsRef.current = new PracticeSounds();
        const handleVisibility = (): void => {
            if (document.hidden && (
                phaseRef.current === 'showing'
                || phaseRef.current === 'math'
                || phaseRef.current === 'recall'
                || phaseRef.current === 'success'
            )) {
                cancelScheduled();
                recallRef.current = [];
                setRecall([]);
                updatePhase('paused');
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            soundsRef.current?.dispose();
            soundsRef.current = null;
            runRef.current += 1;
            timersRef.current.forEach((timer) => window.clearTimeout(timer));
            timersRef.current.clear();
        };
    });

    const status = phase === 'idle'
        ? 'Choose a length, then start.'
        : phase === 'showing'
            ? 'Watch — remember the order.'
            : phase === 'math'
                ? 'Solve the math problem, then recall the sequence.'
            : phase === 'recall'
                ? `Your turn — item ${recall.length + 1} of ${length}.`
                : phase === 'success'
                    ? `Correct! ${newSequenceOnSuccess ? 'New sequence' : 'Same sequence'} next${!increaseSpeed ? ' at the same speed.' : itemMs === MIN_ITEM_MS ? ' at top speed.' : ', faster.'}`
                : phase === 'retry'
                    ? `Not quite — wrong square at step ${recall.length}. Replay to try again.`
                    : 'Practice paused while the tab was hidden. Replay to continue.';

    return (
        <section className={`spatial-practice is-${phase}`} aria-labelledby="spatial-practice-title">
            <header className="spatial-practice__header">
                <div>
                    <p className="spatial-practice__eyebrow">Beginner rehearsal</p>
                    <h1 id="spatial-practice-title">Spatial sequence practice</h1>
                </div>
                <button type="button" className="spatial-practice__back" onClick={exit}>Back to N-Back</button>
            </header>

            <PracticeSettings length={length} onLengthChange={changeLength}
                newSequence={newSequenceOnSuccess} onNewSequenceChange={setNewSequenceOnSuccess}
                increaseSpeed={increaseSpeed} onIncreaseSpeedChange={setIncreaseSpeed}
                interference={interference} onInterferenceChange={setInterference}
                mathEnabled={mathEnabled} onMathEnabledChange={setMathEnabled}
                disabled={phase !== 'idle'} />
            <p className="spatial-practice__instruction">
                Watch and listen, then tap every square in order, including repeated positions.
                A mistake lets you retry at the same speed.
            </p>

            <div className="spatial-practice__status" role="status" aria-live="polite">
                <strong><span className="spatial-practice__feedback-icon" aria-hidden="true">
                    {phase === 'success' ? '✓' : phase === 'retry' ? '×' : null}
                </span>{status}</strong>
                <span>Speed: {itemMs} ms per position</span>
                <span>Recall: {recall.length}/{sequence.length || length}</span>
            </div>

            <div className="spatial-practice__grid" aria-label="Spatial sequence grid">
                {Array.from({ length: CELL_COUNT }, (_, cell) => (
                    <button
                        key={cell}
                        type="button"
                        className={`spatial-practice__cell${activeCell === cell ? ' is-active' : ''}${pressedCell === cell ? ' is-pressed' : ''}${phase === 'retry' && recall[recall.length - 1] === cell ? ' is-wrong' : ''}`}
                        onClick={() => chooseCell(cell)}
                        disabled={phase !== 'recall'}
                        aria-label={`Position ${cell + 1}`}
                    >
                        {activeCell === cell ? activeOrder : phase === 'retry' && recall[recall.length - 1] === cell ? '×' : pressedCell === cell ? '•' : null}
                    </button>
                ))}
            </div>

            {phase === 'math' && <MathChallenge
                onSolved={() => { if (phaseRef.current === 'math') updatePhase('recall'); }}
                onAbort={stop} />}
            <div className="spatial-practice__controls">
                {phase === 'idle' ? (
                    <button type="button" className="is-primary" onClick={startNewSequence}>Start</button>
                ) : (
                    <>
                        {(phase === 'retry' || phase === 'paused') && (
                            <button type="button" className="is-primary" onClick={replaySequence}>Replay sequence</button>
                        )}
                        <button type="button" onClick={startNewSequence}>New sequence</button>
                        <button type="button" onClick={stop}>Stop / reset</button>
                    </>
                )}
            </div>
        </section>
    );
};

export default SpatialPractice;
