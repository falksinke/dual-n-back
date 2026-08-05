import { useEffect, useState, type CSSProperties } from 'react';
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
    /** When thumbs are linked, move both bounds together. */
    onBothChange: (ms: number) => void;
}

const span = ISI_ABSOLUTE_MAX_MS - ISI_ABSOLUTE_MIN_MS;

const toPercent = (ms: number) => ((ms - ISI_ABSOLUTE_MIN_MS) / span) * 100;

const IsiRangeSlider = ({
    minMs,
    maxMs,
    onMinChange,
    onMaxChange,
    onBothChange,
}: IsiRangeSliderProps) => {
    const left = toPercent(minMs);
    const right = toPercent(maxMs);
    const aligned = minMs === maxMs;
    /** Keep the last-touched thumb on top so equal thumbs can still be separated. */
    const [activeThumb, setActiveThumb] = useState<'min' | 'max'>('max');
    /** After double-click while aligned, drag moves min and max together. */
    const [linked, setLinked] = useState(false);

    useEffect(() => {
        if (!aligned) setLinked(false);
    }, [aligned]);

    const armOrToggleLink = () => {
        if (!aligned) return;
        setLinked((value) => !value);
    };

    const handleMinChange = (next: number) => {
        if (linked && aligned) {
            onBothChange(next);
            return;
        }
        onMinChange(next);
    };

    const handleMaxChange = (next: number) => {
        if (linked && aligned) {
            onBothChange(next);
            return;
        }
        onMaxChange(next);
    };

    return (
        <div className={`isi-slider${linked && aligned ? ' is-linked' : ''}`}>
            <div className="isi-slider-readout" aria-live="polite">
                <span>{msToSecondsLabel(minMs)}s</span>
                <span className="isi-slider-readout-sep">–</span>
                <span>{msToSecondsLabel(maxMs)}s</span>
            </div>
            {aligned && (
                <p className="isi-slider-link-hint">
                    {linked ? 'Linked — drag moves both' : 'Double-click thumb to drag both'}
                </p>
            )}

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
                    className={[
                        'isi-slider-thumb',
                        'isi-slider-thumb--min',
                        activeThumb === 'min' ? 'is-active' : '',
                        linked && aligned ? 'is-linked' : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    type="range"
                    min={ISI_ABSOLUTE_MIN_MS}
                    max={ISI_ABSOLUTE_MAX_MS}
                    step={ISI_STEP_MS}
                    value={minMs}
                    aria-label="ISI minimum seconds"
                    aria-pressed={linked && aligned}
                    onPointerDown={() => setActiveThumb('min')}
                    onDoubleClick={armOrToggleLink}
                    onChange={(e) => handleMinChange(Number(e.target.value))}
                />
                <input
                    className={[
                        'isi-slider-thumb',
                        'isi-slider-thumb--max',
                        activeThumb === 'max' ? 'is-active' : '',
                        linked && aligned ? 'is-linked' : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    type="range"
                    min={ISI_ABSOLUTE_MIN_MS}
                    max={ISI_ABSOLUTE_MAX_MS}
                    step={ISI_STEP_MS}
                    value={maxMs}
                    aria-label="ISI maximum seconds"
                    aria-pressed={linked && aligned}
                    onPointerDown={() => setActiveThumb('max')}
                    onDoubleClick={armOrToggleLink}
                    onChange={(e) => handleMaxChange(Number(e.target.value))}
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
