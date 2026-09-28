import { useState } from 'react';
import { drawDeck, RULE_LABELS, type ShiftRule } from '../../model/spatialSuite/games/shift';
import { BLOCKS_PER_SEGMENT, drawSessionMix } from '../../model/spatialSuite/session';
import { holdoutDue, loadState, saveState, type SuiteState } from '../../model/spatialSuite/storage';
import { completeBlock, createBlock, nextPatternVariant } from '../../model/spatialSuite/suite';
import type { BlockLog, BlockPlan, GameId, TrackId, TrialResponse } from '../../model/spatialSuite/types';
import { describeChange, GAME_ORDER, GAMES, instruction, paceLabel, TRACK_NAMES } from './copy';
import GameGuide from './GameGuide';
import { GUIDE_TRACKS, NBACK_PRIMER } from './guides';
import Play from './Play';
import ProgressView from './ProgressView';
import './SpatialSuite.scss';

interface Run {
    mode: 'session' | 'single' | 'holdout';
    games: GameId[];
    segment: number;
    block: number;
    deck: ShiftRule[] | null;
    logs: BlockLog[];
}

type Screen =
    | { kind: 'hub' }
    | { kind: 'intro'; plan: BlockPlan<unknown> }
    | { kind: 'play'; plan: BlockPlan<unknown> }
    | { kind: 'result'; plan: BlockPlan<unknown>; log: BlockLog }
    | { kind: 'interrupted' }
    | { kind: 'summary' };

const trackOf = (state: SuiteState, game: GameId): TrackId => {
    if (game !== 'pattern') return game;
    return nextPatternVariant(state) === 'shape' ? 'pattern-shape' : 'pattern-relation';
};

function exportLog(state: SuiteState): void {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spatial-suite-log-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

export default function SpatialSuite({ onExit }: { onExit: () => void }) {
    const [state, setState] = useState<SuiteState>(() => loadState());
    const [screen, setScreen] = useState<Screen>({ kind: 'hub' });
    const [run, setRun] = useState<Run | null>(null);

    const commit = (next: SuiteState) => {
        saveState(next);
        setState(next);
    };

    const prepare = (nextRun: Run, current: SuiteState) => {
        const game = nextRun.games[nextRun.segment];
        let deck = nextRun.deck;
        let nextState = current;
        if (game === 'shift' && nextRun.mode !== 'holdout' && !deck) {
            deck = drawDeck(Math.random, current.holdoutRule, current.lastShiftDeck);
            nextState = { ...current, lastShiftDeck: deck };
            commit(nextState);
        }
        const plan = createBlock(nextState, { game, deck: deck ?? undefined, holdout: nextRun.mode === 'holdout' }, Math.random);
        setRun({ ...nextRun, deck });
        setScreen({ kind: 'intro', plan });
    };

    const startSession = () => {
        const games = drawSessionMix(Math.random, state.lastSessionMix);
        const next = { ...state, lastSessionMix: games };
        commit(next);
        prepare({ mode: 'session', games, segment: 0, block: 0, deck: null, logs: [] }, next);
    };

    const startSingle = (game: GameId) => prepare({ mode: 'single', games: [game], segment: 0, block: 0, deck: null, logs: [] }, state);
    const startHoldout = () => prepare({ mode: 'holdout', games: ['shift'], segment: 0, block: 0, deck: null, logs: [] }, state);

    const finishBlock = (plan: BlockPlan<unknown>, responses: TrialResponse[], tracked?: { correct: number; total: number }) => {
        const outcome = completeBlock(state, plan, responses, tracked ? { trackedCorrect: tracked.correct, trackedTotal: tracked.total } : {});
        commit(outcome.state);
        setRun((current) => current && { ...current, logs: [...current.logs, outcome.log] });
        setScreen({ kind: 'result', plan, log: outcome.log });
    };

    const nextBlock = () => {
        if (!run) return;
        if (run.mode === 'holdout') {
            setScreen({ kind: 'summary' });
            return;
        }
        if (run.mode === 'single' || run.block + 1 < BLOCKS_PER_SEGMENT) {
            prepare({ ...run, block: run.block + 1 }, state);
            return;
        }
        if (run.segment + 1 < run.games.length) {
            prepare({ ...run, segment: run.segment + 1, block: 0, deck: null }, state);
            return;
        }
        setScreen({ kind: 'summary' });
    };

    const home = () => {
        setRun(null);
        setScreen({ kind: 'hub' });
    };

    const progressLabel = (): string => {
        if (!run || run.mode === 'holdout') return 'Untrained rule';
        if (run.mode === 'single') return `Block ${run.block + 1}`;
        return `Game ${run.segment + 1} of ${run.games.length} · block ${run.block + 1} of ${BLOCKS_PER_SEGMENT}`;
    };
    const blockName = (plan: BlockPlan<unknown>): string => (plan.holdout ? 'Monthly check' : TRACK_NAMES[plan.track]);
    const blockLabel = (plan: BlockPlan<unknown>): string => `${blockName(plan)} · ${progressLabel().toLowerCase()}`;

    if (screen.kind === 'play') {
        return (
            <div className="spatial-suite is-playing">
                <Play plan={screen.plan} label={blockLabel(screen.plan)}
                    onFinish={(responses, tracked) => finishBlock(screen.plan, responses, tracked)}
                    onInterrupted={() => setScreen({ kind: 'interrupted' })}
                    onQuit={home} />
            </div>
        );
    }

    if (screen.kind === 'intro') {
        const { plan } = screen;
        const { difficulty } = plan;
        return (
            <div className="spatial-suite">
                <section className="suite-panel suite-intro" aria-labelledby="suite-intro-title">
                    <p className="suite-eyebrow">{progressLabel()}</p>
                    <h1 id="suite-intro-title">{blockName(plan)}</h1>
                    <p className="suite-lede">{instruction(plan.track, difficulty.n)}</p>
                    {run && run.block === 0 ? (
                        <GameGuide track={plan.track} rules={plan.rules as ShiftRule[]} />
                    ) : (
                        <details className="suite-details">
                            <summary>How this game works</summary>
                            <GameGuide track={plan.track} rules={plan.rules as ShiftRule[]} />
                        </details>
                    )}
                    {plan.holdout && <p className="suite-muted">This rule is never trained, so it shows whether your practice carries over. It does not change your level.</p>}
                    <dl className="suite-dials">
                        <div><dt>n</dt><dd>{difficulty.n}</dd></div>
                        <div><dt>Lures</dt><dd>{Math.round(difficulty.lureRate * 100)}%</dd></div>
                        <div><dt>Pace</dt><dd>{paceLabel(difficulty.isiMs)}</dd></div>
                        <div><dt>Trials</dt><dd>{plan.trials.length}</dd></div>
                    </dl>
                    <div className="suite-actions">
                        <button type="button" className="suite-button is-primary" autoFocus onClick={() => setScreen({ kind: 'play', plan })}>
                            Start block
                        </button>
                        <button type="button" className="suite-button" onClick={home}>Back to suite</button>
                    </div>
                    <p className="suite-muted">Press Space or tap Match. Escape stops the block without saving it.</p>
                </section>
            </div>
        );
    }

    if (screen.kind === 'result') {
        const { plan, log } = screen;
        const last = run?.mode === 'holdout'
            || (run?.mode === 'session' && run.block + 1 >= BLOCKS_PER_SEGMENT && run.segment + 1 >= run.games.length);
        const nextLabel = run?.mode === 'session' && run.block + 1 >= BLOCKS_PER_SEGMENT
            ? last ? 'Finish session' : `Next: ${GAMES[run.games[run.segment + 1]].name}`
            : last ? 'Finish' : 'Next block';
        return (
            <div className="spatial-suite">
                <section className="suite-panel suite-result" aria-labelledby="suite-result-title">
                    <p className="suite-eyebrow">{blockLabel(plan)}</p>
                    <h1 id="suite-result-title"><span className="suite-big">{Math.round(log.accuracy * 100)}%</span> accuracy</h1>
                    <dl className="suite-dials">
                        <div><dt>Hits</dt><dd>{log.hits} of {log.hits + log.misses}</dd></div>
                        <div><dt>False alarms</dt><dd>{log.falseAlarms}</dd></div>
                        <div><dt>d′</dt><dd>{log.dPrime.toFixed(2)}</dd></div>
                        {log.trackedTotal !== undefined && <div><dt>Tracked</dt><dd>{log.trackedCorrect} of {log.trackedTotal}</dd></div>}
                    </dl>
                    <p className="suite-lede">{plan.holdout ? 'Logged as a monthly check. Your level is unchanged.' : describeChange(plan.track, log.change)}</p>
                    <div className="suite-actions">
                        <button type="button" className="suite-button is-primary" autoFocus onClick={nextBlock}>{nextLabel}</button>
                        <button type="button" className="suite-button" onClick={home}>Back to suite</button>
                    </div>
                </section>
            </div>
        );
    }

    if (screen.kind === 'interrupted') {
        return (
            <div className="spatial-suite">
                <section className="suite-panel" aria-labelledby="suite-interrupted-title">
                    <h1 id="suite-interrupted-title">Block paused</h1>
                    <p className="suite-lede">The app was hidden mid-block, so the timing is no longer fair. That block was not saved.</p>
                    <div className="suite-actions">
                        <button type="button" className="suite-button is-primary" autoFocus onClick={() => run && prepare(run, state)}>Restart block</button>
                        <button type="button" className="suite-button" onClick={home}>Back to suite</button>
                    </div>
                </section>
            </div>
        );
    }

    if (screen.kind === 'summary' && run) {
        return (
            <div className="spatial-suite">
                <section className="suite-panel" aria-labelledby="suite-summary-title">
                    <p className="suite-eyebrow">{run.mode === 'holdout' ? 'Monthly check' : 'Session complete'}</p>
                    <h1 id="suite-summary-title">{run.mode === 'holdout' ? 'Check logged' : 'Good work. That’s today’s session.'}</h1>
                    <ul className="suite-summary">
                        {run.logs.map((log) => (
                            <li key={log.id}>
                                <span>{log.holdout ? 'Monthly check' : TRACK_NAMES[log.track]}</span>
                                <span>{log.n}-back · {Math.round(log.accuracy * 100)}%</span>
                            </li>
                        ))}
                    </ul>
                    <p className="suite-muted">Spacing works better than cramming: three to five sessions a week is plenty.</p>
                    <div className="suite-actions">
                        <button type="button" className="suite-button is-primary" autoFocus onClick={home}>Back to suite</button>
                    </div>
                </section>
            </div>
        );
    }

    const due = holdoutDue(state);
    return (
        <div className="spatial-suite">
            <header className="suite-header">
                <button type="button" className="suite-link" onClick={onExit}>← All exercises</button>
                <p className="suite-eyebrow">Spatial working memory</p>
                <h1>Spatial suite</h1>
                <p className="suite-lede">Five n-back games that train holding, updating and relating positions. Each game adapts to you on its own.</p>
            </header>

            <section className="suite-panel suite-session" aria-labelledby="suite-session-title">
                <div>
                    <h2 id="suite-session-title">Today’s session</h2>
                    <p>Three games, four short blocks each: about 15 minutes. The mix changes every time.</p>
                </div>
                <button type="button" className="suite-button is-primary" autoFocus onClick={startSession}>Start session</button>
            </section>

            {due && (
                <section className="suite-panel suite-check" aria-labelledby="suite-check-title">
                    <div>
                        <h2 id="suite-check-title">{state.lastHoldoutAt ? 'Monthly check' : 'Baseline check'}</h2>
                        <p>
                            One Shift block with the rule you never train ({RULE_LABELS[state.holdoutRule].name.toLowerCase()}).
                            {state.lastHoldoutAt ? ' Compare it with earlier checks to see whether practice carries over.' : ' Take it now, then once a month, to see whether practice carries over.'}
                        </p>
                    </div>
                    <button type="button" className="suite-button" onClick={startHoldout}>Take the check</button>
                </section>
            )}

            <section aria-labelledby="suite-games-title">
                <h2 id="suite-games-title" className="suite-section-title">Practise one game</h2>
                <ul className="suite-games">
                    {GAME_ORDER.map((game) => {
                        const difficulty = state.tracks[trackOf(state, game)];
                        const n = game === 'wayfinder' ? Math.max(2, difficulty.n) : difficulty.n;
                        return (
                            <li key={game}>
                                <button type="button" className="suite-game" onClick={() => startSingle(game)}
                                    aria-describedby={`suite-${game}-summary`}>
                                    <span className="suite-game__head">
                                        <strong>{GAMES[game].name}</strong>
                                        {GAMES[game].experimental && <span className="suite-tag">Experimental</span>}
                                        <span className="suite-game__level">{n}-back</span>
                                    </span>
                                    <span className="suite-game__demand">{GAMES[game].demand}</span>
                                    <span id={`suite-${game}-summary`} className="suite-game__summary">{GAMES[game].summary}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <section aria-labelledby="suite-guides-title">
                <h2 id="suite-guides-title" className="suite-section-title">How the games work</h2>
                <p className="suite-primer">{NBACK_PRIMER}</p>
                <div className="suite-guides">
                    {GAME_ORDER.map((game) => (
                        <details key={game} className="suite-details">
                            <summary>
                                <strong>{GAMES[game].name}</strong>
                                <span>{GAMES[game].demand}</span>
                            </summary>
                            {GUIDE_TRACKS[game].map((track) => (
                                <div key={track}>
                                    {GUIDE_TRACKS[game].length > 1 && <h3 className="suite-guide__variant">{TRACK_NAMES[track]}</h3>}
                                    <GameGuide track={track} />
                                </div>
                            ))}
                        </details>
                    ))}
                </div>
            </section>

            <section aria-labelledby="suite-progress-title">
                <h2 id="suite-progress-title" className="suite-section-title">Progress</h2>
                <ProgressView blocks={state.blocks} />
            </section>

            <footer className="suite-footer">
                <p>Levels measure these games. Rising scores mean you are getting better at them; they are not an intelligence score.</p>
                <button type="button" className="suite-link" onClick={() => exportLog(state)} disabled={state.blocks.length === 0}>
                    Export trial log
                </button>
            </footer>
        </div>
    );
}
