import { useRef, useState } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import './SpatialPractice.scss';
import { PracticeSounds } from './sounds';
import { advanceEndbackSequence, chooseHiddenPositions, createSequence, type HiddenPlacement } from './sequence';
import MathChallenge from './MathChallenge';
import PracticeSettings from './PracticeSettings';
import FireflyVillage from './FireflyVillage';
import { FireflyMark } from './VillageArt';

interface SpatialPracticeProps {
    onExit: () => void;
}

type Phase = 'idle' | 'showing' | 'math' | 'recall' | 'success' | 'retry' | 'paused';

const INITIAL_ITEM_MS = 1000;
const MIN_ITEM_MS = 300;
const ACTIVE_PORTION = 0.7;
const SUCCESS_PAUSE_MS = 1000;

const SpatialPractice = ({ onExit }: SpatialPracticeProps) => {
    const sceneRef = useRef<HTMLDivElement>(null);
    const [length, setLength] = useState(5);
    const [endback, setEndback] = useState(false);
    const [hiddenCount, setHiddenCount] = useState(1);
    const [hiddenPlacement, setHiddenPlacement] = useState<HiddenPlacement>('first');
    const hiddenPositionsRef = useRef<Set<number>>(new Set());
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
        // Focus the neutral scene, never an expected window. This also removes a
        // previous response's focus ring before a new presentation or pause.
        if (next !== 'idle') sceneRef.current?.focus({ preventScroll: true });
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
        // Setup sits below the village on narrow screens. Bring the targets into
        // view synchronously, not through an animation or an extra cue delay.
        sceneRef.current?.querySelector<HTMLElement>('.firefly-village__grid')
            ?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
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
            // The neutral bleep marks every slot; only its window location is hidden.
            soundsRef.current?.play('item');
            setActiveCell(hiddenPositionsRef.current.has(index) ? null : nextSequence[index]);
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
        hiddenPositionsRef.current = new Set();
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
        hiddenPositionsRef.current = new Set();
        historyRef.current = [];
        itemMsRef.current = INITIAL_ITEM_MS;
        setSequence([]);
        recallRef.current = [];
        setRecall([]);
        setItemMs(INITIAL_ITEM_MS);
        updatePhase('idle');
        sceneRef.current?.focus({ preventScroll: true });
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
            const next = endback
                ? advanceEndbackSequence(sequenceRef.current, interference)
                : newSequenceOnSuccess
                    ? createSequence(length, sequenceRef.current, historyRef.current, interference) : sequenceRef.current;
            sequenceRef.current = next;
            hiddenPositionsRef.current = endback
                ? chooseHiddenPositions(length, hiddenCount, hiddenPlacement) : new Set();
            schedule(() => {
                setSequence(next);
                playSequence(next, faster);
            }, SUCCESS_PAUSE_MS, run);
        }
    };

    const changeLength = (nextLength: number): void => {
        cancelScheduled();
        sequenceRef.current = [];
        hiddenPositionsRef.current = new Set();
        historyRef.current = [];
        itemMsRef.current = INITIAL_ITEM_MS;
        setLength(nextLength);
        setHiddenCount((count) => Math.min(count, nextLength - 1));
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

    const titles: Record<Phase, string> = {
        idle: 'The night post is ready.',
        showing: 'Follow the firefly.',
        math: 'A little postage check.',
        recall: 'Your turn, courier.',
        success: 'Every letter, home.',
        retry: 'Not this address.',
        paused: 'The village can wait.',
    };
    const hiddenOrder = phase === 'showing' && activeOrder !== null
        && hiddenPositionsRef.current.has(activeOrder - 1) ? activeOrder : null;
    const status = phase === 'idle'
        ? 'Watch the windows light up. Then deliver your letters in the same order.'
        : phase === 'showing'
            ? hiddenOrder !== null
                ? `Stop ${hiddenOrder} of ${length} is hidden. Recall it from the last route.`
                : 'Remember the order. Wait for the firefly to finish before delivering.'
            : phase === 'math'
                ? 'Work out the change, then deliver the route from memory.'
                : phase === 'recall'
                    ? `${recall.length} of ${length} delivered. Tap the next window from memory.`
                    : phase === 'success'
                        ? `Correct! ${endback ? 'Route shifts one stop' : newSequenceOnSuccess ? 'New sequence' : 'Same sequence'} next${!increaseSpeed ? ' at the same speed.' : itemMs === MIN_ITEM_MS ? ' at top speed.' : ', faster.'}`
                        : phase === 'retry'
                            ? `Wrong address at delivery ${recall.length}. Replay the route at the same pace.`
                            : 'Paused when you left the page. Replay when you’re ready to see the whole route from the beginning.';
    const sceneNote = phase === 'recall' ? `Deliver from memory · ${recall.length}/${length}`
        : phase === 'showing' ? hiddenOrder !== null ? `? · Stop ${hiddenOrder}/${length} is hidden` : 'Watch the firefly'
            : phase === 'math' ? 'Postage check'
                : phase === 'success' ? 'Route delivered ✓'
                    : phase === 'retry' ? 'Wrong address · replay to try again'
                        : phase === 'paused' ? 'Route paused' : 'The village is ready';
    // Only a completed tap is projected into the art; sequence stays in this owner.
    const tapFeedback = pressedCell === null ? null : {
        cell: pressedCell, correct: phase !== 'retry', id: recall.length,
    };
    const wrongCell = phase === 'retry' ? recall[recall.length - 1] ?? null : null;

    return (
        <section className={`spatial-practice firefly-post is-${phase}`} aria-labelledby="spatial-practice-title">
            <header className="spatial-practice__header">
                <div className="spatial-practice__brand">
                    <span className="spatial-practice__emblem" aria-hidden="true"><FireflyMark /></span>
                    <div>
                        <p className="spatial-practice__eyebrow">Spatial sequence</p>
                        <h1 id="spatial-practice-title">Firefly Post</h1>
                    </div>
                </div>
                <button type="button" className="spatial-practice__back" onClick={exit}>
                    <span aria-hidden="true">←</span> All exercises
                </button>
            </header>

            <div className="spatial-practice__body">
                <div className="spatial-practice__scene" ref={sceneRef} tabIndex={-1}
                    role="group" aria-label="Night-delivery village"
                    aria-describedby="spatial-practice-status spatial-practice-help">
                    <div className="spatial-practice__scene-toolbar">
                        <div className="spatial-practice__scene-note" aria-hidden="true">{sceneNote}</div>
                        {(phase === 'retry' || phase === 'paused') && (
                            <div className="spatial-practice__controls spatial-practice__controls--scene">
                                <button type="button" className="is-primary" onClick={replaySequence}>Replay route</button>
                                <button type="button" onClick={startNewSequence}>New sequence</button>
                            </div>
                        )}
                    </div>
                    <FireflyVillage phase={phase} activeCell={activeCell} activeOrder={activeOrder}
                        tapFeedback={tapFeedback} wrongCell={wrongCell} onChoose={chooseCell} />
                </div>

                <aside className="spatial-practice__dispatch" aria-label="Post-office dispatch">
                    <p className="spatial-practice__eyebrow">The night shift</p>
                    <div className="spatial-practice__status" role="status" aria-live="polite" aria-atomic="true">
                        <h2><span className="spatial-practice__feedback-icon" aria-hidden="true">
                            {phase === 'success' ? '✓' : phase === 'retry' ? '×' : phase === 'paused' ? 'Ⅱ' : null}
                        </span>{titles[phase]}</h2>
                        <p id="spatial-practice-status">{status}</p>
                    </div>
                    <dl className="spatial-practice__route-facts">
                        <div><dt>Letters</dt><dd>{sequence.length || length}</dd></div>
                        <div><dt>{phase === 'success' ? 'Next pace' : 'Pace'}</dt><dd>{itemMs}<small> ms / window</small></dd></div>
                    </dl>

                    <div className="spatial-practice__controls">
                        {phase === 'idle' ? (
                            <button type="button" className="is-primary" onClick={startNewSequence}>
                                Start route <span aria-hidden="true">→</span>
                            </button>
                        ) : (
                            <>
                                {(phase === 'retry' || phase === 'paused') && (
                                    <button type="button" className="is-primary" onClick={replaySequence}>Replay route</button>
                                )}
                                <button type="button" onClick={startNewSequence}>New sequence</button>
                                <button type="button" onClick={stop}>Stop / reset</button>
                            </>
                        )}
                    </div>
                    <p id="spatial-practice-help" className="spatial-practice__instruction">
                        Tap once per letter, in order. A window may appear more than once.
                    </p>

                    <div className="spatial-practice__setup">
                        <PracticeSettings length={length} onLengthChange={changeLength}
                            endback={endback} onEndbackChange={setEndback}
                            hiddenCount={hiddenCount} onHiddenCountChange={setHiddenCount}
                            hiddenPlacement={hiddenPlacement} onHiddenPlacementChange={setHiddenPlacement}
                            newSequence={newSequenceOnSuccess} onNewSequenceChange={setNewSequenceOnSuccess}
                            increaseSpeed={increaseSpeed} onIncreaseSpeedChange={setIncreaseSpeed}
                            interference={interference} onInterferenceChange={setInterference}
                            mathEnabled={mathEnabled} onMathEnabledChange={setMathEnabled}
                            disabled={phase !== 'idle'} />
                        <p className="spatial-practice__settings-note">
                            {phase === 'idle' ? 'Set your route before heading out.' : 'Stop / reset to change dispatch settings.'}
                        </p>
                    </div>
                </aside>
            </div>

            <p className="spatial-practice__keyboard-hint">
                <span>Tab to a window; arrow keys move focus.</span>
                <span>Enter or Space delivers. Touch: tap a window.</span>
            </p>
            {phase === 'math' && <MathChallenge
                onSolved={() => { if (phaseRef.current === 'math') updatePhase('recall'); }}
                onAbort={stop} />}
        </section>
    );
};

export default SpatialPractice;
