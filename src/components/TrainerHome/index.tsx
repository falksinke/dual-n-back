import type { ThemeMode } from '../../themes/config';
import './TrainerHome.scss';

export type TrainingMode = 'nback' | 'spatial' | 'swapping' | 'remember-decide';

const modes: { id: TrainingMode; title: string; focus: string; description: string }[] = [
    { id: 'nback', title: 'N-back', focus: 'Track and update', description: 'Follow a stream of items and spot matches from earlier in the sequence.' },
    { id: 'swapping', title: 'Swapping', focus: 'Hold and transform', description: 'Remember an arrangement, apply changes in your head, then rebuild the result.' },
    { id: 'spatial', title: 'Spatial sequence', focus: 'Remember locations', description: 'Recall locations in order. Adjust the pace or add a maths challenge before recall.' },
    { id: 'remember-decide', title: 'Remember & Decide', focus: 'Spatial complex span', description: 'Remember locations while making a separate symmetry decision after each one.' },
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
