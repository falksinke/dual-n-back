import { useRef, useState } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import './SpatialPractice.scss';

interface SpatialPracticeProps {
    onExit: () => void;
}

type Phase = 'idle' | 'showing' | 'recall' | 'retry' | 'paused';

const CELL_COUNT = 9;
const INITIAL_ITEM_MS = 1000;
const MIN_ITEM_MS = 300;
const ACTIVE_PORTION = 0.7;

function createSequence(length: number): number[] {
    const cells = Array.from({ length: CELL_COUNT }, (_, index) => index);
    for (let index = cells.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [cells[index], cells[swapIndex]] = [cells[swapIndex], cells[index]];
    }
    return cells.slice(0, length);
}

const SpatialPractice = ({ onExit }: SpatialPracticeProps) => {
    const [length, setLength] = useState(5);
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
                updatePhase('recall');
                return;
            }
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
        const nextSequence = createSequence(length);
        sequenceRef.current = nextSequence;
        itemMsRef.current = INITIAL_ITEM_MS;
        setSequence(nextSequence);
        setItemMs(INITIAL_ITEM_MS);
        playSequence(nextSequence, INITIAL_ITEM_MS);
    };

    const replaySequence = (): void => {
        if (sequenceRef.current.length > 0) {
            playSequence(sequenceRef.current, itemMsRef.current);
        }
    };

    const stop = (): void => {
        cancelScheduled();
        sequenceRef.current = [];
        itemMsRef.current = INITIAL_ITEM_MS;
        setSequence([]);
        recallRef.current = [];
        setRecall([]);
        setItemMs(INITIAL_ITEM_MS);
        updatePhase('idle');
    };

    const chooseCell = (cell: number): void => {
        if (phaseRef.current !== 'recall') return;
        const nextRecall = [...recallRef.current, cell];
        recallRef.current = nextRecall;
        setRecall(nextRecall);
        const expected = sequenceRef.current[nextRecall.length - 1];
        if (cell !== expected) {
            updatePhase('retry');
            return;
        }
        if (nextRecall.length === sequenceRef.current.length) {
            const faster = Math.max(MIN_ITEM_MS, Math.round(itemMsRef.current * 0.9));
            itemMsRef.current = faster;
            setItemMs(faster);
            playSequence(sequenceRef.current, faster);
        }
    };

    const changeLength = (nextLength: number): void => {
        cancelScheduled();
        sequenceRef.current = [];
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
        const handleVisibility = (): void => {
            if (document.hidden && (phaseRef.current === 'showing' || phaseRef.current === 'recall')) {
                cancelScheduled();
                recallRef.current = [];
                setRecall([]);
                updatePhase('paused');
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            runRef.current += 1;
            timersRef.current.forEach((timer) => window.clearTimeout(timer));
            timersRef.current.clear();
        };
    });

    const status = phase === 'idle'
        ? 'Choose a length, then start.'
        : phase === 'showing'
            ? 'Watch the positions in order.'
            : phase === 'recall'
                ? 'Repeat the sequence.'
                : phase === 'retry'
                    ? 'That was not the next position. Replay and try again.'
                    : 'Practice paused while the tab was hidden. Replay to continue.';

    return (
        <section className="spatial-practice" aria-labelledby="spatial-practice-title">
            <header className="spatial-practice__header">
                <div>
                    <p className="spatial-practice__eyebrow">Beginner rehearsal</p>
                    <h1 id="spatial-practice-title">Spatial sequence practice</h1>
                </div>
                <button type="button" className="spatial-practice__back" onClick={exit}>Back to N-Back</button>
            </header>

            <div className="spatial-practice__settings">
                <label htmlFor="spatial-sequence-length">Sequence length</label>
                <select
                    id="spatial-sequence-length"
                    value={length}
                    onChange={(event) => changeLength(Number(event.target.value))}
                >
                    {Array.from({ length: CELL_COUNT }, (_, index) => index + 1).map((value) => (
                        <option key={value} value={value}>{value}</option>
                    ))}
                </select>
            </div>

            <div className="spatial-practice__status" role="status" aria-live="polite">
                <strong>{status}</strong>
                <span>Speed: {itemMs} ms per position</span>
                <span>Recall: {recall.length}/{sequence.length || length}</span>
            </div>

            <div className="spatial-practice__grid" aria-label="Spatial sequence grid">
                {Array.from({ length: CELL_COUNT }, (_, cell) => (
                    <button
                        key={cell}
                        type="button"
                        className={`spatial-practice__cell${activeCell === cell ? ' is-active' : ''}`}
                        onClick={() => chooseCell(cell)}
                        disabled={phase !== 'recall'}
                        aria-label={`Position ${cell + 1}`}
                    >
                        {activeCell === cell ? activeOrder : null}
                    </button>
                ))}
            </div>

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
