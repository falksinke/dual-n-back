import type { ThemeMode } from '../../themes/config';
import './TrainerHome.scss';

export type TrainingMode = 'nback' | 'spatial' | 'swapping' | 'remember-decide';

const modes: { id: TrainingMode; title: string; focus: string; description: string }[] = [
    { id: 'nback', title: 'N-back', focus: 'Track and update', description: 'Follow a stream of items and spot matches from earlier in the sequence.' },
    { id: 'swapping', title: 'Midnight Shunting', focus: 'Hold and transform', description: 'The Swapping exercise, in a miniature railway yard. Remember cargo marks, follow mental shunting instructions, then rebuild the order.' },
    { id: 'spatial', title: 'Firefly Post', focus: 'Spatial sequence', description: 'Watch a firefly light the village windows, then deliver letters in the same order from memory.' },
    { id: 'remember-decide', title: 'The Moth Keeper', focus: 'Remember and inspect', description: 'Remember firefly landing places in a night greenhouse while inspecting moth markings for vertical symmetry.' },
];

export default function TrainerHome({ onSelect, themeMode, onToggleTheme }: {
    onSelect: (mode: TrainingMode) => void;
    themeMode: ThemeMode;
    onToggleTheme: () => void;
}) {
    return <main className="trainer-home">
        <div className="trainer-home__content">
            <header>
                <p className="trainer-home__eyebrow">Working Memory Trainer</p>
                <h1>Choose your practice</h1>
                <p>Keep information in mind. Work with it. Recall it.</p>
            </header>
            <nav aria-label="Training modes">
                {modes.map((mode, index) => <button key={mode.id} type="button"
                    className="trainer-home__mode" onClick={() => onSelect(mode.id)}
                    aria-labelledby={`${mode.id}-title`} aria-describedby={`${mode.id}-description`}
                    autoFocus={index === 0}>
                    <span className="trainer-home__focus">{mode.focus}</span>
                    <span className="trainer-home__name" id={`${mode.id}-title`}>{mode.title}<span aria-hidden="true">→</span></span>
                    <span id={`${mode.id}-description`}>{mode.description}</span>
                </button>)}
            </nav>
            <footer>
                <p>Each mode has its own settings. Your N-back history stays with N-back.</p>
                <button type="button" onClick={onToggleTheme}
                    aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}>
                    {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
            </footer>
        </div>
    </main>;
}
