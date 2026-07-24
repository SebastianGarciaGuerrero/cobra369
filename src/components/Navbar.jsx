import logoHadad from '../assets/logo-hadad-hd.png'

const LINKS = [
    { id: 'honorarios', icon: '📊', label: 'Honorarios' },
    { id: 'abono', icon: '💰', label: 'Abono' },
    { id: 'acuerdo', icon: '📄', label: 'Acuerdo' },
]

export default function Navbar({ view, navigate }) {
    return (
        <nav className="navbar">
            <button className="nav-brand" onClick={() => navigate('home')} title="Inicio">
                <img src={logoHadad} alt="Hadad & Asociados" className="nav-logo" />
                <span className="nav-brand-text">
                    <strong>Hadad &amp; Asociados</strong>
                    <small>Calculadora de Cobranza</small>
                </span>
            </button>

            <div className="nav-links">
                {LINKS.map(l => (
                    <button
                        key={l.id}
                        className={`nav-link ${view === l.id ? 'active' : ''}`}
                        onClick={() => navigate(l.id)}
                    >
                        <span className="nav-link-icon">{l.icon}</span>
                        {l.label}
                    </button>
                ))}
            </div>
        </nav>
    )
}
