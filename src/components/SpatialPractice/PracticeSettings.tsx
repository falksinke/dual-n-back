import { INTERFERENCE_CHANCE_OPTIONS } from '../../model/interference';
import type { HiddenPlacement } from './sequence';

interface PracticeSettingsProps {
    length: number;
    onLengthChange: (value: number) => void;
    endback: boolean;
    onEndbackChange: (value: boolean) => void;
    hiddenCount: number;
    onHiddenCountChange: (value: number) => void;
    hiddenPlacement: HiddenPlacement;
    onHiddenPlacementChange: (value: HiddenPlacement) => void;
    newSequence: boolean;
    onNewSequenceChange: (value: boolean) => void;
    increaseSpeed: boolean;
    onIncreaseSpeedChange: (value: boolean) => void;
    interference: number;
    onInterferenceChange: (value: number) => void;
    mathEnabled: boolean;
    onMathEnabledChange: (value: boolean) => void;
    disabled: boolean;
}

const FRACTIONS = ['Off', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞', '1'];

export default function PracticeSettings(props: PracticeSettingsProps) {
    const toggles = [
        { label: 'Increase speed after a correct route', value: props.increaseSpeed, change: props.onIncreaseSpeedChange },
        { label: 'Postage maths before recall', value: props.mathEnabled, change: props.onMathEnabledChange },
    ];
    return (
        <fieldset className="spatial-practice__options" disabled={props.disabled}>
            <legend>Dispatch settings</legend>
            <div className="spatial-practice__settings">
                <label htmlFor="spatial-sequence-length">Sequence length</label>
                <select id="spatial-sequence-length" value={props.length}
                    onChange={(event) => props.onLengthChange(Number(event.target.value))}>
                    {Array.from({ length: 9 }, (_, index) => index + 1).map((value) => (
                        <option key={value} value={value}>{value}</option>
                    ))}
                </select>
            </div>
            <label className="spatial-practice__sequence-option">
                <input type="checkbox" checked={props.endback}
                    onChange={(event) => props.onEndbackChange(event.target.checked)} />
                <span>Endback mode · shift the route after each correct delivery</span>
            </label>
            {props.endback && <>
                <div className="spatial-practice__settings">
                    <label htmlFor="spatial-hidden-count">Hidden stops</label>
                    <select id="spatial-hidden-count" value={Math.min(props.hiddenCount, props.length - 1)}
                        onChange={(event) => props.onHiddenCountChange(Number(event.target.value))}>
                        {Array.from({ length: props.length }, (_, value) => (
                            <option key={value} value={value}>{value}</option>
                        ))}
                    </select>
                </div>
                <div className="spatial-practice__settings">
                    <label htmlFor="spatial-hidden-placement">Hide</label>
                    <select id="spatial-hidden-placement" value={props.hiddenPlacement}
                        onChange={(event) => props.onHiddenPlacementChange(event.target.value as HiddenPlacement)}>
                        <option value="first">First stops</option>
                        <option value="random">Random</option>
                    </select>
                </div>
                <p className="spatial-practice__setting-help">
                    The first route is fully visible. Later, remember hidden stops and deliver the whole route. The new last stop stays visible.
                </p>
            </>}
            <div className="spatial-practice__settings">
                <label htmlFor="spatial-interference">Interference</label>
                <select id="spatial-interference" value={props.interference} aria-describedby="spatial-interference-help"
                    onChange={(event) => props.onInterferenceChange(Number(event.target.value))}>
                    {INTERFERENCE_CHANCE_OPTIONS.map((value, index) => (
                        <option key={value} value={value}>{FRACTIONS[index]}</option>
                    ))}
                </select>
            </div>
            <p id="spatial-interference-help" className="spatial-practice__setting-help">
                {props.endback
                    ? 'Higher interference can reuse a recent location for the new last stop.'
                    : 'Higher interference can bring recent locations into a new route.'}
            </p>
            {!props.endback && <label className="spatial-practice__sequence-option">
                <input type="checkbox" checked={props.newSequence}
                    onChange={(event) => props.onNewSequenceChange(event.target.checked)} />
                <span>New sequence after a correct route</span>
            </label>}
            {toggles.map(({ label, value, change }) => (
                <label key={label} className="spatial-practice__sequence-option">
                    <input type="checkbox" checked={value} onChange={(event) => change(event.target.checked)} />
                    <span>{label}</span>
                </label>
            ))}
        </fieldset>
    );
}
