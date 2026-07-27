import { useState } from 'react';
import { useGameStore } from './store/gameStore';
import Board from './components/Board';
import Topbar from './components/Topbar';
import './App.scss';
import Footer from './components/Footer';
import { useThemeVariables } from './hooks/useThemeVariables';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import UserMatchNotice from './components/utils/UserMatchNotice';
import { DefaultDrakTheme } from './themes/DefaultDark';
import { DefaultLightTheme } from './themes/DefaultLight';
import type { ThemeMode } from './themes/config';

const App = () => {
    const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
    useThemeVariables(themeMode === 'dark' ? DefaultDrakTheme : DefaultLightTheme, themeMode);
    useKeyboardControls();

    const game = useGameStore((state) => state.game);
    const level = useGameStore((state) => state.settings.level);
    const variableN = useGameStore((state) => state.settings.variableN);
    const configuredTrials = useGameStore((state) => state.settings.trials);
    const currentTrials = useGameStore((state) => state.boardState.currentTrials);
    const nForTrial = useGameStore((state) => state.boardState.nForTrial);
    const trialsShown = game !== null ? currentTrials : configuredTrials;

    return (
        <div className={`app-container${game !== null ? ' playing' : ''}`}>
            <div className="app">
                {game === null && <Topbar />}
                <div className="session-status" aria-live="polite">
                    <div className="session-status-item">
                        <span className="session-status-label">Level</span>
                        <span className="session-status-value">{level}</span>
                    </div>
                    {game !== null && variableN && (
                        <div className="session-status-item">
                            <span className="session-status-label">N</span>
                            <span className="session-status-value">{nForTrial}</span>
                        </div>
                    )}
                    <div className="session-status-item">
                        <span className="session-status-label">Trials</span>
                        <span className="session-status-value">{trialsShown}</span>
                    </div>
                </div>
                <Board />
                {game === null && (
                    <Footer
                        themeMode={themeMode}
                        onToggleTheme={() => setThemeMode((mode) => (mode === 'dark' ? 'light' : 'dark'))}
                    />
                )}
                {game !== null && <UserMatchNotice />}
            </div>
        </div>
    );
};

export default App;
