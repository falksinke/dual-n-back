import { useEffect, useState } from 'react';
import {
    dismissInstallNudge,
    loadUiPreferences,
    type UiPreferencesV1,
} from '../../model/uiPreferences';
import {
    isIosSafari,
    isStandaloneDisplay,
    shouldShowInstallNudge,
} from '../../pwa/installEligibility';
import {
    subscribeDeferredInstallPrompt,
    takeDeferredInstallPrompt,
    type BeforeInstallPromptEventLike,
} from '../../pwa/installPrompt';
import './InstallNudge.scss';

interface InstallNudgeProps {
    /** Hide while countdown / session / Adaptive interstitial is active. */
    flowBusy: boolean;
    /** Bump when a block completes so eligibility re-evaluates. */
    blocksCompletedSignal: number;
}

const InstallNudge = ({ flowBusy, blocksCompletedSignal }: InstallNudgeProps) => {
    const [prefs, setPrefs] = useState<UiPreferencesV1>(() => loadUiPreferences());
    const [deferred, setDeferred] = useState<BeforeInstallPromptEventLike | null>(null);
    const [standalone] = useState(() => isStandaloneDisplay());
    const [iosSafari] = useState(() => isIosSafari());

    useEffect(() => {
        return subscribeDeferredInstallPrompt(setDeferred);
    }, []);

    useEffect(() => {
        setPrefs(loadUiPreferences());
    }, [blocksCompletedSignal]);

    const visible =
        !flowBusy &&
        shouldShowInstallNudge(
            {
                visitCount: prefs.visitCount,
                blocksCompleted: prefs.blocksCompleted,
                installNudgeDismissedAt: prefs.installNudgeDismissedAt,
            },
            {
                standalone,
                iosSafari,
                hasDeferredPrompt: deferred != null,
            }
        );

    if (!visible) return null;

    const onInstall = async () => {
        const event = takeDeferredInstallPrompt();
        if (event == null) return;
        setDeferred(null);
        await event.prompt();
        await event.userChoice;
        setPrefs(dismissInstallNudge());
    };

    const onDismiss = () => {
        setPrefs(dismissInstallNudge());
    };

    return (
        <aside className="install-nudge" role="region" aria-label="Install app">
            <div className="install-nudge-copy">
                <p className="install-nudge-title">Install N-Back</p>
                {iosSafari && deferred == null ? (
                    <p className="install-nudge-body">
                        Tap Share, then <strong>Add to Home Screen</strong>.
                    </p>
                ) : (
                    <p className="install-nudge-body">
                        Add to your home screen for offline practice.
                    </p>
                )}
            </div>
            <div className="install-nudge-actions">
                {deferred != null && (
                    <button type="button" className="install-nudge-primary" onClick={() => void onInstall()}>
                        Install
                    </button>
                )}
                <button type="button" className="install-nudge-dismiss" onClick={onDismiss}>
                    Not now
                </button>
            </div>
        </aside>
    );
};

export default InstallNudge;
