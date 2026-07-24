// Íconos de línea, estilo ejecutivo/jurídico. Heredan el color (currentColor)
// y el tamaño se controla por CSS (width/height sobre el <svg>).

const base = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
}

const dot = (cx, cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.85" fill="currentColor" stroke="none" />

// Honorarios → calculadora
export function IconHonorarios(props) {
    return (
        <svg {...base} {...props}>
            <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
            <rect x="8" y="5.5" width="8" height="3" rx="0.6" />
            {[12, 15.5, 19].flatMap(cy => [9, 12, 15].map(cx => dot(cx, cy)))}
        </svg>
    )
}

// Abono → billete
export function IconAbono(props) {
    return (
        <svg {...base} {...props}>
            <rect x="2.5" y="6" width="19" height="12" rx="2" />
            <circle cx="12" cy="12" r="2.6" />
            {dot(6, 12)}
            {dot(18, 12)}
        </svg>
    )
}

// Acuerdo → documento / contrato
export function IconAcuerdo(props) {
    return (
        <svg {...base} {...props}>
            <path d="M13.5 2.5H7A1.5 1.5 0 0 0 5.5 4v16A1.5 1.5 0 0 0 7 21.5h10a1.5 1.5 0 0 0 1.5-1.5V7.5z" />
            <path d="M13.5 2.5V7.5H18.5" />
            <line x1="8.5" y1="12.5" x2="15.5" y2="12.5" />
            <line x1="8.5" y1="15.5" x2="15.5" y2="15.5" />
            <line x1="8.5" y1="18.5" x2="12.5" y2="18.5" />
        </svg>
    )
}

export const ICONS = {
    honorarios: IconHonorarios,
    abono: IconAbono,
    acuerdo: IconAcuerdo,
}
