/** The icon is also a shape cue: illumination never carries the landing alone. */
export function FireflyArtwork() {
    return (
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <circle cx="32" cy="34" r="29" fill="#f6d892" opacity=".18" />
            <circle cx="32" cy="34" r="20" fill="#f9e4ad" opacity=".25" />
            <path d="M29 31C7 33 9 11 21 18zm6 0c22 2 20-20 8-13z" fill="#f9edd0" stroke="#3d5551" strokeWidth="2" />
            <ellipse cx="32" cy="36" rx="7" ry="12" fill="#ffedab" stroke="#314845" strokeWidth="2.5" />
            <path d="M26 34h12" stroke="#927a49" strokeWidth="2" />
            <circle cx="32" cy="24" r="5" fill="#344b46" />
            <path d="m30 21-4-6m8 6 4-6" fill="none" stroke="#344b46" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

export function LanternArtwork() {
    return (
        <svg viewBox="0 0 48 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M16 18v-7a8 8 0 0 1 16 0v7" fill="none" stroke="#f3d998" strokeWidth="3" />
            <path d="M13 18h22l4 33H9z" fill="#f6d895" stroke="#2b4346" strokeWidth="3" strokeLinejoin="round" />
            <path d="M18 25h12l2 20H16z" fill="#fff1c4" />
            <path d="M24 43q-8-6 0-14 8 8 0 14" fill="#d5a54b" />
            <path d="M12 18h24M9 51h30" stroke="#344e4b" strokeWidth="4" strokeLinecap="round" />
        </svg>
    );
}

/** All sixteen pots are identical. No plant variation can mark an earlier target. */
export function PotArtwork() {
    return (
        <svg className="moth-pot__art" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <ellipse cx="50" cy="89" rx="33" ry="5" fill="#102f34" opacity=".45" />
            <path d="M50 52V22m0 22L35 33m15 4 13-11" fill="none" stroke="#8d9e79" strokeWidth="3" strokeLinecap="round" />
            <path d="M48 39C27 42 20 21 30 19q15-1 18 20" fill="#8a9d7b" />
            <path d="M53 33q-3-21 11-23c9 9 3 21-11 23" fill="#a4ae85" />
            <path d="M52 45q10-22 27-19c0 14-11 22-27 19" fill="#748e73" />
            <path d="M27 53h46l-6 30q-17 10-34 0z" fill="#b97757" stroke="#473e3b" strokeWidth="2.5" />
            <path d="M57 57h15l-5 26q-5 4-12 5z" fill="#a2624c" />
            <path d="M35 61l4 18" stroke="#d19771" strokeWidth="3" strokeLinecap="round" />
            <rect x="23" y="47" width="54" height="12" rx="4" fill="#cc8e67" stroke="#473e3b" strokeWidth="2.5" />
            <path d="M29 51h41" stroke="#e2b18a" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

/** Presentation-only pot: a current exposure OR user-entered lanterns, never a route. */
export function Pot({ landing = false, lanternCount = 0 }: { readonly landing?: boolean; readonly lanternCount?: number }) {
    return (
        <span className="moth-pot" aria-hidden="true">
            <PotArtwork />
            {landing && <span className="moth-pot__firefly"><FireflyArtwork /></span>}
            {lanternCount > 0 && (
                <span className="moth-pot-lantern">
                    <LanternArtwork />
                    {lanternCount > 1 && <span className="moth-pot-lantern__count">×{lanternCount}</span>}
                </span>
            )}
        </span>
    );
}
