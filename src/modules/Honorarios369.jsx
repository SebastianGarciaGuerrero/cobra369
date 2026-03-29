import { useState } from 'react'
import { calcularHonorarios369, formatCLP, parseCLPInput } from '../utils/calculos'
import { guardarUF, cargarUF } from '../utils/ufStorage'
import CopyBtn from '../components/CopyBtn'

export default function Honorarios369() {
    const [capital, setCapital] = useState('')
    const [uf, setUf] = useState(() => cargarUF())
    const [resultado, setResultado] = useState(null)
    const [error, setError] = useState('')

    function handleCalcular() {
        setError('')
        const cap = parseCLPInput(capital)
        const ufV = parseCLPInput(uf)
        if (isNaN(cap) || cap <= 0) { setError('Ingresa un capital válido mayor a 0.'); return }
        if (isNaN(ufV) || ufV <= 0) { setError('Ingresa un valor de UF válido.'); return }
        setResultado(calcularHonorarios369(cap, ufV))
    }

    const tranches = resultado ? [
        { label: 'Hasta 10 UF', monto: resultado.monto1, pct: '9%', hon: resultado.hon1 },
        resultado.monto2 > 0 && { label: '11 a 50 UF', monto: resultado.monto2, pct: '6%', hon: resultado.hon2 },
        resultado.monto3 > 0 && { label: 'Resto (> 50 UF)', monto: resultado.monto3, pct: '3%', hon: resultado.hon3 },
    ].filter(Boolean) : []

    return (
        <div className="module-view">
            <div className="mv-header">
                <span className="mv-icon">📊</span>
                <h2>Honorarios 3-6-9</h2>
            </div>

            <div className="form-card">
                <div className="form-row">
                    <div className="form-group">
                        <label>Capital ($ CLP)</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ej: 7.266.342"
                            value={capital}
                            onChange={e => {
                                const raw = e.target.value.replace(/\D/g, '')
                                setCapital(raw === '' ? '' : Number(raw).toLocaleString('es-CL'))
                            }}
                            onKeyDown={e => e.key === 'Enter' && handleCalcular()}
                        />
                    </div>
                    <div className="form-group">
                        <label>Valor UF del día</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ej: 39.841,72"
                            value={uf}
                            onChange={e => setUf(e.target.value)}
                            onBlur={e => { if (e.target.value) guardarUF(e.target.value) }}
                            onKeyDown={e => e.key === 'Enter' && handleCalcular()}
                        />
                    </div>
                </div>
                {error && <p className="error-msg">{error}</p>}
                <button className="btn-primary" onClick={handleCalcular}>Calcular honorarios</button>
            </div>

            {resultado && (
                <div className="result-card">
                    <div className="result-header">
                        <h3>Resultado</h3>
                        <span className="badge-uf">{resultado.capitalUF.toFixed(4)} UF</span>
                    </div>

                    <table className="tranche-table">
                        <thead>
                            <tr><th>Tramo</th><th>Monto base</th><th>%</th><th>Honorarios</th><th></th></tr>
                        </thead>
                        <tbody>
                            {tranches.map((t, i) => (
                                <tr key={i}>
                                    <td>{t.label}</td>
                                    <td>{formatCLP(t.monto)}</td>
                                    <td className="col-pct">{t.pct}</td>
                                    <td className="col-hon">{formatCLP(t.hon)}</td>
                                    <td><CopyBtn value={Math.round(t.hon)} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="totals-grid">
                        <div className="total-box">
                            <span className="t-label">Total honorarios</span>
                            <div className="t-row">
                                <span className="t-value">{formatCLP(resultado.totalHonorarios)}</span>
                                <CopyBtn value={Math.round(resultado.totalHonorarios)} />
                            </div>
                        </div>
                        <div className="total-box highlight">
                            <span className="t-label">Total deuda</span>
                            <div className="t-row">
                                <span className="t-value">{formatCLP(resultado.totalDeuda)}</span>
                                <CopyBtn value={Math.round(resultado.totalDeuda)} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}