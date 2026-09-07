import type { SwappingConfig } from '../../model/swapping/types';
import Board from './Board';

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
                <span>Playback pass {replayCount + 1}</span>
                <button type="button" className="swapping-button is-quiet" onClick={onPause}>
                    Pause
                </button>
            </div>
            <header className="swapping-section-heading">
                <p className="swapping-eyebrow">Spoken-letter sequence</p>
                <h2 id="swapping-audio-title">
                    {status === 'error' ? 'Playback stopped' : 'Listen to every position'}
                </h2>
                <p>
                    {isPlaying
                        ? 'Keep each letter in its numbered position.'
                        : status === 'ready'
                          ? 'Replay if needed, or hide the sequence when you are ready.'
                          : 'No letter was recorded as an answer. Retry this playback or return to setup.'}
                </p>
            </header>

            <Board config={config} tokens={[]} ariaLabel="Empty numbered audio positions" />

            <div className="swapping-audio__progress" aria-live="polite">
                <progress max={config.length} value={heard} aria-label="Audio sequence progress" />
                <span>
                    {heard} of {config.length} positions played
                </span>
            </div>

            {status === 'error' ? (
                <>
                    <p className="swapping-error" role="alert">
                        {error ?? 'The audio could not be played.'}
                    </p>
                    <div className="swapping-controls">
                        <button type="button" className="swapping-button is-primary" onClick={onRetry}>
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
