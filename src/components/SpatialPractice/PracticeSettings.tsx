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
        { label: 'New sequence after each correct recall', value: props.newSequence, change: props.onNewSequenceChange },
        { label: 'Increase speed after correct recall', value: props.increaseSpeed, change: props.onIncreaseSpeedChange },
        { label: 'Math problem before recall', value: props.mathEnabled, change: props.onMathEnabledChange },
    ];
    return (
        <fieldset className="spatial-practice__options" disabled={props.disabled}>
            <legend>Practice settings</legend>
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
                <select id="spatial-interference" value={props.interference}
                    onChange={(event) => props.onInterferenceChange(Number(event.target.value))}>
                    {INTERFERENCE_CHANCE_OPTIONS.map((value, index) => (
                        <option key={value} value={value}>{FRACTIONS[index]}</option>
                    ))}
                </select>
            </div>
            {toggles.map(({ label, value, change }) => (
                <label key={label} className="spatial-practice__sequence-option">
                    <input type="checkbox" checked={value} onChange={(event) => change(event.target.checked)} />
                    {label}
                </label>
            ))}
        </fieldset>
    );
}
