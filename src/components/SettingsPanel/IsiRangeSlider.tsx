import type { CSSProperties } from 'react';
import {
    ISI_ABSOLUTE_MAX_MS,
    ISI_ABSOLUTE_MIN_MS,
    ISI_STEP_MS,
    msToSecondsLabel,
} from '../../model/isi';

interface IsiRangeSliderProps {
    minMs: number;
    maxMs: number;
    onMinChange: (ms: number) => void;
    onMaxChange: (ms: number) => void;
}

const span = ISI_ABSOLUTE_MAX_MS - ISI_ABSOLUTE_MIN_MS;

const toPercent = (ms: number) => ((ms - ISI_ABSOLUTE_MIN_MS) / span) * 100;

const IsiRangeSlider = ({ minMs, maxMs, onMinChange, onMaxChange }: IsiRangeSliderProps) => {
    const left = toPercent(minMs);
    const right = toPercent(maxMs);

    return (
        <div className="isi-slider">
            <div className="isi-slider-readout" aria-live="polite">
                <span>{msToSecondsLabel(minMs)}s</span>
                <span className="isi-slider-readout-sep">–</span>
                <span>{msToSecondsLabel(maxMs)}s</span>
            </div>

            <div
                className="isi-slider-control"
                style={
                    {
                        '--isi-left': `${left}%`,
                        '--isi-right': `${right}%`,
                    } as CSSProperties
                }
            >
                <div className="isi-slider-rail" aria-hidden="true" />
                <div className="isi-slider-fill" aria-hidden="true" />

                <input
                    className="isi-slider-thumb isi-slider-thumb--min"
                    type="range"
                    min={ISI_ABSOLUTE_MIN_MS}
                    max={ISI_ABSOLUTE_MAX_MS}
                    step={ISI_STEP_MS}
                    value={minMs}
                    aria-label="ISI minimum seconds"
                    onChange={(e) => {
                        const next = Number(e.target.value);
                        onMinChange(Math.min(next, maxMs));
                    }}
                />
                <input
                    className="isi-slider-thumb isi-slider-thumb--max"
                    type="range"
                    min={ISI_ABSOLUTE_MIN_MS}
                    max={ISI_ABSOLUTE_MAX_MS}
                    step={ISI_STEP_MS}
                    value={maxMs}
                    aria-label="ISI maximum seconds"
                    onChange={(e) => {
                        const next = Number(e.target.value);
                        onMaxChange(Math.max(next, minMs));
                    }}
                />
            </div>

            <div className="isi-slider-bounds" aria-hidden="true">
                <span>{msToSecondsLabel(ISI_ABSOLUTE_MIN_MS)}s</span>
                <span>{msToSecondsLabel(ISI_ABSOLUTE_MAX_MS)}s</span>
            </div>
        </div>
    );
};

export default IsiRangeSlider;
