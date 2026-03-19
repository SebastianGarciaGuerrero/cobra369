import { useState } from 'react'
import { calcularCapitalDesdeAbono, formatCLP, parseCLPInput } from '../utils/calculos'
import CopyBtn from '../components/CopyBtn'

export default function AbonoCalc() {
    const [abono, setAbono] = useState('')
    const [uf, setUf] = useState('')
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    function handleCalcular() {
        setError('')
        const a = parseCLPInput(abono)
        const u = parseCLPInput(uf)
        if (isNaN(a) || a <= 0) { setError('Ingresa un monto de abono válido mayor a 0.'); return }
        if (isNaN(u) || u <= 0) { setError('Ingresa un valor de UF válido.'); return }
        const r = calcularCapitalDesdeAbono(a, u)
        if (!r) { setError('No se pudo calcular. Revisa los valores.'); return }
        setResult(r)
    }

    const tramos = result ? [
        { label: 'Hasta 10 UF', monto: result.monto1, pct: '9%', hon: result.hon1 },
        result.monto2 > 0 && { label: '11 a 50 UF', monto: result.monto2, pct: '6%', hon: result.hon2 },
        result.monto3 > 0 && { label: 'Resto (> 50 UF)', monto: result.monto3, pct: '3%', hon: result.hon3 },
    ].filter(Boolean) : []

    return (
        <div className="module-view">
            <div className="mv-header">
                <span className="mv-icon">💰</span>
                <h2>Cálculo de Abono</h2>
            </div>
            <p className="mv-desc">Ingresa el monto total recibido. El sistema calcula honorarios y capital neto.</p>

            <div className="form-card">
                <div className="form-row">
                    <div className="form-group">
                        <label>Monto abono total ($ CLP)</label>
                        <input type="text" inputMode="numeric" placeholder="Ej: 2.072.617"
                            value={abono} onChange={e => setAbono(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCalcular()} />
                    </div>
                    <div className="form-group">
                        <label>Valor UF del día</label>
                        <input type="text" inputMode="decimal" placeholder="Ej: 39.841,72"
                            value={uf} onChange={e => setUf(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCalcular()} />
                    </div>
                </div>
                {error && <p className="error-msg">{error}</p>}
                <button className="btn-primary" onClick={handleCalcular}>Calcular abono</button>
            </div>

            {result && (
                <div className="result-card">
                    <div className="result-header">
                        <h3>Resultado</h3>
                        <span className="badge-uf">{result.capitalUF.toFixed(4)} UF</span>
                    </div>

                    <table className="tranche-table">
                        <thead>
                            <tr><th>Tramo</th><th>Monto base</th><th>%</th><th>Honorarios</th><th></th></tr>
                        </thead>
                        <tbody>
                            {tramos.map((t, i) => (
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

                    <div className="totals-grid three-cols">
                        <div className="total-box">
                            <span className="t-label">Honorarios</span>
                            <div className="t-row">
                                <span className="t-value">{formatCLP(result.totalHonorarios)}</span>
                                <CopyBtn value={Math.round(result.totalHonorarios)} />
                            </div>
                        </div>
                        <div className="total-box highlight-green">
                            <span className="t-label">Capital neto</span>
                            <div className="t-row">
                                <span className="t-value">{formatCLP(result.capital)}</span>
                                <CopyBtn value={Math.round(result.capital)} />
                            </div>
                        </div>
                        <div className="total-box highlight">
                            <span className="t-label">Total abono</span>
                            <div className="t-row">
                                <span className="t-value">{formatCLP(result.abono)}</span>
                                <CopyBtn value={Math.round(result.abono)} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}