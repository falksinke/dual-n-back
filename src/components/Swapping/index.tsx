import type { KeyboardEvent } from 'react';
import { validateConfig } from '../../model/swapping';
import Setup from './Setup';
import Board from './Board';
import Instruction from './Instruction';
import Answer from './Answer';
import Result from './Result';
import AudioEncoding from './AudioEncoding';
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

    // Returning early removes every board, instruction and answer from the DOM.
    if (view.phase === 'paused') {
        return <section className="swapping swapping-paused" aria-label="Swapping paused" onKeyDownCapture={suppressRepeatedActivation}>
            <button type="button" autoFocus onClick={game.resume}>Resume</button>
            <button type="button" onClick={game.exit}>Exit</button>
        </section>;
    }

    return <section className="swapping" aria-label="Swapping game" onKeyDownCapture={suppressRepeatedActivation}>
        <header className="swapping-header">
            <h1>Swapping</h1>
            <button type="button" onClick={game.exit}>Exit</button>
        </header>
        {view.phase === 'setup' && (() => {
            const valid = validateConfig(view.config);
            return <Setup config={view.config} onChange={game.configure} onStart={game.start}
                onSample={game.sample} sampleStatus={game.sampleStatus}
                validationError={view.error ?? (valid.ok ? undefined : valid.error.message)} />;
        })()}
        {view.phase === 'encode-visual' && <>
            <h2>Remember this arrangement</h2>
            <p>When you are ready, hide it and follow each instruction in your head.</p>
            <Board config={view.config} tokens={view.tokens} ariaLabel="Starting arrangement" />
            <div className="swapping-actions">
                <button type="button" onClick={game.ready}>Ready</button>
                <button type="button" onClick={game.pause}>Pause</button>
            </div>
        </>}
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
    </section>;
}
