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
import StrategyInstruction from './components/StrategyInstruction';
import TeachOptOutWarn from './components/TeachOptOutWarn';
import InstallNudge from './components/InstallNudge';
import SessionExitButton from './components/SessionExitButton';
import { useHaptics } from './haptics/useHaptics';
import { HapticsEnabledProvider } from './haptics/HapticsEnabledContext';
import { isLadderPlayMode } from './store/gameStore';
import { loadUiPreferences } from './model/uiPreferences';
import { applyPendingUpdate, subscribeUpdateReady } from './pwa/registerSW';
import { shouldApplyWaitingUpdate } from './pwa/updateGate';
import StatisticsPanel from './components/StatisticsPanel';

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
    const matchLadder = useGameStore((state) => state.ladder[mode]);
    const cyclicLadder = useGameStore((state) => state.cyclicLadder[mode]);
    const adaptiveSession = useGameStore((state) => state.adaptiveSession);
    const acknowledgeStrategyInstruction = useGameStore(
        (state) => state.acknowledgeStrategyInstruction
    );
    const teachIntroDismissed = useGameStore((state) => state.teachIntroDismissed);
    const teachOptOutWarnShown = useGameStore((state) => state.teachOptOutWarnShown);
    const confirmTeachOptOut = useGameStore((state) => state.confirmTeachOptOut);
    const dismissTeachOptOutWarn = useGameStore((state) => state.dismissTeachOptOutWarn);
    const activeModalities = useGameStore((state) => state.activeModalities);
    const blocksCompletedSignal = useGameStore((state) => state.results.all.length);
    const dailyRounds = useGameStore((state) => state.settings.dailyRounds);
    const ensureDailyProgressCurrent = useGameStore((state) => state.ensureDailyProgressCurrent);
    const trialsShown = game !== null ? currentTrials : configuredTrials;
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [statisticsOpen, setStatisticsOpen] = useState(false);

    const inSession = game !== null;
    const countingDown = countdown !== null;
    const pendingContinue = adaptiveSession?.pendingContinue === true;
    const showingResults = lastResult != null;
    const chromeHidden = inSession || countingDown || pendingContinue;
    const flowBusy = chromeHidden;
    const ladderRevision =
        playMode === 'cyclic'
            ? `${cyclicLadder.track}:${cyclicLadder.n}:${cyclicLadder.stage}`
            : `L${matchLadder.levelIndex}:${matchLadder.failStreak}`;
    const uiRevision = [
        playMode,
        mode,
        inSession ? 'play' : 'idle',
        pendingContinue ? 'continue' : 'ready',
        settingsOpen ? 'settings' : 'closed',
        statisticsOpen ? 'statistics' : 'stats-closed',
        activeModalities.join(','),
        blocksCompletedSignal,
        hapticsEnabled ? 'h1' : 'h0',
        ladderRevision,
    ].join('|');
    useHaptics({ rootRef: appRef, enabled: hapticsEnabled, uiRevision });
    const canApplySwUpdate = shouldApplyWaitingUpdate({
        game,
        countdown,
        pendingContinue,
    });

    useEffect(() => {
        ensureDailyProgressCurrent();
    }, [ensureDailyProgressCurrent]);

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
    const isMatchAdaptive = playMode === 'adaptive';
    const isCyclic = playMode === 'cyclic';
    const isLadderMode = isLadderPlayMode(playMode);
    const showStrategyInstruction =
        isCyclic &&
        cyclicLadder.stage === 'teach_walkthrough' &&
        !teachIntroDismissed &&
        !inSession &&
        !countingDown &&
        !pendingContinue;

    useEffect(() => {
        if (showStrategyInstruction) {
            setSettingsOpen(false);
        }
    }, [showStrategyInstruction]);
    // Per-trial N must stay visible in ladder modes too — recipe "var N" alone is not enough.
    const showVariableN = variableN && (inSession || countingDown);
    const variableNValue = nForTrial > 0 ? nForTrial : level;
    const showIdleSessionStatus = !showingResults && dailyRounds <= 0;
    const showInSessionStatus = !showingResults && (inSession || countingDown);
    const showSessionStatus = showIdleSessionStatus || showInSessionStatus;

    const appContainerClass = [
        'app-container',
        chromeHidden ? 'playing' : '',
        isLadderMode ? 'adaptive' : '',
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
                        onSettingsOpenChange={(open) => {
                            setSettingsOpen(open);
                            if (open) setStatisticsOpen(false);
                        }}
                        statisticsOpen={statisticsOpen}
                        onStatisticsOpenChange={(open) => {
                            setStatisticsOpen(open);
                            if (open) setSettingsOpen(false);
                        }}
                        onHapticsEnabledChange={setHapticsEnabled}
                        ariaHidden={chromeHidden}
                    />
                    <StatisticsPanel
                        open={statisticsOpen}
                        onClose={() => setStatisticsOpen(false)}
                    />
                    <SessionExitButton />
                    {showSessionStatus && (
                        <div className="session-status" aria-live="polite">
                            {!isLadderMode && !showVariableN && (
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
                    {teachOptOutWarnShown && (
                        <TeachOptOutWarn
                            onKeepPracticing={dismissTeachOptOutWarn}
                            onConfirm={confirmTeachOptOut}
                        />
                    )}
                    <Board />
                    {showStrategyInstruction && (
                        <StrategyInstruction
                            n={cyclicLadder.n}
                            onContinue={acknowledgeStrategyInstruction}
                        />
                    )}
                    {isMatchAdaptive && (
                        <AdaptiveProgressHud
                            path="adaptive"
                            ladder={matchLadder}
                            session={adaptiveSession}
                        />
                    )}
                    {isCyclic && (
                        <AdaptiveProgressHud
                            path="cyclic"
                            ladder={cyclicLadder}
                            session={adaptiveSession}
                        />
                    )}
                    <Footer
                        themeMode={themeMode}
                        onToggleTheme={() =>
                            setThemeMode((mode) => (mode === 'dark' ? 'light' : 'dark'))
                        }
                        ariaHidden={chromeHidden}
                    />
                    {!showingResults && <UserMatchNotice />}
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
