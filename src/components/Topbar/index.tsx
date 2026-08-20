import SettingsPanel from '../SettingsPanel';
import DailyProgressDots from '../DailyProgressDots';
import './Topbar.scss';

const GearIcon = () => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="settings-gear"
    >
        <path
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.9 6.9 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.5 6.5 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.5 6.5 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.9 6.9 0 0 1 0-.255c.007-.378-.138-.75-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
        />
        <path
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
    </svg>
);

const StatisticsIcon = () => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="statistics-icon"
    >
        <path
            d="M5 19V11M12 19V5M19 19V8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
    </svg>
);

interface TopbarProps {
    settingsOpen: boolean;
    onSettingsOpenChange: (open: boolean) => void;
    statisticsOpen: boolean;
    onStatisticsOpenChange: (open: boolean) => void;
    onHapticsEnabledChange?: (enabled: boolean) => void;
    /** Hide chrome from assistive tech while visually hidden during play. */
    ariaHidden?: boolean;
}

const Topbar = ({
    settingsOpen,
    onSettingsOpenChange,
    statisticsOpen,
    onStatisticsOpenChange,
    onHapticsEnabledChange,
    ariaHidden = false,
}: TopbarProps) => {
    return (
        <>
            <header className="topbar" aria-hidden={ariaHidden || undefined}>
                <div className="brand">
                    <span className="brand-mark" aria-hidden="true" />
                    <h1 className="title">N-Back</h1>
                </div>

                <DailyProgressDots />

                <div className="topbar-actions">
                    <button
                        type="button"
                        className="settings-trigger statistics-trigger"
                        aria-label="Statistics"
                        aria-haspopup="dialog"
                        aria-expanded={statisticsOpen}
                        onClick={() => onStatisticsOpenChange(true)}
                    >
                        <StatisticsIcon />
                    </button>
                    <button
                        type="button"
                        className="settings-trigger"
                        aria-label="Settings"
                        aria-haspopup="dialog"
                        aria-expanded={settingsOpen}
                        onClick={() => onSettingsOpenChange(true)}
                    >
                        <GearIcon />
                    </button>
                </div>
            </header>

            <SettingsPanel
                open={settingsOpen}
                onClose={() => onSettingsOpenChange(false)}
                onHapticsEnabledChange={onHapticsEnabledChange}
            />
        </>
    );
};

export default Topbar;
