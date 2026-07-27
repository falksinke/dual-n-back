import pjson from '../../../package.json';
import type { ThemeMode } from '../../themes/config';
import './Footer.scss';

interface FooterProps {
    themeMode: ThemeMode;
    onToggleTheme: () => void;
}

const Footer = ({ themeMode, onToggleTheme }: FooterProps) => {
    return (
        <footer className="footer">
            <div className="footer-hints" aria-label="Keyboard shortcuts">
                <div className="hint-line">
                    <span className="hint-label">Level</span>
                    <kbd className="key">↓</kbd>
                    <kbd className="key">↑</kbd>
                </div>
                <div className="hint-line">
                    <span className="hint-label">Trials</span>
                    <kbd className="key">←</kbd>
                    <kbd className="key">→</kbd>
                </div>
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
