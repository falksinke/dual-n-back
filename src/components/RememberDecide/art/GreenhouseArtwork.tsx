import { useId } from 'react';

/** Permanent scenery only. It has no phase, location, pattern, answer, or score input. */
export default function GreenhouseArtwork() {
    const id = useId();
    const sky = `${id}-sky`;
    const glass = `${id}-glass`;
    const light = `${id}-light`;
    return (
        <svg className="moth-greenhouse__art" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id={sky} x2="0" y2="1">
                    <stop stopColor="#15253a" /><stop offset="1" stopColor="#2f4953" />
                </linearGradient>
                <linearGradient id={glass} x2="0" y2="1">
                    <stop stopColor="#476764" stopOpacity=".3" /><stop offset="1" stopColor="#5c7c6c" stopOpacity=".4" />
                </linearGradient>
                <radialGradient id={light}>
                    <stop stopColor="#efd296" stopOpacity=".21" /><stop offset="1" stopColor="#efd296" stopOpacity="0" />
                </radialGradient>
            </defs>
            <path d="M0 0h640v640H0z" fill={`url(#${sky})`} />
            <g fill="#dfd8b5">
                <circle cx="57" cy="64" r="2" /><circle cx="164" cy="31" r="1.5" /><circle cx="484" cy="44" r="2" />
                <circle cx="576" cy="139" r="1.5" /><circle cx="426" cy="22" r="1.5" /><circle cx="39" cy="231" r="1.5" />
                <circle cx="596" cy="312" r="1.5" /><circle cx="214" cy="51" r="1" />
                <path d="M562 46a26 26 0 1 0 27 38 28 28 0 0 1-27-38" fill="#e1d9b5" />
            </g>
            <path d="M0 463q48-79 94-45 44-101 97-16 60-85 104-7 57-60 109 4 62-58 95 6 81-64 141 19v216H0z" fill="#1b3540" />
            <path d="M52 595V153L320 35l268 118v442z" fill={`url(#${glass})`} stroke="#202f38" strokeWidth="15" strokeLinejoin="round" />
            <path d="M52 595V153L320 35l268 118v442" fill="none" stroke="#7a9183" strokeWidth="7" strokeLinejoin="round" />
            <g fill="none" stroke="#6a8378" strokeWidth="4">
                <path d="M56 154h528M56 267h528M56 390h528M56 513h528M168 105v480M320 38v548M472 105v480" />
                <path d="m168 105 152 49 152-49" />
            </g>
            <g fill="none" stroke="#d7e1ca" strokeWidth="3" opacity=".11">
                <path d="m73 175 32-9m-31 17 66-16M350 191l58-15M492 311l51-14M190 426l33-9M343 537l55-15" />
            </g>
            <g fill="none" stroke="#617f6d" strokeWidth="3" strokeLinecap="round">
                <path d="M43 444q-10-80 0-147t1-92M598 450q17-70-2-144t5-97" />
            </g>
            <g fill="#6f8972">
                <path d="M43 365q-33 0-28-30 26 0 28 30m-3-62q-20-13-15-32 26 2 15 32m3-62q19-6 22-26-25-5-22 26m-2 160q20-5 23-27-25-3-23 27" />
                <path d="M599 367q32 0 26-30-25 1-26 30m0-65q21-13 14-32-24 4-14 32m2-61q-20-7-24-25 27-5 24 25m-2 159q-22-4-24-27 25-2 24 27" />
            </g>
            <path d="M0 606h640v34H0z" fill="#6c7568" />
            <path d="M0 622h640M80 606l-8 34m138-34-3 34m223-34 3 34m128-34 8 34" fill="none" stroke="#4e605b" strokeWidth="2" />
            {/* Shelf positions follow the single fixed garden slot; never a remembered item. */}
            <g stroke="#283d3c" strokeWidth="3" strokeLinejoin="round">
                {[246, 365, 484, 603].map((y) => (
                    <g key={y}>
                        <path d={`M82 ${y}h476v10H82z`} fill="#ac9873" />
                        <path d={`M90 ${y + 10}h460v7H90z`} fill="#53665b" />
                        <path d={`M104 ${y + 17}v15m432-15v15`} fill="none" stroke="#445b52" strokeWidth="7" />
                    </g>
                ))}
            </g>
            <g fill="#d5c9a4" opacity=".6">
                <circle cx="92" cy="251" r="1.5" /><circle cx="548" cy="251" r="1.5" />
                <circle cx="92" cy="370" r="1.5" /><circle cx="548" cy="370" r="1.5" />
                <circle cx="92" cy="489" r="1.5" /><circle cx="548" cy="489" r="1.5" />
            </g>
            <ellipse cx="320" cy="139" rx="157" ry="122" fill={`url(#${light})`} />
            <path d="M320 0v65" stroke="#172e36" strokeWidth="4" />
            <path d="M308 68q12-12 24 0l18 26h-60z" fill="#b69b67" stroke="#2c4344" strokeWidth="3" />
            <path d="M295 94h50" stroke="#e5c58a" strokeWidth="5" strokeLinecap="round" />
            <path d="M312 96a8 8 0 0 0 16 0" fill="#fae6ae" />
            <g transform="translate(576 544)" stroke="#283f41" strokeWidth="3" strokeLinejoin="round">
                <path d="M1 31q-3-23 15-23t17 23" fill="none" stroke="#8a9c85" strokeWidth="5" />
                <path d="M1 25h29l3 37H-2z" fill="#809582" />
                <path d="m28 37 21-16 4 6-22 27" fill="#a5b29b" />
                <path d="m44 21 11-7 5 9-11 7" fill="#a5b29b" />
                <path d="M6 34v19" stroke="#b8c1a1" />
            </g>
        </svg>
    );
}
