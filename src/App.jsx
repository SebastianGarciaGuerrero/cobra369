import { useState } from 'react'
import Home from './pages/Home'
import Honorarios369 from './modules/Honorarios369'
import AbonoCalc from './modules/AbonoCalc'
import AcuerdoCalc from './modules/AcuerdoCalc'

export default function App() {
  const [view, setView] = useState('home')

  return (
    <div className="app">
      {view !== 'home' && (
        <nav className="top-nav">
          <button className="btn-back" onClick={() => setView('home')}>
            ← Volver
          </button>
          <span className="nav-title">Calculadora Cobranza</span>
        </nav>
      )}

      {view === 'home' && <Home navigate={setView} />}
      {view === 'honorarios' && <Honorarios369 />}
      {view === 'abono' && <AbonoCalc />}
      {view === 'acuerdo' && <AcuerdoCalc />}
    </div>
  )
}