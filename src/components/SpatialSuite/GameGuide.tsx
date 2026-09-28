import { SHIFT_RULES, RULE_LABELS, type ShiftRule } from '../../model/spatialSuite/games/shift';
import type { TrackId } from '../../model/spatialSuite/types';
import { GUIDES, RULE_GUIDES } from './guides';

const ROWS = [
    ['see', 'What you see'],
    ['match', 'Press Match when'],
    ['example', 'Example'],
    ['watch', 'Watch out for'],
    ['why', 'What it trains'],
] as const;

/** Full explanation of one game track; Shift also lists its rules. */
export default function GameGuide({ track, rules = SHIFT_RULES }: { track: TrackId; rules?: ShiftRule[] }) {
    const guide = GUIDES[track];
    return (
        <dl className="suite-guide">
            {ROWS.map(([key, label]) => (
                <div key={key}>
                    <dt>{label}</dt>
                    <dd>{guide[key]}</dd>
                    {track === 'shift' && key === 'match' && (
                        <dd>
                            <ul className="suite-rules">
                                {rules.map((rule) => (
                                    <li key={rule}><strong>{RULE_LABELS[rule].name}</strong> {RULE_GUIDES[rule]}</li>
                                ))}
                            </ul>
                        </dd>
                    )}
                </div>
            ))}
        </dl>
    );
}
