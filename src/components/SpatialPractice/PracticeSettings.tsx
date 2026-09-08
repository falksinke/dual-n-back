import { INTERFERENCE_CHANCE_OPTIONS } from '../../model/interference';

interface PracticeSettingsProps {
    length: number;
    onLengthChange: (value: number) => void;
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
        { label: 'New sequence after a correct route', value: props.newSequence, change: props.onNewSequenceChange },
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
                Higher interference can bring recent locations into a new route.
            </p>
            {toggles.map(({ label, value, change }) => (
                <label key={label} className="spatial-practice__sequence-option">
                    <input type="checkbox" checked={value} onChange={(event) => change(event.target.checked)} />
                    <span>{label}</span>
                </label>
            ))}
        </fieldset>
    );
}
