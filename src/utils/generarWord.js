/**
 * Genera el documento Word del acuerdo de pago, replicando el formato
 * usado por el estudio (ver acuerdos de FILIAL SANTIAGO / ELQUI).
 *
 * Se produce un archivo .doc (HTML con namespaces de Office) que Word
 * abre directamente y permite editar/guardar como .docx.
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Texto de pago por filial. Santiago opera con descuento automático. */
const porTransferencia = (razon, rut, banco, cuenta, correo) =>
    `Dichas cuotas deberán ser pagadas por transferencia electrónica a la cuenta:\n` +
    `Razón Social: ${razon}\n` +
    `RUT: ${rut}\n` +
    `Banco: ${banco}\n` +
    `Cuenta corriente: ${cuenta}\n` +
    `Correo: ${correo}\n` +
    `Asunto: RUT y/o ID cuenta.`

export const FILIALES = {
    SANTIAGO: {
        label: 'Santiago — Clínica Bicentenario',
        transferencia:
            'Los pagos se realizarán mediante enrolamiento de tarjeta de crédito o débito, ' +
            'quedando las cuotas afectas a descuento automático. Dicho cobro se efectuará ' +
            'los días 5 de cada mes, hasta completar el total de las cuotas pactadas en el presente acuerdo.',
    },
    IQUIQUE: {
        label: 'Iquique — Clínica Iquique',
        transferencia: porTransferencia('Clínica Iquique S.A.', '96.598.850-5', 'Banco de Chile', '107-01934-05', 'pagocuentas.iquique@redsalud.cl'),
    },
    ELQUI: {
        label: 'Elqui — Clínica Regional del Elqui',
        transferencia: porTransferencia('Clínica Regional del Elqui SPA', '99.533.790-8', 'Banco de Chile', '00-120-10118-01', 'pagocuentas.elqui@redsalud.cl'),
    },
    VALPARAISO: {
        label: 'Valparaíso — Clínica Valparaíso',
        transferencia: porTransferencia('Clínica Valparaíso SPA', '99.568.720-8', 'Banco de Chile', '00-149-02051-01', 'pagocuentas.valparaiso@redsalud.cl'),
    },
    RANCAGUA: {
        label: 'Rancagua — Clínica de Salud Integral',
        transferencia: porTransferencia('Clínica de Salud Integral S.A.', '78.918.290-6', 'Banco BCI', '56086270', 'pagocuentas.rancagua@redsalud.cl'),
    },
    TEMUCO: {
        label: 'Temuco — Inmobiliaria Inversalud',
        transferencia: porTransferencia('Inmobiliaria Inversalud SPA', '96.774.580-4', 'BCI', '66048559', 'pagocuentas.temuco@redsalud.cl'),
    },
    MAGALLANES: {
        label: 'Magallanes — Clínica Magallanes',
        transferencia: porTransferencia('Clínica Magallanes SPA', '96.567.920-0', 'Banco BCI', '71040960', 'pagocuentas.magallanes@redsalud.cl'),
    },
}

/** "01 julio 2026" */
export function fechaLarga(date) {
    const d = String(date.getDate()).padStart(2, '0')
    return `${d} ${MESES[date.getMonth()]} ${date.getFullYear()}`
}

/** "05-08-26" (formato de la tabla del acuerdo) */
function fechaCorta(date) {
    if (!date) return ''
    const d = String(date.getDate()).padStart(2, '0')
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const y = String(date.getFullYear()).slice(-2)
    return `${d}-${m}-${y}`
}

/** "05-07-2026" → "05-07-26" */
function acortarFechaTexto(str) {
    if (!str) return ''
    const partes = str.trim().split('-')
    if (partes.length !== 3) return str
    return `${partes[0]}-${partes[1]}-${partes[2].slice(-2)}`
}

const miles = (n) => Math.round(n).toLocaleString('es-CL')
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * @param {object} p
 * @param {object} p.result       resultado de calcularAcuerdo
 * @param {Date[]} p.fechas       vencimiento de cada cuota
 * @param {object} p.doc          datos del documento (deudor, filial, etc.)
 * @param {string} p.textoCuotas  párrafo de cuotas ya redactado
 * @param {string} p.fechaAbono   fecha del PIE (DD-MM-YYYY) o ''
 * @param {number} p.totalCuota   monto de cada cuota (ajustado)
 * @param {number} p.granTotal    total del pagaré (incluye PIE)
 * @param {boolean} p.conGastos   modalidad judicial
 * @param {boolean} p.conFlow     comisión Flow activa
 * @param {boolean} p.pie30       el PIE corresponde al 30%
 */
export function construirAcuerdoHTML({
    result, fechas, doc, textoCuotas, fechaAbono,
    totalCuota, granTotal, conGastos, conFlow, pie30,
}) {
    const conPIE = result.abonoInicial > 0
    const nombre = esc(doc.nombre || '_______________')
    const tratamiento = doc.tratamiento || 'don'

    // ── Encabezado de la tabla ──
    const headers = [
        'N° CUOTAS', 'FECHA', 'MONTO ABONO CLÍNICA', 'INTERÉS',
        conGastos ? 'HONORARIOS' : 'GASTO COBRANZA',
        ...(conGastos ? ['GASTOS JUDICIALES'] : []),
        ...(conFlow ? ['COMISIÓN FLOW'] : []),
        'MONTO TOTAL CUOTA',
    ]

    const th = 'border:1px solid #000;padding:4px 6px;text-align:center;font-weight:bold;font-size:9pt;font-family:Arial,sans-serif;'
    const td = 'border:1px solid #000;padding:3px 6px;text-align:center;font-size:9pt;font-family:Arial,sans-serif;'
    const tdb = td + 'font-weight:bold;'

    const filaPIE = conPIE ? `<tr>
        <td style="${tdb}">PIE${pie30 ? ' (30%)' : ''}</td>
        <td style="${td}">${esc(acortarFechaTexto(fechaAbono))}</td>
        <td style="${td}">${miles(result.capPIE)}</td>
        <td style="${td}">0</td>
        <td style="${td}">${miles(result.honPIE)}</td>
        ${conGastos ? `<td style="${td}">0</td>` : ''}
        ${conFlow ? `<td style="${td}">0</td>` : ''}
        <td style="${tdb}">${miles(result.abonoInicial)}</td>
    </tr>` : ''

    const filasCuotas = result.filas.map((f, i) => `<tr>
        <td style="${td}">${f.nro}</td>
        <td style="${td}">${fechaCorta(fechas[i])}</td>
        <td style="${td}">${miles(f.capital)}</td>
        <td style="${td}">${miles(f.interes + (totalCuota - result.totalCuota))}</td>
        <td style="${td}">${miles(f.honorarios)}</td>
        ${conGastos ? `<td style="${td}">${miles(f.gastosJud)}</td>` : ''}
        ${conFlow ? `<td style="${td}">${miles(f.flow)}</td>` : ''}
        <td style="${tdb}">${miles(totalCuota)}</td>
    </tr>`).join('')

    const filaTotal = `<tr>
        <td colspan="${headers.length - 1}" style="${tdb}text-align:center;">TOTAL</td>
        <td style="${tdb}">${miles(granTotal)}</td>
    </tr>`

    const tabla = `<table style="border-collapse:collapse;width:100%;margin:12pt 0;">
        <tr>${headers.map(h => `<th style="${th}">${h}</th>`).join('')}</tr>
        ${filaPIE}${filasCuotas}${filaTotal}
    </table>`

    // ── Párrafos de apertura (dos variantes según los acuerdos reales) ──
    const montoDerivado = doc.montoDerivado ? `$${miles(doc.montoDerivado)}` : '$_______'
    let parrafo1, parrafo2

    if (doc.abonoClinico > 0) {
        const saldo = doc.montoDerivado - doc.abonoClinico
        parrafo1 = `Don ${nombre} ID ${esc(doc.id)} RUT ${esc(doc.rut)} pasa a cobranza del Estudio Jurídico Hadad &amp; Asociados por un monto de ${montoDerivado} y luego de un abono a capital clínico de $${miles(doc.abonoClinico)} queda un saldo remanente de $${miles(saldo)}.`
        parrafo2 = `De acuerdo a este saldo pendiente las partes hemos acordado celebrar el siguiente acuerdo, ${tratamiento} ${nombre} se obliga a pagar la deuda antes descrita de la siguiente forma:`
    } else {
        parrafo1 = `Se informa que la cuenta de ${tratamiento} ${nombre} ID ${esc(doc.id)} RUT ${esc(doc.rut)} ha sido derivada para su regularización al Estudio Jurídico Hadad &amp; Asociados por el monto de ${montoDerivado}.`
        parrafo2 = `Sobre este monto pendiente las partes hemos acordado celebrar el siguiente acuerdo, en donde ${tratamiento} ${nombre} se obliga a pagar la deuda antes descrita de la siguiente forma:`
    }

    const p = 'font-family:Arial,sans-serif;font-size:11pt;text-align:justify;margin:0 0 10pt 0;line-height:1.4;'
    const centro = 'font-family:Arial,sans-serif;font-size:11pt;text-align:center;margin:0 0 6pt 0;font-weight:bold;'

    // Bloque de pago: párrafo simple (Santiago) o ficha con los datos bancarios
    const bloquePago = (() => {
        const lineas = String(doc.transferencia || '').split('\n').map(l => l.trim()).filter(Boolean)
        if (lineas.length <= 1) return `<p style="${p}">${esc(lineas[0] || '')}</p>`
        const items = lineas.slice(1).map(l => {
            const i = l.indexOf(':')
            if (i < 0) return `<div>${esc(l)}</div>`
            return `<div><b>${esc(l.slice(0, i + 1))}</b> ${esc(l.slice(i + 1).trim())}</div>`
        }).join('')
        return `<p style="${p}margin-bottom:6pt;">${esc(lineas[0])}</p>
        <table style="border-collapse:collapse;margin:0 0 12pt 14pt;"><tr>
        <td style="border-left:3px solid #555;background:#f2f2f2;padding:8pt 14pt;font-family:Arial,sans-serif;font-size:10.5pt;line-height:1.7;">${items}</td>
        </tr></table>`
    })()

    const cuerpo = `
    <p style="${p}margin-bottom:0;">COB. ${esc(doc.numeroCob || '*')}</p>
    <p style="${p}margin-bottom:0;">${esc(doc.fechaDoc)}</p>
    <p style="${p}">FILIAL ${esc(doc.filialNombre)}</p>

    <p style="${centro}font-size:13pt;margin:16pt 0 14pt 0;"><u>ACUERDO DE PAGO</u></p>

    <p style="${p}">${parrafo1}</p>
    <p style="${p}">${parrafo2}</p>

    <p style="${centro}margin-top:12pt;">PAGARÉ EN CUOTAS A REALIZAR</p>
    <p style="${centro}">TOTAL PAGARÉ: $${miles(granTotal)}</p>

    <p style="${p}">${esc(textoCuotas || '')}</p>
    ${bloquePago}

    ${tabla}

    <p style="${p}margin-top:14pt;">SOLICITAMOS Se sirva tener por presentado el presente acuerdo, prestarle su aprobación y redactar en la filial el documento que debe firmar el deudor.</p>
    `

    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Acuerdo de pago</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>@page { size: 21cm 29.7cm; margin: 2.2cm 2.2cm; } body { font-family: Arial, sans-serif; }</style>
</head><body>${cuerpo}</body></html>`
}

/** Descarga el HTML como archivo .doc */
export function descargarWord(html, nombreArchivo) {
    const blob = new Blob(['﻿', html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
