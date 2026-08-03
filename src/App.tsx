import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store/gameStore';
import Board from './components/Board';
import Topbar from './components/Topbar';
import './App.scss';
import './haptics/Haptics.scss';
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
import SlotPointerHud from './components/SlotPointerHud';
import StrategyInstruction from './components/StrategyInstruction';
import InstallNudge from './components/InstallNudge';
import SessionExitButton from './components/SessionExitButton';
import { useHaptics } from './haptics/useHaptics';
import { HapticsEnabledProvider } from './haptics/HapticsEnabledContext';
import { settingsFromCurriculum } from './model/adaptiveCurriculum';
import { loadUiPreferences } from './model/uiPreferences';
import { applyPendingUpdate, subscribeUpdateReady } from './pwa/registerSW';
import { shouldApplyWaitingUpdate } from './pwa/updateGate';

const App = () => {
    const appRef = useRef<HTMLDivElement>(null);
    const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
    const [hapticsEnabled, setHapticsEnabled] = useState(
        () => loadUiPreferences().hapticFeedbackEnabled
    );
    useThemeVariables(themeMode === 'dark' ? DefaultDrakTheme : DefaultLightTheme, themeMode);
    useKeyboardControls();

    const game = useGameStore((state) => state.game);
    const countdown = useGameStore((state) => state.countdown);
    const lastResult = useGameStore((state) => state.results.last);
    const playMode = useGameStore((state) => state.settings.playMode);
    const level = useGameStore((state) => state.settings.level);
    const mode = useGameStore((state) => state.settings.mode);
    const variableN = useGameStore((state) => state.settings.variableN);
    const configuredTrials = useGameStore((state) => state.settings.trials);
    const currentTrials = useGameStore((state) => state.boardState.currentTrials);
    const nForTrial = useGameStore((state) => state.boardState.nForTrial);
    const stimulusEpoch = useGameStore((state) => state.boardState.stimulusEpoch);
    const ladder = useGameStore((state) => state.ladder[mode]);
    const adaptiveSession = useGameStore((state) => state.adaptiveSession);
    const acknowledgeStrategyInstruction = useGameStore(
        (state) => state.acknowledgeStrategyInstruction
    );
    const activeModalities = useGameStore((state) => state.activeModalities);
    const blocksCompletedSignal = useGameStore((state) => state.results.all.length);
    const trialsShown = game !== null ? currentTrials : configuredTrials;
    const [settingsOpen, setSettingsOpen] = useState(false);

    const inSession = game !== null;
    const countingDown = countdown !== null;
    const pendingContinue = adaptiveSession?.pendingContinue === true;
    const showingResults = lastResult != null;
    const chromeHidden = inSession || countingDown || pendingContinue;
    const flowBusy = chromeHidden;
    const uiRevision = [
        playMode,
        mode,
        inSession ? 'play' : 'idle',
        pendingContinue ? 'continue' : 'ready',
        settingsOpen ? 'settings' : 'closed',
        activeModalities.join(','),
        blocksCompletedSignal,
        hapticsEnabled ? 'h1' : 'h0',
        `${ladder.track}:${ladder.n}:${ladder.stage}`,
    ].join('|');
    useHaptics({ rootRef: appRef, enabled: hapticsEnabled, uiRevision });
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
    const showStrategyInstruction =
        isAdaptive &&
        ladder.stage === 'instruction' &&
        !inSession &&
        !countingDown &&
        !pendingContinue &&
        !showingResults;
    const curriculumSettings = settingsFromCurriculum(ladder);
    const showSlotPointer =
        isAdaptive &&
        (inSession || countingDown) &&
        curriculumSettings.pointerMode !== 'off';
    // Per-trial N must stay visible in Adaptive too — recipe "var N" alone is not enough.
    const showVariableN = variableN && (inSession || countingDown);
    const variableNValue = nForTrial > 0 ? nForTrial : level;
    const showSessionStatus = !showingResults;

    const appContainerClass = [
        'app-container',
        chromeHidden ? 'playing' : '',
        isAdaptive ? 'adaptive' : '',
        inSession ? 'in-session' : '',
        pendingContinue ? 'pending-continue' : '',
        showingResults ? 'showing-results' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <HapticsEnabledProvider value={hapticsEnabled}>
            <div ref={appRef} className={appContainerClass}>
                <div className="app">
                    <Topbar
                        settingsOpen={settingsOpen}
                        onSettingsOpenChange={setSettingsOpen}
                        onHapticsEnabledChange={setHapticsEnabled}
                    />
                    <SessionExitButton />
                    {showSessionStatus && (
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
                    )}
                    {showVariableN && <VariableNHud n={variableNValue} />}
                    {showSlotPointer && (
                        <SlotPointerHud
                            n={level}
                            trialIndex={Math.max(0, currentTrials - 1)}
                            pointerMode={curriculumSettings.pointerMode}
                            stimulusEpoch={stimulusEpoch}
                        />
                    )}
                    <Board />
                    {showStrategyInstruction && (
                        <StrategyInstruction
                            n={ladder.n}
                            onContinue={acknowledgeStrategyInstruction}
                        />
                    )}
                    {isAdaptive && (
                        <AdaptiveProgressHud ladder={ladder} session={adaptiveSession} />
                    )}
                    <Footer
                        themeMode={themeMode}
                        onToggleTheme={() =>
                            setThemeMode((mode) => (mode === 'dark' ? 'light' : 'dark'))
                        }
                    />
                    {inSession && <UserMatchNotice />}
                    <CountdownFlash />
                    <InstallNudge
                        flowBusy={flowBusy}
                        blocksCompletedSignal={blocksCompletedSignal}
                    />
                </div>
            </div>
        </HapticsEnabledProvider>
    );
};

export default App;
