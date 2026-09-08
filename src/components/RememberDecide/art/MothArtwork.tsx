/** A bilaterally mirrored decoration. Both halves use precisely the same paths.
 *  The centre is intentionally empty: the square Boolean panel sits in front.
 *  No truth, species, response, or difficulty props are accepted here.
 */
function WingEdge() {
    return (
        <g stroke="#b3a580" strokeWidth="2.5" strokeLinejoin="round">
            <path d="M299 54C228 0 97 2 30 49 0 71 11 150 31 222L22 444q0 111 117 174l91-37 69 6z" fill="#687969" />
            <path d="M277 55C197 20 91 22 34 67m-3 127L18 85m5 360q11 98 107 151" fill="none" stroke="#93a18a" strokeWidth="4" />
            <path d="m31 272-14 48 14 48m2 86 17 52m108 109 26-16" fill="none" stroke="#c6b58a" />
            <ellipse cx="87" cy="36" rx="12" ry="5" fill="#c4b68c" stroke="none" />
        </g>
    );
}

export function MothFrameArtwork() {
    return (
        <svg className="moth-specimen__frame" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <WingEdge />
            <g transform="translate(640 0) scale(-1 1)"><WingEdge /></g>
            <path d="M312 32q-7-22-21-22m37 22q7-22 21-22" stroke="#dfc795" strokeWidth="3" strokeLinecap="round" fill="none" />
            <ellipse cx="320" cy="41" rx="9" ry="12" fill="#ccb783" stroke="#475d57" strokeWidth="2" />
            <path d="M315 596v22q5 12 10 0v-22" fill="#ccb783" stroke="#475d57" strokeWidth="2" />
            {/* This rectangular backing ends outside the pattern, never between its cells. */}
            <rect x="43" y="43" width="554" height="554" rx="12" fill="#c4ae7f" stroke="#344d4b" strokeWidth="3" />
            <path d="M53 58v-5h5m524 0h5v5M53 582v5h5m524 0h5v-5" fill="none" stroke="#f0dab0" strokeWidth="3" />
        </svg>
    );
}

export function MothEmblem() {
    return (
        <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 20C17 10 5 8 5 16c0 8 7 12 17 10C5 23 7 41 16 37l7-8m2-9c6-10 18-12 18-4 0 8-7 12-17 10 17-3 15 15 6 11l-7-8" />
                <path d="M24 18v15m-2-17-4-5m8 5 4-5M11 17l8 5m18-5-8 5" />
                <circle cx="24" cy="17" r="2" />
            </g>
        </svg>
    );
}
