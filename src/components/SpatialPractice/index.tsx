import { useEffectEvent, useRef, useState } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import {
    createEmptyFireflyRoute,
    loadFireflyProgress,
    saveFireflyProgress,
    subscribeFireflyProgress,
    type FireflyRoute,
    type FireflySettings,
    type FireflyProgressV1,
} from '../../model/fireflyProgress';
import { loadProfile } from '../../model/profile';
import { loadUiPreferences } from '../../model/uiPreferences';
import { noteLocalProgressChanged } from '../../sync/noteLocal';
import { useHaptics } from '../../haptics/useHaptics';
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

const MIN_ITEM_MS = 300;
const ACTIVE_PORTION = 0.7;
const SUCCESS_PAUSE_MS = 1000;

const SpatialPractice = ({ onExit }: SpatialPracticeProps) => {
    const practiceRef = useRef<HTMLElement>(null);
    const sceneRef = useRef<HTMLDivElement>(null);
    const settingsDialogRef = useRef<HTMLDialogElement>(null);
    const settingsButtonRef = useRef<HTMLButtonElement>(null);
    const [saved, setSaved] = useState(() => loadFireflyProgress(loadProfile()));
    const savedRef = useRef(saved);
    const { length, middleWindowEnabled, endback, hiddenCount, hiddenPlacement, isiMs,
        increaseSpeed, interference, mathEnabled, newSequenceOnSuccess } = saved.settings;
    const streak = saved.route.streak;
    const hiddenPositionsRef = useRef<Set<number>>(new Set(saved.route.hiddenPositions));
    const historyRef = useRef<number[]>(saved.route.history);
    const [pressedCell, setPressedCell] = useState<number | null>(null);
    const pressRef = useRef(0);
    const soundsRef = useRef<PracticeSounds | null>(null);
    const [phase, setPhase] = useState<Phase>('idle');
    const [hapticsEnabled] = useState(() => loadUiPreferences().hapticFeedbackEnabled);
    const [activeCell, setActiveCell] = useState<number | null>(null);
    const [activeOrder, setActiveOrder] = useState<number | null>(null);
    const [recall, setRecall] = useState<number[]>([]);
    const [itemMs, setItemMs] = useState(saved.route.itemMs);
    const sequenceRef = useRef<number[]>(saved.route.sequence);
    const itemMsRef = useRef(saved.route.itemMs);
    const phaseRef = useRef<Phase>('idle');
    const recallRef = useRef<number[]>([]);
    const timersRef = useRef<Set<number>>(new Set());
    const runRef = useRef(0);
    useHaptics({ rootRef: practiceRef, enabled: hapticsEnabled, uiRevision: phase });

    const persist = (settings: FireflySettings, route: FireflyRoute): void => {
        const previousTime = Date.parse(savedRef.current.updatedAt ?? '');
        const timestamp = Math.max(Date.now(), Number.isFinite(previousTime) ? previousTime + 1 : 0);
        const next: FireflyProgressV1 = {
            version: 1, updatedAt: new Date(timestamp).toISOString(), settings, route,
        };
        savedRef.current = next;
        saveFireflyProgress(loadProfile(), next);
        setSaved(next);
        noteLocalProgressChanged();
    };

    const persistRoute = (route: Partial<FireflyRoute>): void => {
        persist(savedRef.current.settings, { ...savedRef.current.route, ...route });
    };

    const changeSetting = (setting: Partial<FireflySettings>): void => {
        const settings = { ...savedRef.current.settings, ...setting };
        let route = savedRef.current.route;
        if (settings.middleWindowEnabled === false && route.sequence.includes(4)) {
            sequenceRef.current = [];
            hiddenPositionsRef.current = new Set();
            historyRef.current = [];
            itemMsRef.current = settings.isiMs;
            setItemMs(settings.isiMs);
            persist(settings, createEmptyFireflyRoute(settings.isiMs));
            return;
        }
        if (setting.endback === false) {
            hiddenPositionsRef.current = new Set();
            route = { ...route, hiddenPositions: [] };
        }
        if (setting.isiMs !== undefined || setting.increaseSpeed === false) {
            itemMsRef.current = settings.isiMs;
            setItemMs(settings.isiMs);
            persist(settings, { ...route, itemMs: settings.isiMs });
            return;
        }
        persist(settings, route);
    };

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
        // Desktop may scroll to the grid; the phone game is a locked viewport.
        if (!window.matchMedia('(max-width: 600px)').matches) {
            sceneRef.current?.querySelector<HTMLElement>('.firefly-village__grid')
                ?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
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
        const resetStreak = phaseRef.current !== 'success'
            && (phaseRef.current !== 'idle' || sequenceRef.current.length > 0);
        const nextSequence = createSequence(length, sequenceRef.current, historyRef.current, interference, middleWindowEnabled);
        hiddenPositionsRef.current = new Set();
        sequenceRef.current = nextSequence;
        itemMsRef.current = isiMs;
        setItemMs(isiMs);
        persistRoute({ streak: resetStreak ? 0 : streak, sequence: nextSequence,
            hiddenPositions: [], history: historyRef.current, itemMs: isiMs });
        playSequence(nextSequence, isiMs);
    };

    const startOrResume = (): void => {
        if (sequenceRef.current.length === length) replaySequence();
        else startNewSequence();
    };

    const replaySequence = (): void => {
        if (sequenceRef.current.length > 0) {
            playSequence(sequenceRef.current, itemMsRef.current);
        }
    };

    const stop = (): void => {
        cancelScheduled();
        sequenceRef.current = [];
        hiddenPositionsRef.current = new Set();
        historyRef.current = [];
        itemMsRef.current = isiMs;
        persistRoute(createEmptyFireflyRoute(isiMs));
        recallRef.current = [];
        setRecall([]);
        setItemMs(isiMs);
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
            persistRoute({ streak: 0 });
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
                ? advanceEndbackSequence(sequenceRef.current, interference, middleWindowEnabled)
                : newSequenceOnSuccess
                    ? createSequence(length, sequenceRef.current, historyRef.current, interference, middleWindowEnabled) : sequenceRef.current;
            sequenceRef.current = next;
            hiddenPositionsRef.current = endback
                ? chooseHiddenPositions(length, hiddenCount, hiddenPlacement) : new Set();
            persistRoute({ streak: savedRef.current.route.streak + 1, sequence: next,
                hiddenPositions: [...hiddenPositionsRef.current], history: historyRef.current,
                itemMs: faster });
            schedule(() => {
                playSequence(next, faster);
            }, SUCCESS_PAUSE_MS, run);
        }
    };

    const changeLength = (nextLength: number): void => {
        cancelScheduled();
        sequenceRef.current = [];
        hiddenPositionsRef.current = new Set();
        historyRef.current = [];
        itemMsRef.current = isiMs;
        persist({ ...savedRef.current.settings, length: nextLength,
            hiddenCount: Math.min(hiddenCount, nextLength - 1) }, createEmptyFireflyRoute(isiMs));
        recallRef.current = [];
        setRecall([]);
        setItemMs(isiMs);
        updatePhase('idle');
    };

    const exit = (): void => {
        cancelScheduled();
        onExit();
    };

    const openSettings = (): void => {
        if (phaseRef.current === 'idle') settingsDialogRef.current?.showModal();
    };

    // The document listener is mounted once; the event uses the latest route settings.
    const startRouteFromKeyboard = useEffectEvent(() => startOrResume());

    useMountEffect(() => {
        soundsRef.current = new PracticeSounds();
        const unsubscribe = subscribeFireflyProgress((profile, progress) => {
            if (profile !== loadProfile() || phaseRef.current !== 'idle') return;
            savedRef.current = progress;
            setSaved(progress);
            sequenceRef.current = progress.route.sequence;
            hiddenPositionsRef.current = new Set(progress.route.hiddenPositions);
            historyRef.current = progress.route.history;
            itemMsRef.current = progress.route.itemMs;
            setItemMs(progress.route.itemMs);
        });
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
        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape' || event.defaultPrevented || phaseRef.current === 'idle'
                || document.querySelector('dialog[open]')) return;
            event.preventDefault();
            stop();
        };
        const handleSpace = (event: KeyboardEvent): void => {
            if (event.code !== 'Space' || event.repeat || event.defaultPrevented
                || phaseRef.current !== 'idle' || document.querySelector('dialog[open]')) return;
            if (event.target instanceof Element && event.target.closest(
                'button, a, input, select, textarea, summary, [contenteditable], [role="button"], [role="checkbox"]'
            )) return;
            event.preventDefault();
            startRouteFromKeyboard();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        document.addEventListener('keydown', handleEscape);
        document.addEventListener('keydown', handleSpace);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('keydown', handleSpace);
            unsubscribe();
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
        ? sequenceRef.current.length > 0
            ? 'Your route is saved. Continue it from the first window when you’re ready.'
            : 'Watch the windows light up. Then deliver your letters in the same order.'
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
                        : phase === 'paused' ? 'Route paused'
                            : sequenceRef.current.length > 0 ? 'Saved route ready' : 'The village is ready';
    // Only a completed tap is projected into the art; sequence stays in this owner.
    const tapFeedback = pressedCell === null ? null : {
        cell: pressedCell, correct: phase !== 'retry', id: recall.length,
    };
    const wrongCell = phase === 'retry' ? recall[recall.length - 1] ?? null : null;

    return (
        <section ref={practiceRef} className={`spatial-practice firefly-post is-${phase}`} aria-labelledby="spatial-practice-title">
            <header className="spatial-practice__header">
                <div className="spatial-practice__brand">
                    <span className="spatial-practice__emblem" aria-hidden="true"><FireflyMark /></span>
                    <div>
                        <p className="spatial-practice__eyebrow">Spatial sequence</p>
                        <h1 id="spatial-practice-title">Firefly Post</h1>
                    </div>
                </div>
                <div className="haptic-host">
                    <button type="button" className="spatial-practice__back" onClick={exit}>
                        <span aria-hidden="true">←</span> All exercises
                    </button>
                </div>
            </header>

            <div className="spatial-practice__body">
                <div className="spatial-practice__scene" ref={sceneRef} tabIndex={-1}
                    role="group" aria-label="Night-delivery village"
                    aria-describedby="spatial-practice-status spatial-practice-help">
                    <div className="spatial-practice__scene-toolbar">
                        <div className="spatial-practice__scene-note" aria-hidden="true">{sceneNote}</div>
                        {(phase === 'retry' || phase === 'paused') && (
                            <div className="spatial-practice__controls spatial-practice__controls--scene">
                                <div className="haptic-host"><button type="button" className="is-primary" onClick={replaySequence}>Replay route</button></div>
                                <div className="haptic-host"><button type="button" onClick={startNewSequence}>New sequence</button></div>
                            </div>
                        )}
                    </div>
                    <div className="spatial-practice__scene-settings-host haptic-host">
                        <button ref={settingsButtonRef} type="button" className="spatial-practice__scene-settings"
                            aria-label="Firefly Post settings" title={phase === 'idle' ? 'Settings' : 'Stop the route to change settings'}
                            disabled={phase !== 'idle'} onClick={openSettings}>
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <circle cx="9" cy="7" r="2" fill="#292e47" stroke="currentColor" strokeWidth="1.6" />
                                <circle cx="15" cy="12" r="2" fill="#292e47" stroke="currentColor" strokeWidth="1.6" />
                                <circle cx="10" cy="17" r="2" fill="#292e47" stroke="currentColor" strokeWidth="1.6" />
                            </svg>
                        </button>
                    </div>
                    <FireflyVillage phase={phase} activeCell={activeCell} activeOrder={activeOrder}
                        middleWindowEnabled={middleWindowEnabled} streak={streak}
                        hasSavedRoute={sequenceRef.current.length > 0} onStart={startOrResume}
                        tapFeedback={tapFeedback} wrongCell={wrongCell} onChoose={chooseCell}
                        onReplay={replaySequence} onNewSequence={startNewSequence} onReset={stop} />
                    <p id="spatial-practice-status" className="spatial-practice__sr-only"
                        role="status" aria-live="polite" aria-atomic="true">
                        {titles[phase]} {status}
                    </p>
                    <p id="spatial-practice-help" className="spatial-practice__sr-only">
                        Tap once per letter, in order. A window may appear more than once.
                    </p>
                </div>
            </div>

            <p className="spatial-practice__keyboard-hint">
                <span>When idle, Space starts a route.</span>
                <span>Tab to a window; arrow keys move focus.</span>
                <span>Enter or Space delivers. Touch: tap a window.</span>
                <span>Escape stops the route.</span>
            </p>
            <dialog ref={settingsDialogRef} className="spatial-practice__settings-dialog"
                aria-labelledby="spatial-settings-title"
                onClose={() => settingsButtonRef.current?.focus({ preventScroll: true })}>
                <div className="spatial-practice__settings-dialog-header">
                    <div>
                        <p className="spatial-practice__eyebrow">Keeper's notebook</p>
                        <h2 id="spatial-settings-title">Tonight's route</h2>
                    </div>
                    <div className="haptic-host">
                        <button type="button" className="spatial-practice__settings-close"
                            aria-label="Close settings" onClick={() => settingsDialogRef.current?.close()}>×</button>
                    </div>
                </div>
                <PracticeSettings length={length} onLengthChange={changeLength}
                    isiMs={isiMs} onIsiMsChange={(value) => changeSetting({ isiMs: value })}
                    middleWindowEnabled={middleWindowEnabled} onMiddleWindowChange={(value) => changeSetting({ middleWindowEnabled: value })}
                    endback={endback} onEndbackChange={(value) => changeSetting({ endback: value })}
                    hiddenCount={hiddenCount} onHiddenCountChange={(value) => changeSetting({ hiddenCount: value })}
                    hiddenPlacement={hiddenPlacement} onHiddenPlacementChange={(value: HiddenPlacement) => changeSetting({ hiddenPlacement: value })}
                    newSequence={newSequenceOnSuccess} onNewSequenceChange={(value) => changeSetting({ newSequenceOnSuccess: value })}
                    increaseSpeed={increaseSpeed} onIncreaseSpeedChange={(value) => changeSetting({ increaseSpeed: value })}
                    interference={interference} onInterferenceChange={(value) => changeSetting({ interference: value })}
                    mathEnabled={mathEnabled} onMathEnabledChange={(value) => changeSetting({ mathEnabled: value })}
                    disabled={phase !== 'idle'} />
            </dialog>
            {phase === 'math' && <MathChallenge
                onSolved={() => { if (phaseRef.current === 'math') updatePhase('recall'); }}
                onAbort={stop} />}
        </section>
    );
};

export default SpatialPractice;
