/** Original, decorative railway artwork. No task identities or round objects belong here. */
export type RailwayMood = 'dispatch' | 'memorise' | 'sealed' | 'unload' | 'success' | 'review' | 'paused' | 'audio' | 'error';

export function RailwayBadge() {
    return (
        <svg viewBox="0 0 48 48" className="swapping-brand__badge" aria-hidden="true" focusable="false">
            <rect x="1" y="1" width="46" height="46" rx="13" fill="#18313c" />
            <path d="M14 37 18 31M34 37 30 31M16 35h16" fill="none" stroke="#deb779" strokeWidth="2" />
            <rect x="15" y="10" width="18" height="23" rx="6" fill="none" stroke="#edcf99" strokeWidth="2" />
            <path d="M19 14h10v10H19zM24 14v10" fill="none" stroke="#edcf99" strokeWidth="1.5" />
            <circle cx="20" cy="28" r="1.6" fill="#edcf99" /><circle cx="28" cy="28" r="1.6" fill="#edcf99" />
        </svg>
    );
}

/** A deliberately uniform crate; its only variable mark is supplied separately by Board. */
export function CargoCrateArt({ topDown = false }: { topDown?: boolean }) {
    if (topDown) {
        return (
            <svg viewBox="0 0 100 100" className="swapping-cargo__art" aria-hidden="true" focusable="false">
                <rect x="8" y="8" width="84" height="84" rx="2" fill="#bf956d" stroke="#30333a" strokeWidth="3" />
                <path d="M11 28h78M11 48h78M11 68h78" stroke="#987451" strokeWidth="2" />
                <path d="M15 12v76m70-76v76" stroke="#e0ba85" strokeWidth="9" />
                <path d="M21 12v76m58-76v76" stroke="#866244" strokeWidth="2" />
                <path d="M12 14h76M12 86h76" stroke="#d5ae7c" strokeWidth="6" />
                <g fill="#594b3d"><circle cx="15" cy="16" r="2" /><circle cx="85" cy="16" r="2" /><circle cx="15" cy="84" r="2" /><circle cx="85" cy="84" r="2" /></g>
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 100 100" className="swapping-cargo__art" aria-hidden="true" focusable="false">
            <path d="m8 16 10-9h65l10 9v71H8Z" fill="#785745" stroke="#302f35" strokeWidth="3" strokeLinejoin="round" />
            <path d="M9 17h83v69H9z" fill="#be916a" />
            <path d="M10 18h81v11H10zM10 74h81v11H10z" fill="#d5ad7e" />
            <path d="M10 31h81M10 54h81M10 74h81" stroke="#967353" strokeWidth="2" />
            <path d="M17 19v66M83 19v66" stroke="#76563f" strokeWidth="5" />
            <path d="m10 15 9-6h63l8 6" fill="#e0b98a" />
            <path d="m23 22 10 1m36 54 8-1M28 79h15" stroke="#ac825d" strokeWidth="1.5" strokeLinecap="round" />
            <g fill="#3a3d41"><circle cx="17" cy="24" r="1.5" /><circle cx="83" cy="24" r="1.5" /><circle cx="17" cy="80" r="1.5" /><circle cx="83" cy="80" r="1.5" /></g>
            <path d="M9 87h83v5H9z" fill="#483b35" />
        </svg>
    );
}

/** All covers have exactly the same silhouette, colour and details. Never vary by cargo. */
export function CargoCoverArt({ topDown = false }: { topDown?: boolean }) {
    if (topDown) {
        return (
            <svg viewBox="0 0 100 100" className="swapping-cargo__art swapping-cargo__cover" aria-hidden="true" focusable="false">
                <rect x="8" y="8" width="84" height="84" rx="4" fill="#3e5965" stroke="#162c39" strokeWidth="3" />
                <rect x="16" y="16" width="68" height="68" rx="2" fill="#314b59" stroke="#728389" strokeWidth="2" />
                <path d="M23 29h54M23 41h54M23 53h54M23 65h54M23 77h54" stroke="#233b49" strokeWidth="3" />
                <path d="M23 31h54M23 43h54M23 55h54M23 67h54M23 79h54" stroke="#526b74" strokeWidth="1" />
                <rect x="43" y="62" width="14" height="11" rx="2" fill="#b89967" stroke="#172d3b" strokeWidth="2" />
                <path d="M46 62v-4a4 4 0 0 1 8 0v4" fill="none" stroke="#b89967" strokeWidth="2.5" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 100 100" className="swapping-cargo__art swapping-cargo__cover" aria-hidden="true" focusable="false">
            <path d="M8 90V28Q8 11 24 11h52q16 0 16 17v62Z" fill="#384f5c" stroke="#14232e" strokeWidth="3" />
            <path d="M11 29q0-14 14-14h50q14 0 14 14" fill="#4f6871" />
            <path d="M18 33h64M18 44h64M18 55h64M18 66h64M18 77h64" stroke="#243c49" strokeWidth="3" />
            <path d="M18 35h64M18 46h64M18 57h64M18 68h64M18 79h64" stroke="#536b74" strokeWidth="1" />
            <path d="M8 86h84v6H8z" fill="#263644" />
            <rect x="43" y="68" width="14" height="11" rx="2" fill="#b89967" stroke="#14232e" strokeWidth="2" />
            <path d="M46 68v-4a4 4 0 0 1 8 0v4" fill="none" stroke="#b89967" strokeWidth="2.5" />
        </svg>
    );
}

export function WagonBaseArt() {
    return (
        <svg viewBox="0 0 100 24" className="swapping-wagon-base" aria-hidden="true" focusable="false">
            <path d="M0 7h100M9 3h82v9H9z" fill="#37565e" stroke="#101f29" strokeWidth="3" />
            <circle cx="24" cy="15" r="7" fill="#152733" stroke="#657780" strokeWidth="2" />
            <circle cx="76" cy="15" r="7" fill="#152733" stroke="#657780" strokeWidth="2" />
            <path d="M24 15h52" stroke="#a08f79" strokeWidth="2" />
        </svg>
    );
}

export function RadioArt() {
    return (
        <svg viewBox="0 0 120 112" className="swapping-radio__art" aria-hidden="true" focusable="false">
            <path d="m94 32 11-28" stroke="#1b2b32" strokeWidth="4" strokeLinecap="round" />
            <path d="M21 36V22q0-6 6-6h47q6 0 6 6v14" fill="none" stroke="#3c5055" strokeWidth="7" />
            <rect x="9" y="30" width="102" height="69" rx="10" fill="#20343b" />
            <rect x="9" y="27" width="102" height="65" rx="10" fill="#597674" stroke="#1d3037" strokeWidth="3" />
            <rect x="18" y="39" width="52" height="40" rx="5" fill="#304d51" />
            <path d="M25 47h38M25 55h38M25 63h38M25 71h38" stroke="#95aaa0" strokeWidth="3" strokeLinecap="round" />
            <rect x="79" y="38" width="22" height="12" rx="2" fill="#ebd6a3" />
            <path d="M83 42v4m4-4v4m4-4v4m4-4v4" stroke="#a68e62" />
            <circle cx="90" cy="67" r="11" fill="#1d343e" stroke="#adc1b2" strokeWidth="2" />
            <path d="m90 67 5-5" stroke="#e9d4a5" strokeWidth="2" />
            <circle className="swapping-radio__lamp" cx="21" cy="85" r="2.5" fill="#eed096" />
            <path d="M15 103h90" stroke="#0f202a" strokeWidth="3" strokeLinecap="round" opacity=".35" />
        </svg>
    );
}

export function StationmasterArt({ mood }: { mood: RailwayMood }) {
    const pleased = mood === 'success';
    const resting = mood === 'paused' || mood === 'dispatch';
    return (
        <svg viewBox="0 0 96 144" className={`swapping-stationmaster${pleased ? ' is-pleased' : ''}`} aria-hidden="true" focusable="false">
            <ellipse cx="49" cy="138" rx="32" ry="5" fill="#101b27" opacity=".35" />
            <g className="swapping-stationmaster__body">
                <path d="m33 106-2 24h15l2-24m6 0 1 24h15l-7-27" fill="#243c4a" stroke="#142630" strokeWidth="2" />
                <path d="M29 129h17v8H24q-2-6 5-8m26 0h14q8 1 8 8H55z" fill="#142630" />
                <path d="M29 68q19-10 36 0l9 44H23Z" fill="#527782" stroke="#17333f" strokeWidth="3" strokeLinejoin="round" />
                <path d="m42 66 6 13 8-13" fill="#ecdbc2" /><path d="m48 77-4 19 6 6 4-6-4-19" fill="#cf9a62" />
                <path d="M48 104v7m12-29h8" stroke="#253f4c" strokeWidth="2" />
                <circle cx="48" cy="106" r="2" fill="#dec492" />
                <path d="M30 72 19 98l11 6 10-21M65 72l14 24-10 10-9-25" fill="#527782" stroke="#17333f" strokeWidth="3" strokeLinecap="round" />
                <rect x="17" y="91" width="11" height="13" rx="5" fill="#d7a788" />
                <rect x="62" y="96" width="12" height="13" rx="5" fill="#d7a788" />
                <path d="m21 89 24 4-4 28-24-4Z" fill="#cba66e" stroke="#213642" strokeWidth="2" />
                <path d="m24 95 14 2m-15 4 14 2m-15 4 10 1" stroke="#886e4e" strokeWidth="2" />
                <rect x="43" y="56" width="13" height="14" rx="4" fill="#c99577" />
                <path d="M30 37q0-18 20-18t20 18v13q-2 15-19 15T30 48Z" fill="#e4b89a" stroke="#3c4145" strokeWidth="2" />
                <ellipse cx="29" cy="44" rx="4" ry="6" fill="#dcae91" /><ellipse cx="70" cy="44" rx="4" ry="6" fill="#dcae91" />
                <path d="M30 41V29h7v13m28 0V29h5v13" fill="#ddd7c7" />
                {resting || pleased ? (
                    <path d={pleased ? 'M39 43q3-4 6 0m11 0q3-4 6 0' : 'M39 44h6m11 0h6'} fill="none" stroke="#344049" strokeWidth="2" strokeLinecap="round" />
                ) : (
                    <g fill="#344049"><circle cx="42" cy="43" r="1.7" /><circle cx="59" cy="43" r="1.7" /></g>
                )}
                <path d="M49 45v5h5" fill="none" stroke="#bb876f" strokeWidth="2" strokeLinecap="round" />
                <path d="M39 55q5-8 12-3 6-5 12 3-6 7-12 2-6 5-12-2" fill="#eae3cf" />
                <path d={pleased ? 'M46 59q5 5 10 0' : 'M47 60h7'} fill="none" stroke="#956c5e" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M26 29q-5-17 24-20 24 0 25 20Z" fill="#31505e" stroke="#182f3c" strokeWidth="3" />
                <path d="M26 27h48v7H26z" fill="#cea86a" /><path d="M25 32q21 11 50 0" fill="#203c4a" stroke="#142a36" strokeWidth="3" strokeLinecap="round" />
                <path d="m50 17 5 3-1 5h-8l-1-5Z" fill="#e7c68b" />
            </g>
        </svg>
    );
}

export function PlatformCatArt({ awake = false }: { awake?: boolean }) {
    return (
        <svg viewBox="0 0 105 67" className={`swapping-cat${awake ? ' is-awake' : ''}`} aria-hidden="true" focusable="false">
            <ellipse cx="51" cy="60" rx="45" ry="5" fill="#10202a" opacity=".3" />
            <path className="swapping-cat__tail" d="M69 53q36 8 25-18" fill="none" stroke="#ac8b73" strokeWidth="9" strokeLinecap="round" />
            <path d="M18 57q-5-32 26-31 30 0 35 31Z" fill="#bd9b7b" stroke="#243341" strokeWidth="2" />
            <path d="m16 36 2-23 15 12 16-8 5 23q-4 17-20 17T16 36" fill="#d0ae86" stroke="#243341" strokeWidth="2" strokeLinejoin="round" />
            <path d="m21 26 1-7 6 8m15 1 5-5 1 8" fill="#a87e6d" />
            {awake ? <g fill="#303947"><ellipse cx="26" cy="37" rx="2" ry="3" /><ellipse cx="44" cy="35" rx="2" ry="3" /></g> : <path d="m23 38 7 1m10-3 7-1" stroke="#303947" strokeWidth="2" strokeLinecap="round" />}
            <path d="m33 42 5-1-2 4Z" fill="#694e4d" /><path d="M22 45 10 43m13 6-12 2m33-8 13-4m-13 7 14 2" stroke="#675e59" strokeWidth="1.3" />
            <path d="M50 30v11m8-9 2 12m-6 12h13" stroke="#9e7a5d" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

export function LocomotiveArt() {
    return (
        <svg viewBox="0 0 240 132" className="swapping-locomotive" aria-hidden="true" focusable="false">
            <g className="swapping-locomotive__steam" fill="#bdd0c8" opacity=".35">
                <ellipse cx="181" cy="20" rx="10" ry="6" /><ellipse cx="164" cy="11" rx="14" ry="8" />
            </g>
            <path d="M12 100h220" stroke="#142531" strokeWidth="9" strokeLinecap="round" />
            <rect x="22" y="30" width="67" height="65" rx="4" fill="#527579" stroke="#162a37" strokeWidth="4" />
            <path d="M18 30q32-14 75 0" fill="#2b4754" stroke="#142b37" strokeWidth="6" strokeLinecap="round" />
            <path d="M34 40h18v26H34zm27 0h17v26H61z" fill="#e9c783" stroke="#243b43" strokeWidth="3" />
            <path d="M89 53h99q19 0 19 21v18H89Z" fill="#608589" stroke="#162a37" strokeWidth="4" />
            <path d="M126 55v36m41-37v37" stroke="#d0b77c" strokeWidth="5" />
            <path d="M176 53V34h15v19m-19-19h23" fill="#304854" stroke="#162a37" strokeWidth="5" />
            <path d="M99 53v-7a12 12 0 0 1 24 0v7" fill="#b59868" stroke="#1c3440" strokeWidth="3" />
            <path d="m211 93 22 15h-27" fill="#a7755f" stroke="#162a37" strokeWidth="3" />
            <rect x="24" y="87" width="182" height="12" rx="2" fill="#a8755e" stroke="#172c39" strokeWidth="3" />
            <circle cx="210" cy="74" r="10" fill="#eaca84" stroke="#2a3b42" strokeWidth="4" />
            <circle cx="48" cy="107" r="15" fill="#243d4a" stroke="#a6b3a4" strokeWidth="3" />
            <circle cx="115" cy="104" r="20" fill="#243d4a" stroke="#a6b3a4" strokeWidth="3" />
            <circle cx="171" cy="104" r="20" fill="#243d4a" stroke="#a6b3a4" strokeWidth="3" />
            <path d="M100 104h30m-15-15v30m41-15h30m-15-15v30" stroke="#617d81" strokeWidth="3" />
            <path d="m48 107 67 4h56" stroke="#c7b68b" strokeWidth="4" strokeLinecap="round" />
            <circle cx="115" cy="111" r="3" fill="#1b3541" /><circle cx="171" cy="111" r="3" fill="#1b3541" />
        </svg>
    );
}

/** The distant train always has three generic, unmarked wagons, unrelated to task length. */
export function ScenicTrainArt() {
    return (
        <div className="swapping-scenic-train" aria-hidden="true">
            <svg viewBox="0 0 255 82" className="swapping-scenic-train__wagons" focusable="false">
                {[0, 85, 170].map((x) => (
                    <g key={x} transform={`translate(${x} 0)`}>
                        <path d="M5 55V20q0-12 12-12h51q12 0 12 12v35Z" fill="#415864" stroke="#172a36" strokeWidth="3" />
                        <path d="M14 24h57M14 33h57M14 42h57" stroke="#2b414f" strokeWidth="3" />
                        <path d="M0 60h85M7 53h72v10H7z" fill="#426169" stroke="#172a36" strokeWidth="3" />
                        <circle cx="22" cy="70" r="8" fill="#1d303b" stroke="#869590" strokeWidth="2" /><circle cx="63" cy="70" r="8" fill="#1d303b" stroke="#869590" strokeWidth="2" />
                    </g>
                ))}
            </svg>
            <LocomotiveArt />
        </div>
    );
}

export function StationBackdrop({ mood }: { mood: RailwayMood }) {
    const clear = mood === 'success';
    return (
        <svg viewBox="0 0 1200 420" className="swapping-scenery" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
            <rect width="1200" height="420" fill="#172536" />
            <path d="M0 157Q180 70 350 156T710 142 1200 119V330H0Z" fill="#203447" />
            <path d="M0 244q149-92 260-28t295-23 315 22 330-35v204H0Z" fill="#293e50" />
            <g fill="#b4c2c7" opacity=".65">
                <circle cx="94" cy="62" r="1.4" /><circle cx="195" cy="30" r="1" /><circle cx="321" cy="75" r="1.4" /><circle cx="493" cy="43" r="1.2" /><circle cx="642" cy="23" r="1.5" /><circle cx="759" cy="62" r="1" /><circle cx="967" cy="33" r="1.3" /><circle cx="1075" cy="115" r="1" /><circle cx="1144" cy="66" r="1.4" /><circle cx="575" cy="105" r="1" />
            </g>
            <circle cx="1032" cy="77" r="24" fill="#d8d2b4" /><circle cx="1043" cy="69" r="24" fill="#172536" />
            <path d="M0 265h43v-75h86v37h62v-36h59v97H0m726-36h77v-39h62v-42h55v32h91v-23h78v51h111v71H726" fill="#1c303f" />
            <g fill="#c4a57a" opacity=".7">
                <path d="M61 209h8v13h-8zm19 0h8v13h-8zm128 6h7v13h-7zm609 18h8v12h-8zm66-47h7v12h-7zm154 6h7v12h-7zm18 0h7v12h-7z" />
            </g>
            <path d="M16 156v141m-16-116h40m-34 9h29M1134 157v168m-22-143h44m-35 8h27" stroke="#152838" strokeWidth="5" />
            <path d="M17 184q376 63 1119 0" fill="none" stroke="#243a4b" strokeWidth="2" />
            <path d="M0 354h1200v66H0Z" fill="#344651" />
            <path d="M0 379h1200M0 388h1200" stroke="#a79a7c" strokeWidth="3" />
            <path d="M0 395h1200" stroke="#172d3a" strokeWidth="9" />
            <g stroke="#203541" strokeWidth="7">
                {Array.from({ length: 25 }, (_, i) => <path key={i} d={`m${i * 50} 391-12 28`} />)}
            </g>
            <g>
                <path d="M282 159h308v195H282Z" fill="#8c6f63" stroke="#152c3a" strokeWidth="4" />
                <path d="M282 306h308v48H282Z" fill="#745d57" />
                <path d="M297 186h270M297 201h270M297 314h270M297 333h270" stroke="#a17d68" strokeWidth="2" />
                <path d="M303 145v-38h32v38" fill="#8b6e61" stroke="#1e3140" strokeWidth="4" />
                <path d="M297 106h43" stroke="#b99a7c" strokeWidth="6" />
                <path d="m261 162 52-42h237l60 42Z" fill="#405563" stroke="#152b39" strokeWidth="5" strokeLinejoin="round" />
                <path d="M279 153h311M295 140h280" stroke="#60717a" strokeWidth="3" />
                <path d="M303 210h69v107h-69Z" fill="#e3bf87" stroke="#273b47" strokeWidth="7" />
                <path d="M338 211v105m-33-63h64" stroke="#715a50" strokeWidth="4" />
                <path d="M491 210h70v107h-70Z" fill="#e3bf87" stroke="#273b47" strokeWidth="7" />
                <path d="M526 211v105m-33-63h64" stroke="#715a50" strokeWidth="4" />
                <path d="M397 354V232a33 33 0 0 1 66 0v122Z" fill="#304b56" stroke="#283947" strokeWidth="5" />
                <path d="M405 234a25 25 0 0 1 50 0v38h-50Z" fill="#eccf92" /><path d="M430 210v63" stroke="#304b56" strokeWidth="4" />
                <path d="M406 287h48v56h-48Z" fill="none" stroke="#5d7578" strokeWidth="3" /><circle cx="451" cy="279" r="3" fill="#e6c68a" />
                <circle cx="431" cy="162" r="22" fill="#ecdab4" stroke="#223744" strokeWidth="5" />
                <path d="M431 145v4m17 13h-4m-13 17v-4m-17-13h4m13 0-1-11m1 11 9 3" fill="none" stroke="#4a514e" strokeWidth="2" strokeLinecap="round" />
                <path d="M278 348h316v12H278Z" fill="#bba185" stroke="#263845" strokeWidth="3" />
            </g>
            <g>
                <path d="M585 237h336v117H585Z" fill="#263d4b" stroke="#152b39" strokeWidth="4" />
                <path d="m569 238 33-31h290l42 31Z" fill="#3f5863" stroke="#152b39" strokeWidth="4" />
                <path d="M600 252h118v102H600Z" fill="#1b2e3b" />
                <path d="M733 252h167v100H733Z" fill="#38505c" stroke="#203340" strokeWidth="3" />
                <path d="M739 268h156M739 282h156M739 296h156M739 310h156M739 324h156M739 338h156" stroke="#253b49" strokeWidth="4" />
                <rect x="803" y="277" width="26" height="13" rx="2" fill="#c1a77c" /><path d="M811 283h10" stroke="#544d42" strokeWidth="2" />
                <path d="M588 242v117m133-116v116m196-116v116" stroke="#81948f" strokeWidth="5" />
                <path d="M579 241h352" stroke="#b9b294" strokeWidth="4" />
                <path d="M635 244v12m202-12v12" stroke="#afab90" strokeWidth="3" />
                <path d="m623 262 4-9h17l4 9Zm202 0 4-9h17l4 9Z" fill="#182c39" />
                <path d="M629 262h14m189 0h13" stroke="#ebce91" strokeWidth="5" strokeLinecap="round" />
                <path d="m632 265-39 88h88l-42-88m195 0-39 88h88l-42-88" fill="#edca8b" opacity=".055" />
            </g>
            <g>
                <path d="M179 352V207q0-19 21-19h14" fill="none" stroke="#152c39" strokeWidth="7" />
                <path d="m200 202 5-17h22l5 17Z" fill="#192f3c" stroke="#536a70" strokeWidth="2" />
                <path d="M206 202v15h19v-15" fill="#e7c58c" stroke="#293e47" strokeWidth="3" />
                <path d="m209 218-52 134h117l-52-134" fill="#e7c58c" opacity=".07" />
                <path d="M1036 353V240" stroke="#142a38" strokeWidth="9" /><path d="M1034 343V253" stroke="#82938a" strokeWidth="3" />
                <rect x="1021" y="208" width="30" height="61" rx="14" fill="#112633" stroke="#718780" strokeWidth="3" />
                <circle cx="1036" cy="224" r="8" fill={clear ? '#4a5756' : '#d9ac75'} /><circle cx="1036" cy="250" r="8" fill={clear ? '#aad4ae' : '#334b48'} />
                <path d="M1024 353h24" stroke="#1b2e3b" strokeWidth="7" />
            </g>
            <g fill="#203941" stroke="#132b36" strokeWidth="2">
                <path d="M1074 355q-10-42 10-28 2-27 13-12 18-10 15 19 17 1 6 21Z" /><path d="M77 359q-5-32 9-28 8-24 18-9 19-6 12 24 12 1 9 13Z" />
            </g>
            <g fill="#b7a184" opacity=".5"><path d="M130 365h14v2h-14m-55 7h8v2h-8m1040-8h13v2h-13m-151-4h7v2h-7" /></g>
        </svg>
    );
}
