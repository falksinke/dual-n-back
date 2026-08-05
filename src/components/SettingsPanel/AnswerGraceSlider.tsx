import type { CSSProperties } from 'react';
import {
    ANSWER_GRACE_MAX_MS,
    ANSWER_GRACE_MIN_MS,
    ANSWER_GRACE_STEP_MS,
} from '../../model/isi';

interface AnswerGraceSliderProps {
    valueMs: number;
    onChange: (ms: number) => void;
}

const span = ANSWER_GRACE_MAX_MS - ANSWER_GRACE_MIN_MS;

const toPercent = (ms: number) =>
    span <= 0 ? 0 : ((ms - ANSWER_GRACE_MIN_MS) / span) * 100;

const AnswerGraceSlider = ({ valueMs, onChange }: AnswerGraceSliderProps) => {
    const fill = toPercent(valueMs);

    return (
        <div className="isi-slider answer-grace-slider">
            <div className="isi-slider-readout" aria-live="polite">
                <span>{valueMs} ms</span>
            </div>

            <div
                className="isi-slider-control"
                style={
                    {
                        '--isi-left': '0%',
                        '--isi-right': `${fill}%`,
                    } as CSSProperties
                }
            >
                <div className="isi-slider-rail" aria-hidden="true" />
                <div className="isi-slider-fill" aria-hidden="true" />

                <input
                    className="isi-slider-thumb isi-slider-thumb--max"
                    type="range"
                    min={ANSWER_GRACE_MIN_MS}
                    max={ANSWER_GRACE_MAX_MS}
                    step={ANSWER_GRACE_STEP_MS}
                    value={valueMs}
                    aria-label="Answer leeway milliseconds"
                    onChange={(e) => onChange(Number(e.target.value))}
                />
            </div>

            <div className="isi-slider-bounds" aria-hidden="true">
                <span>{ANSWER_GRACE_MIN_MS} ms</span>
                <span>{ANSWER_GRACE_MAX_MS} ms</span>
            </div>
        </div>
    );
};

export default AnswerGraceSlider;
