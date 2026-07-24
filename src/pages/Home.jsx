import { ICONS } from '../components/icons'

const MODULES = [
    {
        id: 'honorarios',
        title: 'Honorarios 3-6-9',
        desc: 'Calcula gastos extrajudiciales sobre un capital usando la tabla escalonada en UF.',
        color: '#8b5cf6',
    },
    {
        id: 'abono',
        title: 'Cálculo de Abono',
        desc: 'Dado un abono recibido, determina cuánto corresponde a honorarios y cuánto es capital neto.',
        color: '#10b981',
    },
    {
        id: 'acuerdo',
        title: 'Acuerdo de Pago',
        desc: 'Genera un pagaré con cuotas, intereses y gastos de cobranza 3-6-9 por cuota.',
        color: '#3b82f6',
    },
]

export default function Home({ navigate }) {
    return (
        <main className="home">
            <header className="home-header">
                <div className="home-logo">⚖️</div>
                <h1>Calculadora de Cobranza</h1>
                <p>Gastos Extrajudiciales · Uso interno</p>
            </header>

            <div className="cards-grid">
                {MODULES.map(m => {
                    const Icon = ICONS[m.id]
                    return (
                        <button
                            key={m.id}
                            className="module-card"
                            onClick={() => navigate(m.id)}
                            style={{ '--accent': m.color }}
                        >
                            <span className="card-icon"><Icon /></span>
                            <div className="card-body">
                                <h2>{m.title}</h2>
                                <p>{m.desc}</p>
                            </div>
                            <span className="card-arrow">→</span>
                        </button>
                    )
                })}
            </div>
        </main>
    )
}