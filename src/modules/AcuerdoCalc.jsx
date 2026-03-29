import { useState } from 'react'
import { calcularAcuerdo, formatCLP, parseCLPInput } from '../utils/calculos'
import { guardarUF, cargarUF } from '../utils/ufStorage'
import CopyBtn from '../components/CopyBtn'

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

function formatFecha(date) {
    const d = String(date.getDate()).padStart(2, '0')
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const y = date.getFullYear()
    return `${d}-${m}-${y}`
}

function formatFechaTexto(date) {
    return `${date.getDate()} de ${MESES[date.getMonth()]} del ${date.getFullYear()}`
}

function generarFechas(fechaPrimera, diaSiguientes, totalCuotas) {
    const fechas = []
    if (!fechaPrimera) return Array(totalCuotas).fill(null)
    const [d1, m1, y1] = fechaPrimera.split('-').map(Number)
    if (!d1 || !m1 || !y1) return Array(totalCuotas).fill(null)
    fechas.push(new Date(y1, m1 - 1, d1))

    for (let i = 1; i < totalCuotas; i++) {
        const prev = fechas[i - 1]
        const diaDeseado = diaSiguientes || d1
        const nextYear = prev.getMonth() === 11 ? prev.getFullYear() + 1 : prev.getFullYear()
        const nextMonth = (prev.getMonth() + 1) % 12

        // Último día del mes siguiente
        const ultimoDelMes = new Date(nextYear, nextMonth + 1, 0).getDate()

        // Usa el día deseado o el último del mes si no existe
        const diaFinal = Math.min(diaDeseado, ultimoDelMes)
        fechas.push(new Date(nextYear, nextMonth, diaFinal))
    }
    return fechas
}

function parseFechaCL(str) {
    if (!str || str.length < 8) return null
    const [d, m, y] = str.split('-').map(Number)
    if (!d || !m || !y) return null
    const fecha = new Date(y, m - 1, d)
    // Verifica que la fecha no haya "desbordado" (ej: 30 feb → 2 mar)
    if (fecha.getDate() !== d || fecha.getMonth() !== m - 1 || fecha.getFullYear() !== y) return null
    return fecha
}

export default function AcuerdoCalc() {
    const [fields, setFields] = useState({
        capital: '',
        uf: cargarUF(),
        cuotas: '',
        tasaMensual: '',
        abonoInicial: '',
        fechaPrimera: '',
        diaSiguientes: '',
    })
    const [result, setResult] = useState(null)
    const [fechas, setFechas] = useState([])
    const [error, setError] = useState('')
    const [copiedTabla, setCopiedTabla] = useState(false)
    const [ajuste, setAjuste] = useState(0)
    const [loading, setLoading] = useState(false)
    const [uf, setUf] = useState(() => cargarUF())

    function set(id, val) { setFields(p => ({ ...p, [id]: val })) }

    function handleCalcular() {
        setError('')

        // Validar fecha primera cuota
        if (fields.fechaPrimera.trim() !== '') {
            const fechaIngresada = parseFechaCL(fields.fechaPrimera)
            if (!fechaIngresada) {
                setError('La fecha de la primera cuota no es válida (ej: 30-02-2026 no existe).')
                return
            }
            const hoy = new Date()
            hoy.setHours(0, 0, 0, 0)
            if (fechaIngresada < hoy) {
                setError('La fecha de la primera cuota no puede ser anterior a hoy.')
                return
            }
        }

        // Validar día cuotas siguientes
        if (fields.diaSiguientes.trim() !== '') {
            const dia = parseInt(fields.diaSiguientes, 10)
            if (isNaN(dia) || dia < 1 || dia > 31) {
                setError('El día de cuotas siguientes debe ser entre 1 y 31.')
                return
            }
        }

        const capital = parseCLPInput(fields.capital)
        const uf = parseCLPInput(fields.uf)
        const cuotas = parseInt(fields.cuotas, 10)
        const tasaMensual = parseCLPInput(fields.tasaMensual)
        const abonoInicial = fields.abonoInicial.trim() === '' ? 0 : parseCLPInput(fields.abonoInicial)
        const diaSig = fields.diaSiguientes.trim() === '' ? null : parseInt(fields.diaSiguientes, 10)

        if (isNaN(capital) || capital <= 0) { setError('Capital inválido.'); return }
        if (isNaN(uf) || uf <= 0) { setError('UF inválida.'); return }
        if (!cuotas || cuotas < 1) { setError('Número de cuotas inválido.'); return }
        if (isNaN(tasaMensual) || tasaMensual < 0) { setError('Tasa inválida.'); return }
        if (abonoInicial < 0 || abonoInicial >= capital) { setError('Abono inicial debe ser menor al capital.'); return }

        // Todo válido → ahora sí activar loading
        setLoading(true)
        setTimeout(() => setLoading(false), 800)
        setAjuste(0)
        setResult(calcularAcuerdo({ capital, abonoInicial, cuotas, tasaMensual, uf }))
        setFechas(generarFechas(fields.fechaPrimera, diaSig, cuotas))
    }

    function handleCopiarTabla() {
        if (!result) return

        const headers = ['N° CUOTAS', 'FECHA', 'MONTO ABONO CLÍNICA', 'INTERÉS', 'GASTO COBRANZA', 'MONTO TOTAL CUOTA']

        const thStyle = `border:1px solid #000;background-color:#dce6f1;color:#000000;font-weight:bold;padding:5px 8px;text-align:center;font-size:10pt;font-family:Arial,sans-serif;`
        const tdStyle = `border:1px solid #000;padding:4px 8px;text-align:center;font-size:10pt;font-family:Arial,sans-serif;color:#000000;background-color:#ffffff;`
        const tdBold = tdStyle + 'font-weight:bold;'

        const headerRow = `<tr>${headers.map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr>`

        const bodyRows = result.filas.map((f, i) => {
            const bg = i % 2 === 0 ? '#ffffff' : '#f2f2f2'
            const td = tdStyle + `background-color:${bg};`
            const tdb = tdBold + `background-color:${bg};`
            return `<tr>
            <td style="${td}">${f.nro}</td>
            <td style="${td}">${fechas[i] ? formatFecha(fechas[i]) : ''}</td>
            <td style="${td}">${Math.round(f.capital).toLocaleString('es-CL')}</td>
            <td style="${td}">${interesAjustado.toLocaleString('es-CL')}</td>
            <td style="${td}">${Math.round(f.honorarios).toLocaleString('es-CL')}</td>
            <td style="${tdb}">${totalAjustado.toLocaleString('es-CL')}</td>
        </tr>`
        }).join('')

        const totalsRow = `<tr>
            <td colspan="2" style="${tdBold}border-top:2px solid #000;">TOTALES</td>
            <td style="${tdBold}border-top:2px solid #000;">${Math.round(result.totalCapital).toLocaleString('es-CL')}</td>
            <td style="${tdBold}border-top:2px solid #000;">${(interesAjustado * result.cuotas).toLocaleString('es-CL')}</td>
            <td style="${tdBold}border-top:2px solid #000;">${Math.round(result.honTotal).toLocaleString('es-CL')}</td>
            <td style="${tdBold}border-top:2px solid #000;">${(totalAjustado * result.cuotas).toLocaleString('es-CL')}</td>
        </tr>`

        const html = `<table style="border-collapse:collapse;width:100%;">
            <thead>${headerRow}</thead>
            <tbody>${bodyRows}${totalsRow}</tbody>
        </table>`

        const htmlBlob = new Blob([html], { type: 'text/html' })
        const textBlob = new Blob(
            [headers.join('\t') + '\n' +
                result.filas.map((f, i) => [
                    f.nro,
                    fechas[i] ? formatFecha(fechas[i]) : '',
                    Math.round(f.capital),
                    Math.round(f.interes),
                    Math.round(f.honorarios),
                    Math.round(f.total),
                ].join('\t')).join('\n')],
            { type: 'text/plain' }
        )

        navigator.clipboard.write([
            new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
        ])

        setCopiedTabla(true)
        setTimeout(() => setCopiedTabla(false), 2500)
    }

    const totalAjustado = result ? Math.round(result.totalCuota + ajuste) : 0
    const interesAjustado = result ? Math.round(result.interesMes + ajuste) : 0

    const textoFechas = (() => {
        if (!result || fechas.length === 0 || !fechas[0]) return null

        const n = result.cuotas
        const f0 = fechas[0]
        const fLast = fechas[n - 1]
        const monto = formatCLP(totalAjustado)

        const MESES_MIN = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

        function fechaTexto(date) {
            return `${date.getDate()} de ${MESES_MIN[date.getMonth()]} de ${date.getFullYear()}`
        }

        if (n === 1) {
            return `La deuda se pagará en 1 cuota de ${monto}. La cuota tendrá vencimiento el ${fechaTexto(f0)}.`
        }

        const diaVencimiento = fields.diaSiguientes || f0.getDate()

        return `La deuda se pagará en ${n} cuotas iguales, mensuales y sucesivas de ${monto} cada una. La primera cuota tendrá vencimiento el ${fechaTexto(f0)}, y las cuotas restantes vencerán los días ${diaVencimiento} de cada mes, finalizando el ${fechaTexto(fLast)}, ambas fechas inclusive.`
    })()

    function handleRedondear(direccion) {
        if (!result) return
        const total = result.totalCuota + ajuste
        const redondeado = direccion === 'up'
            ? Math.ceil(total / 1000) * 1000
            : Math.floor(total / 1000) * 1000
        setAjuste(redondeado - result.totalCuota)
    }

    return (
        <div className="module-view">
            <div className="mv-header">
                <span className="mv-icon">📄</span>
                <h2>Acuerdo de Pago</h2>
            </div>
            <p className="mv-desc">
                Genera un pagaré con cuotas iguales. Interés simple sobre capital total.
                Gastos 3-6-9 calculados sobre la cuota capital.
            </p>

            <div className="form-card">

                {/* Fila 1: capital + UF */}
                <div className="form-row">
                    <div className="form-group">
                        <label>Saldo capital ($ CLP)</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ej: 1.702.828"
                            value={fields.capital}
                            onChange={e => {
                                const raw = e.target.value.replace(/\D/g, '')
                                const formatted = raw === '' ? '' : Number(raw).toLocaleString('es-CL')
                                set('capital', formatted)
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
                            value={fields.uf}
                            onChange={e => set('uf', e.target.value)}
                            onBlur={e => { if (e.target.value) guardarUF(e.target.value) }}
                            onKeyDown={e => e.key === 'Enter' && handleCalcular()}
                        />
                    </div>
                </div>

                {/* Fila 2: cuotas + tasa + abono */}
                <div className="form-row three-cols-form">
                    <div className="form-group">
                        <label>N° de cuotas</label>
                        <input type="text" inputMode="numeric" placeholder="Ej: 8"
                            value={fields.cuotas} onChange={e => set('cuotas', e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCalcular()} />
                    </div>
                    <div className="form-group">
                        <label>Tasa interés mensual (%)</label>
                        <input type="text" inputMode="decimal" placeholder="Ej: 0,70"
                            value={fields.tasaMensual} onChange={e => set('tasaMensual', e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCalcular()} />
                    </div>
                    <div className="form-group">
                        <label>Abono inicial (opcional)</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ej: 1.000.000"
                            value={fields.abonoInicial}
                            onChange={e => {
                                const raw = e.target.value.replace(/\D/g, '')
                                const formatted = raw === '' ? '' : Number(raw).toLocaleString('es-CL')
                                set('abonoInicial', formatted)
                            }}
                            onKeyDown={e => e.key === 'Enter' && handleCalcular()}
                        />
                    </div>
                </div>

                {/* Fila 3: fechas */}
                <div className="form-row">
                    <div className="form-group">
                        <label>Fecha 1ª cuota</label>
                        <div className="input-date-wrap">
                            <input
                                type="text"
                                placeholder="DD-MM-YYYY"
                                value={fields.fechaPrimera}
                                onChange={e => set('fechaPrimera', e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCalcular()}
                            />
                            <input
                                type="date"
                                className="date-picker-hidden"
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => {
                                    if (!e.target.value) return
                                    const [y, m, d] = e.target.value.split('-')
                                    set('fechaPrimera', `${d}-${m}-${y}`)
                                }}
                                title="Elegir desde calendario"
                            />
                            <span className="date-icon">📅</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Día cuotas siguientes</label>
                        <input type="text" inputMode="numeric" placeholder="Ej: 25"
                            value={fields.diaSiguientes} onChange={e => set('diaSiguientes', e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCalcular()} />
                    </div>
                </div>

                {error && <p className="error-msg">{error}</p>}
                <button
                    className={`btn-primary ${loading ? 'btn-loading' : ''}`}
                    onClick={handleCalcular}
                    disabled={loading}
                >
                    {loading ? (
                        <span className="btn-spinner-wrap">
                            <span className="btn-spinner" /> Calculando...
                        </span>
                    ) : 'Generar acuerdo'}
                </button>
            </div>

            {result && (
                <div className="result-card">
                    <div className="result-header">
                        <h3>Acuerdo generado</h3>
                    </div>

                    {/* Texto de fechas copiable */}
                    {textoFechas && (
                        <div className="fechas-box">
                            <span className="fechas-texto">{textoFechas}</span>
                            <CopyBtn value={textoFechas} />
                        </div>
                    )}

                    {/* Desglose PIE */}
                    {result.abonoInicial > 0 && (
                        <div className="pie-section">
                            <h4 className="section-label">Cálculo abono inicial (PIE)</h4>
                            <div className="resumen-grid">
                                <div className="resumen-row">
                                    <span className="resumen-key">Total PIE recibido</span>
                                    <div className="resumen-val-wrap">
                                        <span className="resumen-val">{formatCLP(result.abonoInicial)}</span>
                                        <CopyBtn value={Math.round(result.abonoInicial)} />
                                    </div>
                                </div>
                                <div className="resumen-row">
                                    <span className="resumen-key">Capital PIE (va a clínica)</span>
                                    <div className="resumen-val-wrap">
                                        <span className="resumen-val highlight-green-text">{formatCLP(result.capPIE)}</span>
                                        <CopyBtn value={Math.round(result.capPIE)} />
                                    </div>
                                </div>
                                <div className="resumen-row">
                                    <span className="resumen-key">Honorarios PIE (3-6-9)</span>
                                    <div className="resumen-val-wrap">
                                        <span className="resumen-val col-hon">{formatCLP(result.honPIE)}</span>
                                        <CopyBtn value={Math.round(result.honPIE)} />
                                    </div>
                                </div>
                                <div className="resumen-row resumen-total-row">
                                    <span className="resumen-key">Capital nuevo pagaré</span>
                                    <div className="resumen-val-wrap">
                                        <span className="resumen-val resumen-total">{formatCLP(result.capNuevo)}</span>
                                        <CopyBtn value={Math.round(result.capNuevo)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Resumen mensual */}
                    <div className="resumen-section">
                        <h4 className="section-label">Resumen mensual</h4>
                        <div className="resumen-grid">
                            <div className="resumen-row">
                                <span className="resumen-key">N° de cuotas</span>
                                <div className="resumen-val-wrap">
                                    <span className="resumen-val">{result.cuotas}</span>
                                    <CopyBtn value={result.cuotas} />
                                </div>
                            </div>
                            <div className="resumen-row">
                                <span className="resumen-key">Cuota capital</span>
                                <div className="resumen-val-wrap">
                                    <span className="resumen-val">{formatCLP(result.cuotaCap)}</span>
                                    <CopyBtn value={Math.round(result.cuotaCap)} />
                                </div>
                            </div>
                            <div className="resumen-row">
                                <span className="resumen-key">
                                    Interés mensual
                                    {ajuste !== 0 && (
                                        <span className={`ajuste-badge ${ajuste > 0 ? 'pos' : 'neg'}`}>
                                            {ajuste > 0 ? '+' : ''}{Math.round(ajuste).toLocaleString('es-CL')}
                                        </span>
                                    )}
                                </span>
                                <div className="resumen-val-wrap">
                                    <span className={`resumen-val col-int ${ajuste !== 0 ? 'val-ajustado' : ''}`}>
                                        {formatCLP(interesAjustado)}
                                    </span>
                                    <CopyBtn value={interesAjustado} />
                                </div>
                            </div>
                            <div className="resumen-row">
                                <span className="resumen-key">Gastos de cobranza mensual</span>
                                <div className="resumen-val-wrap">
                                    <span className="resumen-val col-hon">{formatCLP(result.honMes)}</span>
                                    <CopyBtn value={Math.round(result.honMes)} />
                                </div>
                            </div>
                            <div className="resumen-row resumen-total-row">
                                <span className="resumen-key">Total cuota mensual</span>
                                <div className="resumen-val-wrap">
                                    <div className="round-controls">
                                        <button
                                            className="round-btn"
                                            onClick={() => handleRedondear('up')}
                                            title="Redondear hacia arriba al millar"
                                        >▲</button>
                                        <button
                                            className="round-btn"
                                            onClick={() => handleRedondear('down')}
                                            title="Redondear hacia abajo al millar"
                                        >▼</button>

                                    </div>
                                    <span className="resumen-val resumen-total">{formatCLP(totalAjustado)}</span>
                                    <CopyBtn value={totalAjustado} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de cuotas */}
                    <div className="section-header-row">
                        <h4 className="section-label">Detalle cuotas</h4>
                        <button
                            className={`btn-copy-tabla ${copiedTabla ? 'copied' : ''}`}
                            onClick={handleCopiarTabla}
                        >
                            {copiedTabla ? '✓ Copiado para Word' : '📋 Copiar tabla para Word'}
                        </button>
                    </div>

                    <div className="table-wrap">
                        <table className="tranche-table cuota-table">
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Fecha</th>
                                    <th>Abono clínica</th>
                                    <th>Interés</th>
                                    <th>Honorarios</th>
                                    <th>Total cuota</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.filas.map((f, i) => (
                                    <tr key={f.nro}>
                                        <td className="col-nro">{f.nro}</td>
                                        <td className="col-fecha">
                                            {fechas[i] ? formatFecha(fechas[i]) : <span className="no-fecha">—</span>}
                                        </td>
                                        <td>{formatCLP(f.capital)}</td>
                                        <td className={`col-int ${ajuste !== 0 ? 'val-ajustado' : ''}`}>
                                            {formatCLP(interesAjustado)}
                                        </td>
                                        <td className="col-hon">{formatCLP(f.honorarios)}</td>
                                        <td className={`col-total ${ajuste !== 0 ? 'val-ajustado' : ''}`}>
                                            {formatCLP(totalAjustado)}
                                        </td>
                                        <td><CopyBtn value={totalAjustado} /></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="tfoot-row">
                                    <td colSpan="2">TOTALES</td>
                                    <td>{formatCLP(result.totalCapital)}</td>
                                    <td className={`col-int ${ajuste !== 0 ? 'val-ajustado' : ''}`}>
                                        {formatCLP(interesAjustado * result.cuotas)}
                                    </td>
                                    <td className="col-hon">{formatCLP(result.honTotal)}</td>
                                    <td className={`col-total ${ajuste !== 0 ? 'val-ajustado' : ''}`}>
                                        {formatCLP(totalAjustado * result.cuotas)}
                                    </td>
                                    <td><CopyBtn value={totalAjustado * result.cuotas} /></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Totales finales */}
                    <div className="totals-grid">
                        <div className="total-box">
                            <span className="t-label">Total pagaré</span>
                            <div className="t-row">
                                <span className="t-value">{formatCLP(totalAjustado * result.cuotas)}</span>
                                <CopyBtn value={totalAjustado * result.cuotas} />
                            </div>
                        </div>
                        <div className="total-box highlight">
                            <span className="t-label">Monto cuota mensual</span>
                            <div className="t-row">
                                <span className="t-value">{formatCLP(totalAjustado)}</span>
                                <CopyBtn value={totalAjustado} />
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    )
}