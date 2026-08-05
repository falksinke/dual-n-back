import { useId, type ReactNode } from 'react';

export type SettingsSectionId =
    | 'training'
    | 'timing'
    | 'challenge'
    | 'board'
    | 'feedback'
    | 'sync';

interface SettingsSectionProps {
    id: SettingsSectionId;
    title: string;
    /** Shown when collapsed so the section still communicates state. */
    summary?: string;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}

const SettingsSection = ({
    id,
    title,
    summary,
    open,
    onToggle,
    children,
}: SettingsSectionProps) => {
    const panelId = useId();
    const titleId = useId();

    return (
        <section
            className={`settings-section${open ? ' is-open' : ''}`}
            data-section={id}
            aria-labelledby={titleId}
        >
            <h3 className="settings-section__heading">
                <button
                    type="button"
                    className="settings-section__trigger"
                    aria-expanded={open}
                    aria-controls={panelId}
                    id={titleId}
                    data-haptic="light"
                    onClick={onToggle}
                >
                    <span className="settings-section__title-block">
                        <span className="settings-section__title">{title}</span>
                        {!open && summary != null && summary !== '' && (
                            <span className="settings-section__summary">{summary}</span>
                        )}
                    </span>
                    <span className="settings-section__chevron" aria-hidden="true" />
                </button>
            </h3>
            <div
                id={panelId}
                className={`settings-section__panel${open ? ' is-open' : ''}`}
                role="region"
                aria-labelledby={titleId}
                // Keep collapsed controls out of the tab order while the 0fr→1fr panel animates.
                inert={open ? undefined : true}
            >
                <div className="settings-section__inner">{children}</div>
            </div>
        </section>
    );
};

export default SettingsSection;
