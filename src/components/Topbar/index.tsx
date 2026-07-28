import { useState } from 'react';
import SettingsPanel from '../SettingsPanel';
import './Topbar.scss';

const GearIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
            fill="currentColor"
            d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.14 3.05-1.1-.64a6.9 6.9 0 0 0-.1-1l1.05-.75a.75.75 0 0 0 .17-1.03l-1.2-2.08a.75.75 0 0 0-.96-.3l-1.22.5a7.1 7.1 0 0 0-.86-.5l-.18-1.3A.75.75 0 0 0 14.99 3h-2.4a.75.75 0 0 0-.74.64l-.18 1.3c-.3.12-.59.28-.86.46l-1.22-.5a.75.75 0 0 0-.96.3L7.43 7.28a.75.75 0 0 0 .17 1.03l1.05.75c-.05.33-.08.66-.08.99 0 .34.03.67.09 1l-1.06.64a.75.75 0 0 0-.28.99l1.2 2.08c.2.35.64.48 1.01.3l1.18-.55c.27.2.56.37.87.5l.18 1.31c.06.37.38.64.75.64h2.4c.37 0 .69-.27.75-.64l.18-1.31c.31-.13.6-.3.87-.5l1.18.55c.37.18.81.05 1.01-.3l1.2-2.08a.75.75 0 0 0-.28-.99Z"
        />
    </svg>
);

interface TopbarProps {
    onHapticsEnabledChange?: (enabled: boolean) => void;
}

const Topbar = ({ onHapticsEnabledChange }: TopbarProps) => {
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <>
            <header className="topbar">
                <div className="brand">
                    <span className="brand-mark" aria-hidden="true" />
                    <h1 className="title">Dual N Back</h1>
                </div>

                <button
                    type="button"
                    className="settings-trigger"
                    aria-label="Settings"
                    aria-haspopup="dialog"
                    aria-expanded={settingsOpen}
                    onClick={() => setSettingsOpen(true)}
                >
                    <GearIcon />
                </button>
            </header>

            <SettingsPanel
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                onHapticsEnabledChange={onHapticsEnabledChange}
            />
        </>
    );
};

export default Topbar;
