import pjson from '../../../package.json';
import type { ThemeMode } from '../../themes/config';
import { useGameStore } from '../../store/gameStore';
import './Footer.scss';

interface FooterProps {
    themeMode: ThemeMode;
    onToggleTheme: () => void;
    /** Hide chrome from assistive tech while visually hidden during play. */
    ariaHidden?: boolean;
}

const Footer = ({ themeMode, onToggleTheme, ariaHidden = false }: FooterProps) => {
    const pendingContinue = useGameStore((state) => state.adaptiveSession?.pendingContinue === true);
    const playMode = useGameStore((state) => state.settings.playMode);

    return (
        <footer className="footer" aria-hidden={ariaHidden || undefined}>
            <div className="footer-hints" aria-label="Keyboard shortcuts">
                {pendingContinue ? (
                    <div className="hint-line">
                        <span className="hint-label">Continue</span>
                        <kbd className="key">Space</kbd>
                    </div>
                ) : (
                    <>
                        {playMode === 'free' && (
                            <div className="hint-line">
                                <span className="hint-label">Level</span>
                                <kbd className="key">↓</kbd>
                                <kbd className="key">↑</kbd>
                            </div>
                        )}
                        <div className="hint-line">
                            <span className="hint-label">Trials</span>
                            <kbd className="key">←</kbd>
                            <kbd className="key">→</kbd>
                        </div>
                    </>
                )}
            </div>
            <div className="footer-meta">
                <button
                    type="button"
                    className="meta-theme"
                    onClick={onToggleTheme}
                    aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {themeMode}
                </button>
                <span className="meta-item">v{pjson.version}</span>
            </div>
        </footer>
    );
};

export default Footer;
