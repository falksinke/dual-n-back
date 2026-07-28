import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import Board from './components/Board';
import Topbar from './components/Topbar';
import './App.scss';
import Footer from './components/Footer';
import { useThemeVariables } from './hooks/useThemeVariables';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import UserMatchNotice from './components/utils/UserMatchNotice';
import CountdownFlash from './components/CountdownFlash';
import { DefaultDrakTheme } from './themes/DefaultDark';
import { DefaultLightTheme } from './themes/DefaultLight';
import type { ThemeMode } from './themes/config';
import AdaptiveProgressHud from './components/AdaptiveProgressHud';
import VariableNHud from './components/VariableNHud';
import { applyPendingUpdate, subscribeUpdateReady } from './pwa/registerSW';
import { shouldApplyWaitingUpdate } from './pwa/updateGate';

const App = () => {
    const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
    useThemeVariables(themeMode === 'dark' ? DefaultDrakTheme : DefaultLightTheme, themeMode);
    useKeyboardControls();

    const game = useGameStore((state) => state.game);
    const countdown = useGameStore((state) => state.countdown);
    const playMode = useGameStore((state) => state.settings.playMode);
    const level = useGameStore((state) => state.settings.level);
    const mode = useGameStore((state) => state.settings.mode);
    const variableN = useGameStore((state) => state.settings.variableN);
    const configuredTrials = useGameStore((state) => state.settings.trials);
    const currentTrials = useGameStore((state) => state.boardState.currentTrials);
    const nForTrial = useGameStore((state) => state.boardState.nForTrial);
    const ladder = useGameStore((state) => state.ladder[mode]);
    const adaptiveSession = useGameStore((state) => state.adaptiveSession);
    const trialsShown = game !== null ? currentTrials : configuredTrials;

    const inSession = game !== null;
    const countingDown = countdown !== null;
    const pendingContinue = adaptiveSession?.pendingContinue === true;
    const chromeHidden = inSession || countingDown || pendingContinue;
    const canApplySwUpdate = shouldApplyWaitingUpdate({
        game,
        countdown,
        pendingContinue,
    });

    useEffect(() => {
        if (!canApplySwUpdate) return;
        applyPendingUpdate();
    }, [canApplySwUpdate]);

    useEffect(() => {
        return subscribeUpdateReady((ready) => {
            if (ready && shouldApplyWaitingUpdate({
                game: useGameStore.getState().game,
                countdown: useGameStore.getState().countdown,
                pendingContinue: useGameStore.getState().adaptiveSession?.pendingContinue === true,
            })) {
                applyPendingUpdate();
            }
        });
    }, []);
    const isAdaptive = playMode === 'adaptive';
    const showVariableN = !isAdaptive && variableN && (inSession || countingDown);
    const variableNValue = nForTrial > 0 ? nForTrial : level;

    return (
        <div className={`app-container${chromeHidden ? ' playing' : ''}`}>
            <div className="app">
                <Topbar />
                <div className="session-status" aria-live="polite">
                    {!isAdaptive && !showVariableN && (
                        <div className="session-status-item">
                            <span className="session-status-label">Level</span>
                            <span className="session-status-value">{level}</span>
                        </div>
                    )}
                    <div className="session-status-item">
                        <span className="session-status-label">Trials</span>
                        <span className="session-status-value">{trialsShown}</span>
                    </div>
                </div>
                {showVariableN && <VariableNHud n={variableNValue} />}
                <Board />
                {isAdaptive && (
                    <AdaptiveProgressHud
                        n={ladder.n}
                        lureStage={ladder.lureStage}
                        session={adaptiveSession}
                    />
                )}
                <Footer
                    themeMode={themeMode}
                    onToggleTheme={() => setThemeMode((mode) => (mode === 'dark' ? 'light' : 'dark'))}
                />
                {inSession && <UserMatchNotice />}
                <CountdownFlash />
            </div>
        </div>
    );
};

export default App;
