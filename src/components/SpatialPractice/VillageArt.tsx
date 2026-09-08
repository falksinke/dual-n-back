/** Original inline SVG artwork. All geometry is decorative and receives no route data. */

export function EnvelopeMark({ className = '' }: { className?: string }) {
    return <svg className={className} viewBox="0 0 48 36" fill="none" aria-hidden="true" focusable="false">
        <rect x="3" y="4" width="42" height="28" rx="4" fill="currentColor" />
        <path d="m5 7 19 14L43 7M5 29l12-11m26 11L31 18" stroke="var(--fp-ink, #28283f)" strokeWidth="2" strokeLinejoin="round" />
    </svg>;
}

export function FireflyMark({ className = '' }: { className?: string }) {
    return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <ellipse cx="15" cy="19" rx="7" ry="12" transform="rotate(-40 15 19)" fill="#f9edce" />
        <ellipse cx="33" cy="19" rx="7" ry="12" transform="rotate(40 33 19)" fill="#f9edce" />
        <path d="m20 11-4-6m12 6 4-6" fill="none" stroke="#f9edce" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="24" cy="30" rx="10" ry="12" fill="#f5c66f" />
        <path d="M15 28h18" stroke="#ac7746" strokeWidth="3" />
        <circle cx="24" cy="18" r="7" fill="#34334c" />
        <circle cx="22" cy="16" r="1.3" fill="#fff6d9" />
    </svg>;
}

export function NightSky() {
    return <svg className="firefly-village__sky-art" viewBox="0 0 800 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <g fill="#a9afc6" opacity=".55">
            <circle cx="76" cy="42" r="1.8" /><circle cx="179" cy="25" r="1.5" />
            <circle cx="292" cy="49" r="1.7" /><circle cx="422" cy="18" r="1.5" />
            <circle cx="539" cy="60" r="1.5" /><circle cx="732" cy="73" r="1.5" />
            <path d="m125 78 2-6 2 6 6 2-6 2-2 6-2-6-6-2Zm348-42 1.5-5 1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5Z" />
        </g>
        <path d="M660 23a25 25 0 1 0 31 35 25 25 0 0 1-31-35Z" fill="#e8dcc2" />
        <g fill="#40445c" opacity=".65">
            <path d="M0 151V117l30-22 34 22v34Zm63 9V133l22-15 22 15v27Zm43 0V108l38-34 34 34v52Z" />
            <path d="M664 166v-58l33-29 35 29v58Zm61 0v-40l32-27 43 32v35Z" />
        </g>
        <path d="M0 169q105-25 200 0t200 0 200 0 200-1v12H0Z" fill="#363c51" />
        <g fill="#55586e" opacity=".4">
            <path d="M26 57q10-15 22-4 17-10 23 5H26Zm515-24q9-12 19-4 13-6 18 5h-37Z" />
        </g>
    </svg>;
}

export function HouseRoof({ kind }: { kind: 'clay' | 'sage' | 'plum' }) {
    return <svg className="firefly-village__roof" viewBox="0 0 180 110" aria-hidden="true" focusable="false">
        {kind === 'clay' ? <>
            <path d="M125 71V22h20v59" fill="#8e7979" stroke="#333348" strokeWidth="3" />
            <path d="M120 21h29v9h-29Z" fill="#b2978a" />
            <path d="M12 106V66L91 14l76 56v36Z" fill="#ad8d80" />
            <path d="m3 71 88-61 87 61-9 10-78-51-78 51Z" fill="#4b495e" stroke="#333348" strokeWidth="3" strokeLinejoin="round" />
            <path d="m21 65 70-47 67 47" fill="none" stroke="#777080" strokeWidth="3" />
            <path d="M79 65h24M78 73h26M79 81h24" stroke="#796a70" strokeWidth="4" />
            <path d="M9 102h162v8H9Z" fill="#75656d" />
        </> : kind === 'sage' ? <>
            <path d="M31 48V9h18v43" fill="#7c8b88" stroke="#333348" strokeWidth="3" />
            <path d="M26 7h28v9H26Z" fill="#abb0a0" />
            <path d="M12 104V65l27-38 125 36v41Z" fill="#8f9b90" />
            <path d="m4 66 30-46 143 42-8 14L42 43 17 78Z" fill="#435965" stroke="#333348" strokeWidth="3" strokeLinejoin="round" />
            <path d="m34 30 126 36M40 42l123 34" stroke="#78898d" strokeWidth="2" />
            <path d="M33 85h32m34 0h40M53 95h48" stroke="#748980" strokeWidth="3" />
            <path d="M9 102h162v8H9Z" fill="#637975" />
        </> : <>
            <path d="M130 58V18h17v45" fill="#95808f" stroke="#333348" strokeWidth="3" />
            <path d="M125 16h27v9h-27Z" fill="#b3a09f" />
            <path d="M12 106V72l75-54 78 54v34Z" fill="#a28b99" />
            <path d="M3 73 28 57V46h18V34h19V21h21V9h16v18h19v14h18v14h17v12l21 11-9 10L92 39 13 84Z" fill="#665266" stroke="#333348" strokeWidth="3" strokeLinejoin="round" />
            <path d="m20 75 72-45 69 46" fill="none" stroke="#a28497" strokeWidth="3" />
            <circle cx="91" cy="77" r="12" fill="#7e7082" />
            <path d="M86 70h10m-10 7h10m-10 7h10" stroke="#584f66" strokeWidth="3" />
            <path d="M9 102h162v8H9Z" fill="#7e697d" />
        </>}
    </svg>;
}

export function PostOffice() {
    return <svg className="firefly-village__post-office" viewBox="0 0 150 134" aria-hidden="true" focusable="false">
        <path d="M18 44h114v84H18Z" fill="#9a8078" stroke="#343548" strokeWidth="3" />
        <path d="M24 47h102v12H24Z" fill="#675b67" />
        <path d="M6 42 20 25h110l14 17v12H6Z" fill="#425e6c" stroke="#343548" strokeWidth="3" strokeLinejoin="round" />
        <path d="M30 27v24m29-24v24m31-24v24m30-24v24" stroke="#97aaa3" strokeWidth="9" />
        <rect x="27" y="4" width="96" height="24" rx="4" fill="#ebd6ad" stroke="#343548" strokeWidth="3" />
        <text x="75" y="21" textAnchor="middle" fill="#443c4a" fontFamily="Georgia, serif" fontSize="15" letterSpacing="3">POST</text>
        <path d="M50 128V73q25-28 50 0v55" fill="#354653" stroke="#343548" strokeWidth="3" />
        <path d="M57 128V78q18-20 36 0v50" fill="#486370" />
        <rect x="61" y="94" width="28" height="6" rx="2" fill="#d7bc85" />
        <path d="M65 97h20" stroke="#5c5255" strokeWidth="2" />
        <circle cx="90" cy="113" r="2.5" fill="#d7bc85" />
        <path d="M38 127h73v7H38Z" fill="#b09b8e" />
        <rect x="114" y="77" width="23" height="31" rx="5" fill="#966454" stroke="#343548" strokeWidth="2" />
        <path d="M119 86h13" stroke="#ead4ac" strokeWidth="3" />
    </svg>;
}

export function Planter({ className = '' }: { className?: string }) {
    return <svg className={className} viewBox="0 0 72 110" aria-hidden="true" focusable="false">
        <path d="M37 80V19" stroke="#42444d" strokeWidth="4" />
        <path d="M36 70C4 67 4 42 32 51 17 16 42 7 40 42 63 13 76 48 43 56 73 45 72 76 38 76Z" fill="#6a8580" />
        <path d="M29 49C6 25 18 10 29 23q10 13 7 25M41 40q-7-30 7-34c13 6 7 25-7 34" fill="#879987" />
        <path d="m15 78 5 25q17 11 33 0l5-25" fill="#9b7267" stroke="#43404e" strokeWidth="2" />
        <ellipse cx="36" cy="78" rx="23" ry="6" fill="#bd9780" />
        <path d="m26 86 2 14" stroke="#cead8c" strokeWidth="3" strokeLinecap="round" />
    </svg>;
}

export function SleepingCat() {
    return <svg className="firefly-village__cat" viewBox="0 0 100 60" aria-hidden="true" focusable="false">
        <ellipse cx="51" cy="53" rx="43" ry="5" fill="#282c40" opacity=".45" />
        <g className="firefly-village__cat-body">
            <path d="M22 48C8 21 30 11 56 20c25-5 35 7 29 22l-1 8H26" fill="#b8a18b" stroke="#424051" strokeWidth="2.5" />
            <path d="m47 36-3-23 14 7 11-5 3 19" fill="#cbb69a" stroke="#424051" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="m48 19 6 5-5 3m14-4 5-4v9" fill="#9a7c79" />
            <path d="M49 33q4 4 8 0m5 0q4 4 8 0" fill="none" stroke="#424051" strokeWidth="2" strokeLinecap="round" />
            <path d="m57 39 5 0-2.5 3Z" fill="#7e626a" />
            <path d="M27 43c-8-18 16-18 25-9 14 15-4 26-23 14" fill="none" stroke="#8e7d76" strokeWidth="10" strokeLinecap="round" />
        </g>
    </svg>;
}

export function StreetLamp() {
    return <svg className="firefly-village__lamp" viewBox="0 0 64 160" aria-hidden="true" focusable="false">
        <path d="M32 150V49" stroke="#2e3347" strokeWidth="6" />
        <path d="M19 153h26" stroke="#2e3347" strokeWidth="8" strokeLinecap="round" />
        <path d="m18 21 4 31h20l4-31Z" fill="#e0c594" stroke="#37394e" strokeWidth="3" />
        <path d="M32 25v24" stroke="#86725b" strokeWidth="2" />
        <path d="m12 22 20-17 20 17Z" fill="#4e5868" stroke="#37394e" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="32" cy="5" r="3" fill="#c4a678" />
    </svg>;
}

type CourierPose = 'idle' | 'watch' | 'deliver' | 'success' | 'retry' | 'rest';

/** Pose is based on phase / a completed tap, never a destination or a route. */
export function Courier({ pose }: { pose: CourierPose }) {
    return <svg className={`firefly-courier is-${pose}`} viewBox="0 0 120 160" aria-hidden="true" focusable="false">
        <ellipse cx="58" cy="150" rx="40" ry="6" fill="#282c40" opacity=".4" />
        <g className="firefly-courier__figure" stroke="#333347" strokeWidth="2.5" strokeLinejoin="round">
            <path d="M39 109v32H28q-7 1-7 8h31v-38m13-2v40h30q0-9-8-9H78v-31" fill="#3c405b" />
            <path d="M36 60 24 85l8 5 13-17m34-13 17 24-8 7-15-17" fill="#768d9a" />
            <path d="M37 59q22-12 42 0l9 53H28Z" fill="#829ca5" />
            <path d="m38 60 19 15 19-15" fill="#d9b276" />
            <path d="M57 74v33" fill="none" stroke="#516879" />
            <circle cx="62" cy="84" r="1.6" fill="#ecd9ae" stroke="none" />
            <circle cx="62" cy="97" r="1.6" fill="#ecd9ae" stroke="none" />
            <path d="m42 58 32 50" fill="none" stroke="#7b524f" strokeWidth="7" />
            <path d="M61 94q16-7 31 0v27q-15 9-31 0Z" fill="#bb8867" />
            <path d="M61 94q15 10 31 0v9q-15 10-31 0Z" fill="#cca079" />
            <rect x="75" y="101" width="6" height="9" rx="2" fill="#e3c98f" strokeWidth="1.5" />
            <g className="firefly-courier__head">
                <path d="M42 35q-11-1-8 11l7 3m34-14q10-2 9 9l-8 5" fill="#d7a383" />
                <path d="M39 28q18-18 38 0v18q-1 20-19 22-19-3-19-22Z" fill="#f0c7a1" />
                <path d="M39 41q-6-16 7-18h30v13q-8-1-14-9-10 12-23 14Z" fill="#6b4950" stroke="none" />
                <path d="M34 28q0-26 26-24 25 1 24 24" fill="#d6ad6d" />
                <path d="M34 28h51q6 1 4 7H33Z" fill="#ac8059" />
                <path d="M58 13h11v9H58Z" fill="#f5ddaf" strokeWidth="1.4" />
                <path d="m59 14 4.5 4 4.5-4" strokeWidth="1.1" fill="none" />
                <g fill="#333347" stroke="none">
                    <circle cx="49" cy="46" r="1.8" /><circle cx="67" cy="46" r="1.8" />
                </g>
                <path d={pose === 'retry' ? 'M53 58q5-3 11 0' : 'M53 56q5 5 11 0'} fill="none" strokeWidth="1.7" strokeLinecap="round" />
                <path d="m59 48-2 5h3" fill="none" stroke="#bd8c73" strokeWidth="1.5" strokeLinecap="round" />
            </g>
            <g className="firefly-courier__letter-hand">
                <path d={pose === 'success' ? 'M33 72 19 55 10 59l13 27' : pose === 'retry' ? 'M34 74 21 70 14 76l17 14' : 'M33 76 21 91l8 7 13-17'} fill="#829ca5" />
                {pose === 'success' ? <>
                    <path d="M19 55 14 47q-4-4-7 0l3 12Z" fill="#f0c7a1" />
                    <path d="m9 46-5-19 24-5 5 19Z" fill="#f4dfb9" />
                    <path d="m5 29 14 7 9-11" fill="none" stroke="#a8876c" strokeWidth="1.5" />
                </> : <>
                    <path d="m15 78 27-5 3 22-27 5Z" fill="#f4dfb9" />
                    <path d="m16 79 15 8 11-12" fill="none" stroke="#a8876c" strokeWidth="1.5" />
                    <path d="M20 91q-6 1-4 7 3 6 10 1l2-7Z" fill="#f0c7a1" />
                </>}
            </g>
            <path d="M88 84q8-4 10 3l-5 11q-5 5-9 0Z" fill="#f0c7a1" />
        </g>
        {pose === 'success' && <g className="firefly-courier__celebration" fill="#f5d395">
            <path d="m11 10 2-7 2 7 7 2-7 2-2 7-2-7-7-2Zm88 20 2-8 2 8 8 2-8 2-2 8-2-8-8-2Z" />
            <circle cx="95" cy="9" r="2.5" /><circle cx="8" cy="111" r="2.5" />
        </g>}
    </svg>;
}
