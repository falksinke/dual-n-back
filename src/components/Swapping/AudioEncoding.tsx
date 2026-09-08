import type { SwappingConfig } from '../../model/swapping/types';
import Board from './Board';
import RailwayScene from './RailwayScene';
import { RadioArt } from './RailwayArt';

export type AudioEncodingStatus = 'playing' | 'ready' | 'error';

export interface AudioEncodingProps {
    config: SwappingConfig;
    status: AudioEncodingStatus;
    currentIndex?: number;
    error?: string;
    replayCount?: number;
    onReady: () => void;
    onReplay: () => void;
    onRetry: () => void;
    onBack: () => void;
    onPause: () => void;
}

export default function AudioEncoding({
    config,
    status,
    currentIndex,
    error,
    replayCount = 0,
    onReady,
    onReplay,
    onRetry,
    onBack,
    onPause,
}: AudioEncodingProps) {
    const heard = status === 'ready' ? config.length : Math.max(0, (currentIndex ?? -1) + 1);
    const isPlaying = status === 'playing';

    return (
        <section className="swapping-play swapping-audio" aria-labelledby="swapping-audio-title">
            <div className="swapping-play__topline">
                <span>01 / Playback pass {replayCount + 1}</span>
                <button type="button" className="swapping-button is-quiet" onClick={onPause}>
                    Pause
                </button>
            </div>
            <header className="swapping-section-heading">
                <p className="swapping-eyebrow">Spoken-letter cargo · audio only</p>
                <h2 id="swapping-audio-title">
                    {status === 'error' ? 'The radio needs a moment.' : 'Listen to every numbered bay.'}
                </h2>
                <p>
                    {isPlaying
                        ? 'Keep each spoken letter in its numbered position. Every clip will play in full.'
                        : status === 'ready'
                          ? 'The full pass is finished. Replay if needed, or choose Ready for your first dispatch.'
                          : 'No letter was recorded as an answer. Retry this playback or return to setup.'}
                </p>
            </header>

            <RailwayScene mood={status === 'error' ? 'error' : 'audio'}
                message={status === 'error' ? 'No cargo has been scored. Retry the radio, or start again from the dispatch desk.' : 'Listen for the mark. The covers stay closed throughout spoken-letter encoding.'}>
                <Board config={config} concealed ariaLabel="Covered numbered audio positions" />
            </RailwayScene>
            <div className="swapping-radio swapping-radio--audio">
                <RadioArt />
                <div className="swapping-audio__progress" aria-live="polite">
                    <p className="swapping-eyebrow">{status === 'ready' ? 'Transmission complete' : status === 'error' ? 'Transmission interrupted' : 'Receiving cargo marks'}</p>
                    <progress max={config.length} value={heard} aria-label="Audio sequence progress" />
                    <span>
                        {status === 'ready' ? `${config.length} of ${config.length} positions received`
                            : heard === 0 ? 'Waiting for the first position…'
                            : `Position ${heard} of ${config.length}` }
                    </span>
                </div>
            </div>

            {status === 'error' ? (
                <>
                    <p className="swapping-error" role="alert">
                        {error ?? 'The audio could not be played.'}
                    </p>
                    <div className="swapping-controls">
                        <button type="button" className="swapping-button is-primary" autoFocus onClick={onRetry}>
                            Retry
                        </button>
                        <button type="button" className="swapping-button is-secondary" onClick={onBack}>
                            Back to setup
                        </button>
                    </div>
                </>
            ) : (
                <div className="swapping-controls">
                    <button
                        type="button"
                        className="swapping-button is-primary"
                        onClick={onReady}
                        disabled={isPlaying}
                    >
                        Ready
                    </button>
                    <button
                        type="button"
                        className="swapping-button is-secondary"
                        onClick={onReplay}
                        disabled={isPlaying}
                    >
                        Replay
                    </button>
                </div>
            )}
        </section>
    );
}
