import type { KeyboardEvent } from 'react';
import { validateConfig } from '../../model/swapping';
import Setup from './Setup';
import Board from './Board';
import Instruction from './Instruction';
import Answer from './Answer';
import Result from './Result';
import AudioEncoding from './AudioEncoding';
import RailwayScene from './RailwayScene';
import { RailwayBadge } from './RailwayArt';
import { useSwapping } from './useSwapping';
import './Swapping.scss';

function suppressRepeatedActivation(event: KeyboardEvent<HTMLElement>) {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        event.stopPropagation();
    }
}

export default function Swapping({ onExit }: { onExit: () => void }) {
    const game = useSwapping(onExit);
    const view = game.view;

    // Pause has no config, count, instruction, mark, placement or result in its
    // projection. Return before creating any task UI, including decorative bays.
    if (view.phase === 'paused') {
        return (
            <section className="swapping swapping-paused" aria-label="Midnight Shunting paused" onKeyDownCapture={suppressRepeatedActivation}>
                <header className="swapping-heading">
                    <p className="swapping-eyebrow">Northline goods station</p>
                    <h1>The yard can wait.</h1>
                    <p>Your round is paused. All task material is put away.</p>
                </header>
                <RailwayScene mood="paused" message="A moment of quiet on the platform." />
                <div className="swapping-controls">
                    <button type="button" className="swapping-button is-primary" autoFocus onClick={game.resume}>Resume</button>
                    <button type="button" className="swapping-button is-secondary" onClick={game.exit}>Exit</button>
                </div>
            </section>
        );
    }

    return (
        <section className="swapping" aria-label="Midnight Shunting game" onKeyDownCapture={suppressRepeatedActivation}>
            <header className="swapping-header">
                <div className="swapping-brand">
                    <RailwayBadge />
                    <div><h1>Midnight Shunting</h1><p>Swapping / working memory</p></div>
                </div>
                <button type="button" className="swapping-button is-quiet" onClick={game.exit}>Exit</button>
            </header>
            {view.phase === 'setup' && (() => {
                const valid = validateConfig(view.config);
                return <Setup config={view.config} onChange={game.configure} onStart={game.start}
                    onSample={game.sample} sampleStatus={game.sampleStatus}
                    validationError={view.error ?? (valid.ok ? undefined : valid.error.message)} />;
            })()}
            {view.phase === 'encode-visual' && (
                <section className="swapping-play swapping-memorise" aria-labelledby="swapping-memorise-title">
                    <div className="swapping-play__topline">
                        <span>01 / Cargo inspection</span>
                        <button type="button" className="swapping-button is-quiet" onClick={game.pause}>Pause</button>
                    </div>
                    <header className="swapping-section-heading">
                        <h2 id="swapping-memorise-title">Remember every mark. And its bay.</h2>
                        <p>Look as long as you need. Ready closes the covers and starts the radio instructions.</p>
                    </header>
                    <RailwayScene mood="memorise" message="Remember the marks, not the crates. Matching marks are interchangeable.">
                        <Board config={view.config} tokens={view.tokens} ariaLabel="Starting arrangement" />
                    </RailwayScene>
                    <div className="swapping-action-strip">
                        <p>Positions stay fixed. All changes happen in your head.</p>
                        <button type="button" className="swapping-button is-primary" autoFocus onClick={game.ready}>Ready</button>
                    </div>
                </section>
            )}
            {view.phase === 'encode-audio' && <AudioEncoding config={view.config}
                status={view.status === 'complete' ? 'ready' : view.status === 'error' ? 'error' : 'playing'}
                currentIndex={view.currentIndex} replayCount={Math.max(0, view.passes - 1)} error={view.error ?? undefined}
                onReady={game.ready} onReplay={game.playEncoding} onRetry={game.playEncoding}
                onBack={game.setup} onPause={game.pause} />}
            {view.phase === 'manipulate' && <Instruction config={view.config} card={view.card}
                cardIndex={view.cardIndex} cardCount={view.cardCount}
                onDone={() => game.send({ type: 'next', cardIndex: view.cardIndex })} onPause={game.pause} />}
            {view.phase === 'answer' && <Answer config={view.config}
                slots={view.slots.map((token) => token ?? undefined)} activeIndex={view.activeIndex}
                palette={view.palette} onSelect={(index) => game.send({ type: 'select', index })}
                onPlace={(entry) => game.send({ type: 'place', key: entry.key, activeIndex: view.activeIndex })}
                onClear={(index) => { game.send({ type: 'select', index }); game.send({ type: 'clear' }); }}
                onSubmit={() => game.send({ type: 'submit' })} onPause={game.pause} />}
            {view.phase === 'result' && <Result round={view.round} score={view.score}
                onNewRound={game.start} onSetup={game.setup} />}
            <footer className="swapping-footer"><span>Northline goods station</span><span>One arrangement at a time.</span></footer>
        </section>
    );
}
