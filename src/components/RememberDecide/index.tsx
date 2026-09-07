import { useRef, type KeyboardEvent } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import { validateConfig } from '../../model/rememberDecide';
import type { TimedPhase } from './controller';
import Location from './Location';
import Recall from './Recall';
import Result from './Result';
import Setup from './Setup';
import SymmetryDecision from './SymmetryDecision';
import { useRememberDecide } from './useRememberDecide';
import './RememberDecide.scss';

function suppressRepeatedActivation(event: KeyboardEvent<HTMLElement>): void {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        event.stopPropagation();
    }
}

interface TimedBlankProps {
    readonly phase: Extract<TimedPhase, 'location-blank' | 'decision-blank'>;
    readonly status: string;
    readonly onMounted: () => void;
}

function TimedBlank({ phase, status, onMounted }: TimedBlankProps) {
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    useMountEffect(() => {
        onMounted();
        if (!(document.activeElement instanceof HTMLElement && document.activeElement.dataset.persistentControl)) {
            headingRef.current?.focus();
        }
    });
    return (
        <section className="remember-decide-phase remember-decide-blank" aria-labelledby="remember-decide-blank-title">
            <div className="remember-decide-phase__intro">
                <p className="remember-decide-eyebrow">Transition</p>
                <h2 id="remember-decide-blank-title" ref={headingRef} tabIndex={-1}>
                    {phase === 'location-blank' ? 'Get ready to decide' : 'Get ready for the next step'}
                </h2>
                <p className="remember-decide-phase__hint">{status}</p>
            </div>
            <div className="remember-decide-stage-placeholder" aria-hidden="true" />
        </section>
    );
}

interface InterruptedProps {
    readonly status: string;
    readonly onRestart: () => void;
    readonly onSetup: () => void;
    readonly onExit: () => void;
}

function Interrupted({ status, onRestart, onSetup, onExit }: InterruptedProps) {
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    useMountEffect(() => headingRef.current?.focus());
    return (
        <section className="remember-decide remember-decide-interrupted" aria-labelledby="remember-decide-interrupted-title" onKeyDownCapture={suppressRepeatedActivation}>
            <h1 id="remember-decide-interrupted-title" ref={headingRef} tabIndex={-1}>Round interrupted</h1>
            <p>This attempt was discarded. Restarting creates a fresh round at the same settings.</p>
            <div className="remember-decide-actions">
                <button type="button" className="remember-decide-button is-primary" onClick={onRestart}>Restart round</button>
                <button type="button" className="remember-decide-button is-secondary" onClick={onSetup}>Settings</button>
                <button type="button" className="remember-decide-button is-secondary" onClick={onExit}>Exit</button>
            </div>
            <p className="remember-decide-live-status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
        </section>
    );
}

export interface RememberDecideProps {
    readonly onExit: () => void;
}

export default function RememberDecide({ onExit }: RememberDecideProps) {
    const game = useRememberDecide(onExit);
    const view = game.view;
    const active = view.phase === 'location'
        || view.phase === 'location-blank'
        || view.phase === 'decision'
        || view.phase === 'decision-blank'
        || view.phase === 'recall';

    if (view.phase === 'interrupted') {
        return (
            <Interrupted
                status={view.status}
                onRestart={() => game.restart(view.generation)}
                onSetup={() => game.setup(view.generation)}
                onExit={() => game.exit(view.generation)}
            />
        );
    }

    return (
        <section className="remember-decide" aria-label="Remember and Decide" onKeyDownCapture={suppressRepeatedActivation}>
            <header className="remember-decide-header">
                <h1>Remember &amp; Decide</h1>
                <div>
                    {active && <button type="button" data-persistent-control="pause" className="remember-decide-button is-quiet" onClick={() => game.interrupt(view.generation)}>Pause</button>}
                    <button type="button" data-persistent-control="exit" className="remember-decide-button is-quiet" onClick={() => game.exit(view.generation)}>Exit</button>
                </div>
            </header>

            {view.phase === 'setup' && (() => {
                const validation = validateConfig(view.config);
                return <Setup config={view.config} error={view.error ?? (validation.ok ? null : validation.error.message)} onChange={(config) => game.configure(view.generation, config)} onStart={() => game.start(view.generation)} />;
            })()}
            {view.phase === 'location' && (
                <Location
                    key={`${view.generation}:location:${view.itemIndex}`}
                    location={view.location}
                    itemIndex={view.itemIndex}
                    itemCount={view.itemCount}
                    onMounted={() => game.mountPhase(view.generation, view.phase, view.itemIndex)}
                />
            )}
            {(view.phase === 'location-blank' || view.phase === 'decision-blank') && (
                <TimedBlank
                    key={`${view.generation}:${view.phase}:${view.itemIndex}`}
                    phase={view.phase}
                    status={view.status}
                    onMounted={() => game.mountPhase(view.generation, view.phase, view.itemIndex)}
                />
            )}
            {view.phase === 'decision' && (
                <SymmetryDecision
                    key={`${view.generation}:decision:${view.itemIndex}`}
                    pattern={view.pattern}
                    itemIndex={view.itemIndex}
                    itemCount={view.itemCount}
                    deadlineMs={view.deadlineMs}
                    onMounted={() => game.mountPhase(view.generation, view.phase, view.itemIndex)}
                    onAnswer={(answer) => game.answer(view.generation, view.itemIndex, answer)}
                />
            )}
            {view.phase === 'recall' && (
                <Recall generation={view.generation} sequenceLength={view.sequenceLength} recalled={view.recalled} onRemember={game.remember} onUndo={game.undo} onClear={game.clear} onSubmit={game.submit} />
            )}
            {view.phase === 'result' && (
                <Result round={view.round} score={view.score} onNewRound={() => game.start(view.generation)} onTryNextLength={() => game.tryNextLength(view.generation)} onSetup={() => game.setup(view.generation)} onExit={() => game.exit(view.generation)} />
            )}

            {view.phase !== 'setup' && view.phase !== 'result' && (
                <p className="remember-decide-live-status" role="status" aria-live="polite" aria-atomic="true">{view.status}</p>
            )}
        </section>
    );
}
