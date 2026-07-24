import { useState } from 'react'
import Home from './pages/Home'
import Honorarios369 from './modules/Honorarios369'
import AbonoCalc from './modules/AbonoCalc'
import AcuerdoCalc from './modules/AcuerdoCalc'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

export default function App() {
  const [view, setView] = useState('home')

  return (
    <div className="app">
      <Navbar view={view} navigate={setView} />
      <div className="app-body">
        {view === 'home' && <Home navigate={setView} />}
        {view === 'honorarios' && <Honorarios369 />}
        {view === 'abono' && <AbonoCalc />}
        {view === 'acuerdo' && <AcuerdoCalc />}
      </div>
      <Footer />
    </div>
  )
}