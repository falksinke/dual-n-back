import type { KeyboardEvent } from 'react';
import { validateConfig } from '../../model/rememberDecide';
import Interrupted from './Interrupted';
import Location from './Location';
import Recall from './Recall';
import Result from './Result';
import Setup from './Setup';
import SymmetryDecision from './SymmetryDecision';
import TimedBlank from './TimedBlank';
import { MothEmblem } from './art/MothArtwork';
import { useRememberDecide } from './useRememberDecide';
import './RememberDecide.scss';

function suppressRepeatedActivation(event: KeyboardEvent<HTMLElement>): void {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        event.stopPropagation();
    }
}

export interface RememberDecideProps {
    readonly onExit: () => void;
}

export default function RememberDecide({ onExit }: RememberDecideProps) {
    const game = useRememberDecide(onExit);
    // All presentation, including scenery children, stays downstream of this projection.
    const view = game.view;
    const active = view.phase === 'location'
        || view.phase === 'location-blank'
        || view.phase === 'decision'
        || view.phase === 'decision-blank'
        || view.phase === 'recall';

    if (view.phase === 'interrupted') {
        return (
            <section className="remember-decide" aria-label="The Moth Keeper" onKeyDownCapture={suppressRepeatedActivation}>
                <Interrupted status={view.status} onRestart={() => game.restart(view.generation)} onSetup={() => game.setup(view.generation)} onExit={() => game.exit(view.generation)} />
            </section>
        );
    }

    return (
        <section className="remember-decide" aria-label="The Moth Keeper" onKeyDownCapture={suppressRepeatedActivation}>
            <header className="remember-decide-header">
                <div className="moth-brand">
                    <span className="moth-brand__emblem" aria-hidden="true"><MothEmblem /></span>
                    <div><h1>The Moth Keeper</h1><p>A little memory work after dark</p></div>
                </div>
                <div className="remember-decide-header__actions">
                    {active && <button type="button" data-persistent-control="pause" className="remember-decide-button is-quiet" onClick={() => game.interrupt(view.generation)}>Pause</button>}
                    <button type="button" data-persistent-control="exit" className="remember-decide-button is-quiet" onClick={() => game.exit(view.generation)}>Exit</button>
                </div>
            </header>
            {view.phase === 'setup' && (() => {
                const validation = validateConfig(view.config);
                return <Setup config={view.config} error={view.error ?? (validation.ok ? null : validation.error.message)} onChange={(config) => game.configure(view.generation, config)} onStart={() => game.start(view.generation)} />;
            })()}
            {view.phase === 'location' && (
                <Location key={`${view.generation}:location:${view.itemIndex}`} location={view.location} itemIndex={view.itemIndex} itemCount={view.itemCount}
                    onMounted={() => game.mountPhase(view.generation, view.phase, view.itemIndex)} />
            )}
            {(view.phase === 'location-blank' || view.phase === 'decision-blank') && (
                <TimedBlank key={`${view.generation}:${view.phase}:${view.itemIndex}`} phase={view.phase} status={view.status}
                    onMounted={() => game.mountPhase(view.generation, view.phase, view.itemIndex)} />
            )}
            {view.phase === 'decision' && (
                <SymmetryDecision key={`${view.generation}:decision:${view.itemIndex}`} pattern={view.pattern} itemIndex={view.itemIndex} itemCount={view.itemCount} deadlineMs={view.deadlineMs}
                    onMounted={() => game.mountPhase(view.generation, view.phase, view.itemIndex)} onAnswer={(answer) => game.answer(view.generation, view.itemIndex, answer)} />
            )}
            {view.phase === 'recall' && <Recall generation={view.generation} sequenceLength={view.sequenceLength} recalled={view.recalled}
                onRemember={game.remember} onUndo={game.undo} onClear={game.clear} onSubmit={game.submit} />}
            {view.phase === 'result' && <Result round={view.round} score={view.score} onNewRound={() => game.start(view.generation)}
                onTryNextLength={() => game.tryNextLength(view.generation)} onSetup={() => game.setup(view.generation)} onExit={() => game.exit(view.generation)} />}
            {view.phase !== 'setup' && <p className="remember-decide-live-status" role="status" aria-live="polite" aria-atomic="true">{view.status}</p>}
        </section>
    );
}
