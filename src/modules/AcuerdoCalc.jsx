import { useState } from 'react'
import { calcularAcuerdo, formatCLP, parseCLPInput, COMISION_FLOW_PCT } from '../utils/calculos'
import { construirAcuerdoHTML, descargarWord, cargarLogoBase64, FILIALES, fechaLarga } from '../utils/generarWord'
import { guardarUF, cargarUF } from '../utils/ufStorage'
import CopyBtn from '../components/CopyBtn'
import logoHadad from '../assets/logo-hadad-hd.png'

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
        gastosJudiciales: '',
        fechaPrimera: '',
        diaSiguientes: '',
        fechaAbono: '',
    })
    const [result, setResult] = useState(null)
    const [fechas, setFechas] = useState([])
    const [error, setError] = useState('')
    const [copiedTabla, setCopiedTabla] = useState(false)
    const [copiedImg, setCopiedImg] = useState(false)
    const [ajuste, setAjuste] = useState(0)
    const [loading, setLoading] = useState(false)
    const [uf, setUf] = useState(() => cargarUF())
    const [modalidad, setModalidad] = useState('extrajudicial')
    const [calcId, setCalcId] = useState(0)
    const [pie30, setPie30] = useState(false)
    const [flow, setFlow] = useState(false)
    const [panelDoc, setPanelDoc] = useState(false)
    const [doc, setDoc] = useState({
        numeroCob: '',
        fechaDoc: fechaLarga(new Date()),
        filial: 'SANTIAGO',
        filialOtra: '',
        tratamiento: 'don',
        nombre: '',
        id: '',
        rut: '',
        montoDerivado: '',
        abonoClinico: '',
        transferencia: FILIALES.SANTIAGO.transferencia,
    })

    function setDocField(id, val) { setDoc(p => ({ ...p, [id]: val })) }

    function cambiarFilial(nueva) {
        setDoc(p => ({
            ...p,
            filial: nueva,
            transferencia: FILIALES[nueva] ? FILIALES[nueva].transferencia : p.transferencia,
        }))
    }

    async function handleGenerarWord() {
        if (!result) return
        const html = construirAcuerdoHTML({
            result,
            fechas,
            doc: {
                ...doc,
                filialNombre: doc.filial === 'OTRA' ? (doc.filialOtra || '') : doc.filial,
                montoDerivado: doc.montoDerivado.trim() === ''
                    ? Math.round(result.capital)
                    : parseCLPInput(doc.montoDerivado),
                abonoClinico: doc.abonoClinico.trim() === '' ? 0 : parseCLPInput(doc.abonoClinico),
            },
            textoCuotas: textoFechas,
            fechaAbono: fields.fechaAbono.trim(),
            totalCuota: totalAjustado,
            granTotal,
            conGastos: modalidad === 'judicial',
            conFlow: result.comisionFlow,
            // El rótulo "(30%)" se deduce del monto real, no del botón,
            // para que el documento nunca diga algo que no corresponda
            pie30: Math.abs(result.abonoInicial - result.capital * 0.30) < 3,
        })
        const idArchivo = doc.id.trim() || doc.rut.trim() || 'sin-id'
        const logo = await cargarLogoBase64(logoHadad)
        descargarWord(html, `ACUERDO ${idArchivo}.doc`, logo)
    }

    // Recalcula con/sin comisión Flow reutilizando los datos ya calculados
    function toggleFlow() {
        const nuevo = !flow
        setFlow(nuevo)
        if (!result) return
        setAjuste(0)
        setResult(calcularAcuerdo({
            capital: result.capital,
            abonoInicial: result.abonoInicial,
            cuotas: result.cuotas,
            tasaMensual: result.tasaMensual,
            uf: result.uf,
            modalidad,
            gastosJudiciales: result.gastosJudiciales,
            comisionFlow: nuevo,
        }))
    }

    // Devuelve el 30% del capital formateado en CLP (o '' si capital inválido)
    function calcPie30(capitalStr) {
        const cap = parseCLPInput(capitalStr)
        if (isNaN(cap) || cap <= 0) return ''
        return Math.round(cap * 0.30).toLocaleString('es-CL')
    }

    function togglePie30() {
        if (pie30) {
            setPie30(false)
        } else {
            setPie30(true)
            set('abonoInicial', calcPie30(fields.capital))
        }
    }

    function switchModalidad(nueva) {
        setModalidad(nueva)
        setResult(null)
        setError('')
        setAjuste(0)
        setFields(p => ({ ...p, gastosJudiciales: '' }))
    }

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

        // Validar fecha de abono (PIE)
        if (fields.fechaAbono.trim() !== '' && !parseFechaCL(fields.fechaAbono)) {
            setError('La fecha del abono no es válida (formato DD-MM-YYYY).')
            return
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
        const gastosJudiciales = fields.gastosJudiciales.trim() === '' ? 0 : parseCLPInput(fields.gastosJudiciales)
        const diaSig = fields.diaSiguientes.trim() === '' ? null : parseInt(fields.diaSiguientes, 10)

        if (isNaN(capital) || capital <= 0) { setError('Capital inválido.'); return }
        if (modalidad === 'extrajudicial' && (isNaN(uf) || uf <= 0)) { setError('UF inválida.'); return }
        if (!cuotas || cuotas < 1) { setError('Número de cuotas inválido.'); return }
        if (isNaN(tasaMensual) || tasaMensual < 0) { setError('Tasa inválida.'); return }
        if (abonoInicial < 0 || abonoInicial >= capital) { setError('Abono inicial debe ser menor al capital.'); return }

        // Todo válido → ahora sí activar loading
        setLoading(true)
        setTimeout(() => setLoading(false), 800)
        setAjuste(0)
        setResult(calcularAcuerdo({ capital, abonoInicial, cuotas, tasaMensual, uf, modalidad, gastosJudiciales, comisionFlow: flow }))
        setFechas(generarFechas(fields.fechaPrimera, diaSig, cuotas))
        setCalcId(n => n + 1)
    }

    function handleCopiarTabla() {
        if (!result) return

        const conGastos = modalidad === 'judicial'
        const conFlow = result.comisionFlow
        const conPIE = result.abonoInicial > 0

        const headers = [
            'N° CUOTAS', 'FECHA', 'MONTO ABONO CLÍNICA', 'INTERÉS',
            conGastos ? 'HONORARIOS (10%)' : 'GASTO COBRANZA',
            ...(conGastos ? ['GASTOS JUDICIALES'] : []),
            ...(conFlow ? ['COMISIÓN FLOW'] : []),
            'MONTO TOTAL CUOTA',
        ]

        const thStyle = `border:1px solid #000;background-color:#dce6f1;color:#000000;font-weight:bold;padding:5px 8px;text-align:center;font-size:10pt;font-family:Arial,sans-serif;`
        const tdStyle = `border:1px solid #000;padding:4px 8px;text-align:center;font-size:10pt;font-family:Arial,sans-serif;color:#000000;background-color:#ffffff;`
        const tdBold = tdStyle + 'font-weight:bold;'

        const headerRow = `<tr>${headers.map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr>`

        const pieRow = conPIE ? `<tr>
            <td style="${tdBold}">PIE</td>
            <td style="${tdStyle}">${fields.fechaAbono.trim() !== '' ? fields.fechaAbono : ''}</td>
            <td style="${tdStyle}">${Math.round(result.capPIE).toLocaleString('es-CL')}</td>
            <td style="${tdStyle}">0</td>
            <td style="${tdStyle}">${Math.round(result.honPIE).toLocaleString('es-CL')}</td>
            ${conGastos ? `<td style="${tdStyle}">0</td>` : ''}
            ${conFlow ? `<td style="${tdStyle}">0</td>` : ''}
            <td style="${tdBold}">${Math.round(result.abonoInicial).toLocaleString('es-CL')}</td>
        </tr>` : ''

        const bodyRows = result.filas.map((f, i) => {
            const bg = i % 2 === 0 ? '#ffffff' : '#f2f2f2'
            const td = tdStyle + `background-color:${bg};`
            const tdb = tdBold + `background-color:${bg};`
            return `<tr>
            <td style="${td}">${f.nro}</td>
            <td style="${td}">${fechas[i] ? formatFecha(fechas[i]) : ''}</td>
            <td style="${td}">${Math.round(f.capital).toLocaleString('es-CL')}</td>
            <td style="${td}">${interesFila(f).toLocaleString('es-CL')}</td>
            <td style="${td}">${Math.round(f.honorarios).toLocaleString('es-CL')}</td>
            ${conGastos ? `<td style="${td}">${Math.round(f.gastosJud).toLocaleString('es-CL')}</td>` : ''}
            ${conFlow ? `<td style="${td}">${Math.round(f.flow).toLocaleString('es-CL')}</td>` : ''}
            <td style="${tdb}">${totalAjustado.toLocaleString('es-CL')}</td>
        </tr>`
        }).join('')

        const totalsRow = `<tr>
            <td colspan="${headers.length - 1}" style="${tdBold}border-top:2px solid #000;text-align:center;">TOTAL</td>
            <td style="${tdBold}border-top:2px solid #000;">${granTotal.toLocaleString('es-CL')}</td>
        </tr>`

        const html = `<table style="border-collapse:collapse;width:100%;">
            <thead>${headerRow}</thead>
            <tbody>${pieRow}${bodyRows}${totalsRow}</tbody>
        </table>`

        const pieLine = conPIE ? [
            'PIE', fields.fechaAbono.trim(), Math.round(result.capPIE), 0, Math.round(result.honPIE),
            ...(conGastos ? [0] : []),
            ...(conFlow ? [0] : []),
            Math.round(result.abonoInicial),
        ].join('\t') + '\n' : ''

        const htmlBlob = new Blob([html], { type: 'text/html' })
        const textBlob = new Blob(
            [headers.join('\t') + '\n' + pieLine +
                result.filas.map((f, i) => [
                    f.nro,
                    fechas[i] ? formatFecha(fechas[i]) : '',
                    Math.round(f.capital),
                    interesFila(f),
                    Math.round(f.honorarios),
                    ...(conGastos ? [Math.round(f.gastosJud)] : []),
                    ...(conFlow ? [Math.round(f.flow)] : []),
                    totalAjustado,
                ].join('\t')).join('\n') +
                '\nTOTAL\t' + granTotal],
            { type: 'text/plain' }
        )

        navigator.clipboard.write([
            new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
        ])

        setCopiedTabla(true)
        setTimeout(() => setCopiedTabla(false), 2500)
    }

    async function handleCopiarImagen() {
        if (!result) return

        const conPIE = result.abonoInicial > 0
        const filasImg = []
        if (conPIE) filasImg.push({
            label: 'PIE (abono inicial)',
            fecha: fields.fechaAbono.trim() !== '' ? fields.fechaAbono : 'Al contado',
            total: Math.round(result.abonoInicial),
        })
        result.filas.forEach((f, i) => filasImg.push({
            label: `Cuota ${f.nro}`,
            fecha: fechas[i] ? formatFecha(fechas[i]) : '—',
            total: totalAjustado,
        }))

        // Cargar logo
        const logo = new Image()
        logo.src = logoHadad
        await new Promise(res => { logo.onload = res; logo.onerror = res })
        const logoOk = logo.complete && logo.naturalWidth > 0

        const W = 640
        const M = 32
        const headerH = 148
        const infoLineH = 26
        const infoLines = conPIE ? 4 : 3
        const infoTop = headerH + 34
        const tableTop = infoTop + infoLines * infoLineH + 22
        const rowH = 32
        const totalRowH = 46
        const footerH = 52
        const H = tableTop + 30 + filasImg.length * rowH + totalRowH + footerH

        const canvas = document.createElement('canvas')
        const scale = 2
        canvas.width = W * scale
        canvas.height = H * scale
        const ctx = canvas.getContext('2d')
        ctx.scale(scale, scale)

        // Fondo blanco tenue
        ctx.fillStyle = '#f4f4f4'
        ctx.fillRect(0, 0, W, H)

        // Encabezado blanco con logo
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, W, headerH)

        const logoH = 112
        let logoW = 0
        if (logoOk) {
            logoW = logoH * (logo.naturalWidth / logo.naturalHeight)
            ctx.drawImage(logo, M, (headerH - logoH) / 2 - 4, logoW, logoH)
        }

        const tx = M + (logoOk ? logoW + 28 : 0)
        ctx.fillStyle = '#3d3d3d'
        ctx.font = 'bold 20px Arial'
        ctx.fillText(modalidad === 'judicial' ? 'RESUMEN DE AVENIMIENTO' : 'RESUMEN DE ACUERDO DE PAGO', tx, 62)
        ctx.fillStyle = '#777777'
        ctx.font = 'bold 11px Arial'
        ctx.fillText('DOCUMENTO DE REFERENCIA — NO OFICIAL', tx, 84)

        // Línea divisoria gris oscura
        ctx.fillStyle = '#4a4a4a'
        ctx.fillRect(0, headerH - 3, W, 3)

        // Datos principales
        let y = infoTop
        const info = []
        if (conPIE) info.push(['Abono inicial (PIE):', formatCLP(result.abonoInicial)])
        info.push(['N° de cuotas:', String(result.cuotas)])
        info.push(['Primera cuota:', fechas[0] ? formatFecha(fechas[0]) : '—'])
        info.push(['Valor cuota mensual:', formatCLP(totalAjustado)])
        info.forEach(([k, v]) => {
            ctx.fillStyle = '#6e6e6e'
            ctx.font = '14px Arial'
            ctx.fillText(k, M, y)
            ctx.fillStyle = '#3d3d3d'
            ctx.font = 'bold 14px Arial'
            ctx.fillText(v, M + 180, y)
            y += infoLineH
        })

        // Cabecera de tabla
        y = tableTop
        ctx.fillStyle = '#4a4a4a'
        ctx.fillRect(M, y, W - 2 * M, 30)
        ctx.fillStyle = '#f4f4f4'
        ctx.font = 'bold 12px Arial'
        ctx.fillText('CUOTA', M + 12, y + 20)
        ctx.fillText('VENCIMIENTO', M + 230, y + 20)
        ctx.textAlign = 'right'
        ctx.fillText('MONTO', W - M - 12, y + 20)
        ctx.textAlign = 'left'
        y += 30

        // Filas (solo monto total, sin desglose)
        filasImg.forEach((f, i) => {
            ctx.fillStyle = i % 2 === 1 ? '#e8e8e8' : '#ffffff'
            ctx.fillRect(M, y, W - 2 * M, rowH)
            ctx.fillStyle = '#3d3d3d'
            ctx.font = '13px Arial'
            ctx.fillText(f.label, M + 12, y + 21)
            ctx.fillStyle = '#6e6e6e'
            ctx.fillText(f.fecha, M + 230, y + 21)
            ctx.fillStyle = '#3d3d3d'
            ctx.textAlign = 'right'
            ctx.font = 'bold 13px Arial'
            ctx.fillText(formatCLP(f.total), W - M - 12, y + 21)
            ctx.textAlign = 'left'
            y += rowH
        })

        // Fila TOTAL
        ctx.fillStyle = '#3d3d3d'
        ctx.fillRect(M, y + 6, W - 2 * M, totalRowH - 12)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 14px Arial'
        ctx.fillText('TOTAL', M + 12, y + 28)
        ctx.textAlign = 'right'
        ctx.fillText(formatCLP(granTotal), W - M - 12, y + 28)
        ctx.textAlign = 'left'
        y += totalRowH

        // Pie de página
        ctx.fillStyle = '#8a8a8a'
        ctx.font = 'italic 11px Arial'
        ctx.fillText('Este resumen es solo informativo y no constituye un documento oficial.', M, y + 22)

        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])

        setCopiedImg(true)
        setTimeout(() => setCopiedImg(false), 2500)
    }

    const totalAjustado = result ? Math.round(result.totalCuota + ajuste) : 0
    const interesAjustado = result ? Math.round(result.interesMes + ajuste) : 0
    // Interés de cada fila (la última difiere para cuadrar el capital)
    const interesFila = (f) => Math.round(f.interes + ajuste)
    const granTotal = result
        ? totalAjustado * result.cuotas + (result.abonoInicial > 0 ? Math.round(result.abonoInicial) : 0)
        : 0

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

        const fAbono = parseFechaCL(fields.fechaAbono)
        const textoPIE = result.abonoInicial > 0
            ? `Se efectúa un abono inicial (PIE) de ${formatCLP(result.abonoInicial)}${fAbono ? ` con fecha ${fechaTexto(fAbono)}` : ''}. `
            : ''
        const sujeto = result.abonoInicial > 0 ? 'El saldo restante' : 'La deuda'

        if (n === 1) {
            return `${textoPIE}${sujeto} se pagará en 1 cuota de ${monto}. La cuota tendrá vencimiento el ${fechaTexto(f0)}.`
        }

        const diaVencimiento = fields.diaSiguientes || f0.getDate()

        return `${textoPIE}${sujeto} se pagará en ${n} cuotas iguales, mensuales y sucesivas de ${monto} cada una. La primera cuota tendrá vencimiento el ${fechaTexto(f0)}, y las cuotas restantes vencerán los días ${diaVencimiento} de cada mes, finalizando el ${fechaTexto(fLast)}, ambas fechas inclusive.`
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
        <div className="module-view mv-wide">
            <div className="mv-header">
                <span className="mv-icon">📄</span>
                <h2>{modalidad === 'judicial' ? 'Avenimiento' : 'Acuerdo de Pago'}</h2>
            </div>
            <p className="mv-desc">
                Genera un pagaré con cuotas iguales. Interés simple sobre capital total.
                {modalidad === 'judicial'
                    ? ' Gastos judiciales al 10% sobre la cuota capital.'
                    : ' Gastos 3-6-9 calculados sobre la cuota capital.'}
            </p>

            <div className={`calc-layout ${result ? 'two-col' : ''}`}>
            <div className="form-card">
                <div className="mode-tabs">
                    <button
                        className={`mode-tab ${modalidad === 'extrajudicial' ? 'active' : ''}`}
                        onClick={() => switchModalidad('extrajudicial')}
                    >
                        Extrajudicial
                    </button>
                    <button
                        className={`mode-tab judicial ${modalidad === 'judicial' ? 'active' : ''}`}
                        onClick={() => switchModalidad('judicial')}
                    >
                        Judicial
                    </button>
                </div>

                {/* Formulario en grilla de 2 columnas alineadas */}
                <div className="form-grid">
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
                                setFields(p => ({
                                    ...p,
                                    capital: formatted,
                                    abonoInicial: pie30 ? calcPie30(formatted) : p.abonoInicial,
                                }))
                            }}
                            onKeyDown={e => e.key === 'Enter' && handleCalcular()}
                        />
                    </div>

                    {modalidad === 'extrajudicial' ? (
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
                    ) : (
                        <div className="form-group">
                            <label>Gastos judiciales — total ($ CLP)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Ej: 350.000"
                                value={fields.gastosJudiciales}
                                onChange={e => {
                                    const raw = e.target.value.replace(/\D/g, '')
                                    set('gastosJudiciales', raw === '' ? '' : Number(raw).toLocaleString('es-CL'))
                                }}
                                onKeyDown={e => e.key === 'Enter' && handleCalcular()}
                            />
                        </div>
                    )}

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
                                onClick={e => { try { e.target.showPicker() } catch { /* navegador sin soporte */ } }}
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

                    <div className="form-group">
                        <div className="label-row">
                            <label>Abono inicial (opcional)</label>
                            <button
                                type="button"
                                className={`pill-pie ${pie30 ? 'active' : ''}`}
                                onClick={togglePie30}
                                title="Calcular el 30% del saldo capital como pie"
                            >
                                30%
                            </button>
                        </div>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ej: 1.000.000"
                            value={fields.abonoInicial}
                            onChange={e => {
                                const raw = e.target.value.replace(/\D/g, '')
                                const formatted = raw === '' ? '' : Number(raw).toLocaleString('es-CL')
                                setPie30(false)
                                set('abonoInicial', formatted)
                            }}
                            onKeyDown={e => e.key === 'Enter' && handleCalcular()}
                        />
                    </div>

                    <div className="form-group">
                        <label>Fecha abono (opcional)</label>
                        <div className="input-date-wrap">
                            <input
                                type="text"
                                placeholder="DD-MM-YYYY"
                                value={fields.fechaAbono}
                                onChange={e => set('fechaAbono', e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCalcular()}
                            />
                            <input
                                type="date"
                                className="date-picker-hidden"
                                onClick={e => { try { e.target.showPicker() } catch { /* navegador sin soporte */ } }}
                                onChange={e => {
                                    if (!e.target.value) return
                                    const [y, m, d] = e.target.value.split('-')
                                    set('fechaAbono', `${d}-${m}-${y}`)
                                }}
                                title="Elegir desde calendario"
                            />
                            <span className="date-icon">📅</span>
                        </div>
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
                        <div className="rh-left">
                            <h3>Acuerdo generado</h3>
                            <span key={calcId} className="calc-badge">✓ Calculado</span>
                        </div>
                    </div>

                    {/* Texto de fechas copiable */}
                    {textoFechas && (
                        <div className="fechas-box">
                            <span className="fechas-texto">{textoFechas}</span>
                            <CopyBtn value={textoFechas} />
                        </div>
                    )}

                    {/* Desglose PIE + Resumen mensual en grilla */}
                    <div className="result-grid-2">
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
                                    <span className="resumen-key">
                                        {modalidad === 'judicial' ? 'Honorarios PIE (10%)' : 'Honorarios PIE (3-6-9)'}
                                    </span>
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
                                <span className="resumen-key">
                                    {modalidad === 'judicial' ? 'Honorarios judiciales (10%)' : 'Gastos de cobranza mensual'}
                                </span>
                                <div className="resumen-val-wrap">
                                    <span className="resumen-val col-hon">{formatCLP(result.honMes)}</span>
                                    <CopyBtn value={Math.round(result.honMes)} />
                                </div>
                            </div>
                            {modalidad === 'judicial' && result.gastosJudPorCuota > 0 && (
                                <div className="resumen-row">
                                    <span className="resumen-key">Gastos judiciales por cuota</span>
                                    <div className="resumen-val-wrap">
                                        <span className="resumen-val col-hon">{formatCLP(result.gastosJudPorCuota)}</span>
                                        <CopyBtn value={result.gastosJudPorCuota} />
                                    </div>
                                </div>
                            )}
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
                    </div>

                    {/* Tabla de cuotas */}
                    <div className="section-header-row">
                        <h4 className="section-label">Detalle cuotas</h4>
                        <div className="btns-copy-row">
                            <button
                                className={`btn-flow ${flow ? 'active' : ''}`}
                                onClick={toggleFlow}
                                title={`Agregar comisión Flow (${COMISION_FLOW_PCT.toString().replace('.', ',')}% del saldo capital, repartida en las cuotas)`}
                            >
                                {flow ? '✓ Comisión Flow' : '＋ Comisión Flow'}
                            </button>
                            <button
                                className={`btn-copy-tabla ${copiedTabla ? 'copied' : ''}`}
                                onClick={handleCopiarTabla}
                            >
                                {copiedTabla ? '✓ Copiado para Word' : '📋 Copiar tabla para Word'}
                            </button>
                            <button
                                className={`btn-copy-tabla ${copiedImg ? 'copied' : ''}`}
                                onClick={handleCopiarImagen}
                            >
                                {copiedImg ? '✓ Imagen copiada' : '🖼️ Copiar imagen para deudor'}
                            </button>
                        </div>
                    </div>

                    {(() => {
                        const conGastos = modalidad === 'judicial'
                        const conFlow = result.comisionFlow
                        const conPIE = result.abonoInicial > 0
                        const colsAntesTotal = 5 + (conGastos ? 1 : 0) + (conFlow ? 1 : 0)
                        return (
                            <div className="table-wrap">
                                <table className="tranche-table cuota-table">
                                    <thead>
                                        <tr>
                                            <th>N°</th>
                                            <th>Fecha</th>
                                            <th>Abono clínica</th>
                                            <th>Interés</th>
                                            <th>Honorarios</th>
                                            {conGastos && <th>Gastos jud.</th>}
                                            {conFlow && <th>Comisión Flow</th>}
                                            <th>Total cuota</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {conPIE && (
                                            <tr>
                                                <td className="col-nro">PIE</td>
                                                <td className="col-fecha">
                                                    {fields.fechaAbono.trim() !== '' ? fields.fechaAbono : <span className="no-fecha">—</span>}
                                                </td>
                                                <td>{formatCLP(result.capPIE)}</td>
                                                <td className="col-int">{formatCLP(0)}</td>
                                                <td className="col-hon">{formatCLP(result.honPIE)}</td>
                                                {conGastos && <td className="col-hon">{formatCLP(0)}</td>}
                                                {conFlow && <td className="col-hon">{formatCLP(0)}</td>}
                                                <td className="col-total">{formatCLP(result.abonoInicial)}</td>
                                                <td><CopyBtn value={Math.round(result.abonoInicial)} /></td>
                                            </tr>
                                        )}
                                        {result.filas.map((f, i) => (
                                            <tr key={f.nro}>
                                                <td className="col-nro">{f.nro}</td>
                                                <td className="col-fecha">
                                                    {fechas[i] ? formatFecha(fechas[i]) : <span className="no-fecha">—</span>}
                                                </td>
                                                <td>{formatCLP(f.capital)}</td>
                                                <td className={`col-int ${ajuste !== 0 ? 'val-ajustado' : ''}`}>
                                                    {formatCLP(interesFila(f))}
                                                </td>
                                                <td className="col-hon">{formatCLP(f.honorarios)}</td>
                                                {conGastos && <td className="col-hon">{formatCLP(f.gastosJud)}</td>}
                                                {conFlow && <td className="col-flow">{formatCLP(f.flow)}</td>}
                                                <td className={`col-total ${ajuste !== 0 ? 'val-ajustado' : ''}`}>
                                                    {formatCLP(totalAjustado)}
                                                </td>
                                                <td><CopyBtn value={totalAjustado} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="tfoot-row">
                                            <td colSpan={colsAntesTotal} style={{ textAlign: 'center' }}>TOTAL</td>
                                            <td className={`col-total ${ajuste !== 0 ? 'val-ajustado' : ''}`}>
                                                {formatCLP(granTotal)}
                                            </td>
                                            <td><CopyBtn value={granTotal} /></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )
                    })()}

                    {/* Totales finales */}
                    <div className="totals-grid">
                        <div className="total-box">
                            <span className="t-label">
                                {result.abonoInicial > 0 ? 'Total acuerdo (incluye PIE)' : 'Total pagaré'}
                            </span>
                            <div className="t-row">
                                <span className="t-value">{formatCLP(granTotal)}</span>
                                <CopyBtn value={granTotal} />
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

                    {/* ── Generar documento Word ── */}
                    <div className="doc-section">
                        <div className="section-header-row">
                            <h4 className="section-label">Documento del acuerdo</h4>
                            <button
                                className="btn-copy-tabla"
                                onClick={() => setPanelDoc(v => !v)}
                            >
                                {panelDoc ? '▲ Ocultar datos' : '▼ Datos del documento'}
                            </button>
                        </div>

                        {panelDoc && (
                            <div className="doc-grid">
                                <div className="form-group">
                                    <label>N° COB</label>
                                    <input type="text" placeholder="Ej: 11947"
                                        value={doc.numeroCob} onChange={e => setDocField('numeroCob', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Fecha documento</label>
                                    <input type="text" placeholder="Ej: 01 julio 2026"
                                        value={doc.fechaDoc} onChange={e => setDocField('fechaDoc', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Filial</label>
                                    <select value={doc.filial} onChange={e => cambiarFilial(e.target.value)}>
                                        {Object.entries(FILIALES).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                        <option value="OTRA">Otra…</option>
                                    </select>
                                </div>
                                {doc.filial === 'OTRA' && (
                                    <div className="form-group">
                                        <label>Nombre de la filial</label>
                                        <input type="text" placeholder="Ej: VALPARAÍSO"
                                            value={doc.filialOtra} onChange={e => setDocField('filialOtra', e.target.value)} />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Tratamiento</label>
                                    <select value={doc.tratamiento} onChange={e => setDocField('tratamiento', e.target.value)}>
                                        <option value="don">don</option>
                                        <option value="doña">doña</option>
                                    </select>
                                </div>
                                <div className="form-group doc-col-2">
                                    <label>Nombre del deudor</label>
                                    <input type="text" placeholder="Ej: Marco Antonio Córdova González"
                                        value={doc.nombre} onChange={e => setDocField('nombre', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>ID cuenta</label>
                                    <input type="text" placeholder="Ej: 359346-0"
                                        value={doc.id} onChange={e => setDocField('id', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>RUT</label>
                                    <input type="text" placeholder="Ej: 13.434.442-3"
                                        value={doc.rut} onChange={e => setDocField('rut', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Monto derivado a cobranza</label>
                                    <input type="text" inputMode="numeric"
                                        placeholder={formatCLP(result.capital)}
                                        value={doc.montoDerivado}
                                        onChange={e => {
                                            const raw = e.target.value.replace(/\D/g, '')
                                            setDocField('montoDerivado', raw === '' ? '' : Number(raw).toLocaleString('es-CL'))
                                        }} />
                                </div>
                                <div className="form-group">
                                    <label>Abono a capital clínico (opcional)</label>
                                    <input type="text" inputMode="numeric" placeholder="Ej: 183.486"
                                        value={doc.abonoClinico}
                                        onChange={e => {
                                            const raw = e.target.value.replace(/\D/g, '')
                                            setDocField('abonoClinico', raw === '' ? '' : Number(raw).toLocaleString('es-CL'))
                                        }} />
                                </div>
                                <div className="form-group doc-col-full">
                                    <label>Forma de pago / datos de transferencia</label>
                                    <textarea rows="7"
                                        value={doc.transferencia}
                                        onChange={e => setDocField('transferencia', e.target.value)} />
                                </div>
                            </div>
                        )}

                        <button className="btn-primary btn-word" onClick={handleGenerarWord}>
                            📄 Generar acuerdo en Word
                        </button>
                    </div>

                </div>
            )}
            </div>
        </div>
    )
}