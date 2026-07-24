import { ICONS } from './icons'

const LINKS = [
    { id: 'honorarios', label: 'Honorarios' },
    { id: 'abono', label: 'Abono' },
    { id: 'acuerdo', label: 'Acuerdo' },
]

export default function Navbar({ view, navigate }) {
    return (
        <nav className="navbar">
            <button className="nav-brand" onClick={() => navigate('home')} title="Inicio">
                <img src="/cubo.png" alt="Calculadora de Cobranza" className="nav-logo" />
                <span className="nav-brand-text">
                    <strong>CalculaCobra</strong>
                    <small>Calculadora de Cobranza</small>
                </span>
            </button>

            <div className="nav-links">
                {LINKS.map(l => {
                    const Icon = ICONS[l.id]
                    return (
                        <button
                            key={l.id}
                            className={`nav-link ${view === l.id ? 'active' : ''}`}
                            onClick={() => navigate(l.id)}
                        >
                            <span className="nav-link-icon"><Icon /></span>
                            {l.label}
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}
