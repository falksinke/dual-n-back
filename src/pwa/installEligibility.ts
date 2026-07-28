export const INSTALL_NUDGE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export type InstallNudgeState = {
    visitCount: number;
    blocksCompleted: number;
    installNudgeDismissedAt: number | null;
};

export type InstallNudgeOptions = {
    standalone?: boolean;
    now?: number;
    hasDeferredPrompt?: boolean;
    iosSafari?: boolean;
};

export function isStandaloneDisplay(
    win: Window = window,
    nav: Navigator = navigator
): boolean {
    const media = win.matchMedia?.('(display-mode: standalone)').matches === true;
    const iosStandalone =
        'standalone' in nav && (nav as Navigator & { standalone?: boolean }).standalone === true;
    return media || iosStandalone;
}

export function isIosSafari(nav: Navigator = navigator): boolean {
    const ua = nav.userAgent;
    const iOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    return iOS && /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function shouldShowInstallNudge(
    state: InstallNudgeState,
    opts: InstallNudgeOptions = {}
): boolean {
    if (opts.standalone ?? isStandaloneDisplay()) return false;

    const engaged = state.blocksCompleted >= 1 || state.visitCount >= 2;
    if (!engaged) return false;

    const dismissedAt = state.installNudgeDismissedAt;
    if (
        dismissedAt != null &&
        (opts.now ?? Date.now()) - dismissedAt < INSTALL_NUDGE_SNOOZE_MS
    ) {
        return false;
    }

    const ios = opts.iosSafari ?? isIosSafari();
    return ios || opts.hasDeferredPrompt === true;
}
