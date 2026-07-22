/**
 * Genera el documento Word del acuerdo de pago, replicando el formato
 * usado por el estudio (ver acuerdos de FILIAL SANTIAGO / ELQUI).
 *
 * Se produce un archivo .doc en formato MHTML (multipart/related) con el
 * logo embebido: Word lo abre directamente y muestra la imagen.
 */

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Correo al que se envían todos los comprobantes */
const CORREO_ESTUDIO = 'recepcion@hadadyasociados.cl'

/** Texto de pago por filial. Santiago opera con descuento automático. */
const porTransferencia = (razon, rut, banco, cuenta) =>
    `Dichas cuotas deberán ser pagadas por transferencia electrónica a la cuenta:\n` +
    `Razón Social: ${razon}\n` +
    `RUT: ${rut}\n` +
    `Banco: ${banco}\n` +
    `Cuenta corriente: ${cuenta}\n` +
    `Correo: ${CORREO_ESTUDIO}\n` +
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
        transferencia: porTransferencia('Clínica Iquique S.A.', '96.598.850-5', 'Banco de Chile', '107-01934-05'),
    },
    ELQUI: {
        label: 'Elqui — Clínica Regional del Elqui',
        transferencia: porTransferencia('Clínica Regional del Elqui SPA', '99.533.790-8', 'Banco de Chile', '00-120-10118-01'),
    },
    VALPARAISO: {
        label: 'Valparaíso — Clínica Valparaíso',
        transferencia: porTransferencia('Clínica Valparaíso SPA', '99.568.720-8', 'Banco de Chile', '00-149-02051-01'),
    },
    RANCAGUA: {
        label: 'Rancagua — Clínica de Salud Integral',
        transferencia: porTransferencia('Clínica de Salud Integral S.A.', '78.918.290-6', 'Banco BCI', '56086270'),
    },
    TEMUCO: {
        label: 'Temuco — Inmobiliaria Inversalud',
        transferencia: porTransferencia('Inmobiliaria Inversalud SPA', '96.774.580-4', 'BCI', '66048559'),
    },
    MAGALLANES: {
        label: 'Magallanes — Clínica Magallanes',
        transferencia: porTransferencia('Clínica Magallanes SPA', '96.567.920-0', 'Banco BCI', '71040960'),
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

/** Nombre con que se referencia el logo dentro del documento */
const LOGO_NOMBRE = 'logo-hadad.png'

const FUENTE = "'Times New Roman', Times, serif"

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

    // ── Tabla de cuotas: compacta y sin quiebres de línea ──
    const headers = [
        'N° CUOTAS', 'FECHA', 'MONTO ABONO CLÍNICA', 'INTERÉS',
        conGastos ? 'HONORARIOS' : 'GASTO COBRANZA',
        ...(conGastos ? ['GASTOS JUDICIALES'] : []),
        ...(conFlow ? ['COMISIÓN FLOW'] : []),
        'MONTO TOTAL CUOTA',
    ]

    // Propiedades mso-* : Word las respeta y permiten comprimir la tabla
    // (altura de fila exacta, padding interno mínimo, sin interlineado extra)
    const celda = `border:1px solid #000;padding:0.5pt 3pt;text-align:center;` +
        `font-size:8.5pt;font-family:${FUENTE};white-space:nowrap;` +
        `mso-line-height-rule:exactly;line-height:9.5pt;vertical-align:middle;`
    const th = celda + 'font-weight:bold;background:#e9e9e9;font-size:7.5pt;'
    const td = celda
    const tdb = celda + 'font-weight:bold;'
    // Fila con altura exacta: evita que Word la "engorde"
    const filaAlt = ' style="height:10pt;mso-height-rule:exactly;"'

    const filaPIE = conPIE ? `<tr${filaAlt}>
        <td style="${tdb}">PIE${pie30 ? ' (30%)' : ''}</td>
        <td style="${td}">${esc(acortarFechaTexto(fechaAbono))}</td>
        <td style="${td}">${miles(result.capPIE)}</td>
        <td style="${td}">0</td>
        <td style="${td}">${miles(result.honPIE)}</td>
        ${conGastos ? `<td style="${td}">0</td>` : ''}
        ${conFlow ? `<td style="${td}">0</td>` : ''}
        <td style="${tdb}">${miles(result.abonoInicial)}</td>
    </tr>` : ''

    const filasCuotas = result.filas.map((f, i) => `<tr${filaAlt}>
        <td style="${td}">${f.nro}</td>
        <td style="${td}">${fechaCorta(fechas[i])}</td>
        <td style="${td}">${miles(f.capital)}</td>
        <td style="${td}">${miles(f.interes + (totalCuota - result.totalCuota))}</td>
        <td style="${td}">${miles(f.honorarios)}</td>
        ${conGastos ? `<td style="${td}">${miles(f.gastosJud)}</td>` : ''}
        ${conFlow ? `<td style="${td}">${miles(f.flow)}</td>` : ''}
        <td style="${tdb}">${miles(totalCuota)}</td>
    </tr>`).join('')

    const filaTotal = `<tr${filaAlt}>
        <td colspan="${headers.length - 1}" style="${tdb}text-align:center;">TOTAL</td>
        <td style="${tdb}">${miles(granTotal)}</td>
    </tr>`

    const tabla = `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:0 0 16pt 0;` +
        `mso-table-lspace:0pt;mso-table-rspace:0pt;mso-padding-alt:0pt 3pt 0pt 3pt;mso-table-layout-alt:fixed;">
        <thead><tr${filaAlt}>${headers.map(h => `<th style="${th}">${h}</th>`).join('')}</tr></thead>
        <tbody>${filaPIE}${filasCuotas}${filaTotal}</tbody>
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

    const p = `font-family:${FUENTE};font-size:12pt;text-align:justify;margin:0 0 14pt 0;line-height:1.5;`
    const centro = `font-family:${FUENTE};font-size:12pt;text-align:center;margin:0;font-weight:bold;line-height:1.5;`

    // ── Bloque de pago: párrafo simple (Santiago) o ficha bancaria ──
    const bloquePago = (() => {
        const lineas = String(doc.transferencia || '').split('\n').map(l => l.trim()).filter(Boolean)
        if (lineas.length <= 1) return `<p style="${p}">${esc(lineas[0] || '')}</p>`
        const items = lineas.slice(1).map(l => {
            const i = l.indexOf(':')
            if (i < 0) return `<div>${esc(l)}</div>`
            return `<div><b>${esc(l.slice(0, i + 1))}</b> ${esc(l.slice(i + 1).trim())}</div>`
        }).join('')
        return `<p style="${p}margin-bottom:8pt;">${esc(lineas[0])}</p>
        <table style="border-collapse:collapse;margin:0 0 14pt 18pt;"><tr>
        <td style="border-left:3px solid #555;background:#f2f2f2;padding:8pt 16pt;font-family:${FUENTE};font-size:11pt;line-height:1.6;white-space:nowrap;">${items}</td>
        </tr></table>`
    })()

    // ── Encabezado de página (se repite en todas las hojas) ──
    // Primera hoja: logo a la izquierda + COB/fecha/filial a la derecha.
    // Hojas siguientes: solo el logo, para que el membrete no se pierda.
    const imgLogo = `<img src="${LOGO_NOMBRE}" width="96" height="123" alt="Hadad &amp; Asociados" />`

    const headerPrimera = `<div style="mso-element:header" id="fh1">
    <table style="width:100%;border-collapse:collapse;">
    <tr>
        <td style="padding:0;vertical-align:top;width:40%;">${imgLogo}</td>
        <td style="padding:0;vertical-align:top;text-align:right;font-family:${FUENTE};font-size:12pt;line-height:1.6;">
            COB. ${esc(doc.numeroCob || '*')}<br />
            ${esc(doc.fechaDoc)}<br />
            FILIAL ${esc(doc.filialNombre)}
        </td>
    </tr>
    </table>
    <p class="MsoHeader" style="margin:0;font-size:1pt;">&nbsp;</p>
    </div>`

    const headerResto = `<div style="mso-element:header" id="h1">
    <p class="MsoHeader" style="margin:0;">${imgLogo}</p>
    </div>`

    const cuerpo = `
    <p style="${centro}font-size:14pt;margin:0 0 24pt 0;"><u>ACUERDO DE PAGO</u></p>

    <p style="${p}">${parrafo1}</p>
    <p style="${p}">${parrafo2}</p>

    <p style="${centro}margin-top:20pt;">PAGARÉ EN CUOTAS A REALIZAR</p>
    <p style="${centro}margin-bottom:18pt;">TOTAL PAGARÉ: $${miles(granTotal)}</p>

    <p style="${p}">${esc(textoCuotas || '')}</p>
    ${bloquePago}

    ${tabla}

    <p style="${p}margin-top:20pt;">SOLICITAMOS Se sirva tener por presentado el presente acuerdo, prestarle su aprobación y redactar en la filial el documento que debe firmar el deudor.</p>
    `

    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Acuerdo de pago</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
@page Section1 {
    size: 21.0cm 29.7cm;
    margin: 4.4cm 2.2cm 2.0cm 2.2cm;
    mso-header-margin: 1.0cm;
    mso-footer-margin: 1.0cm;
    mso-title-page: yes;
    mso-first-header: url("acuerdo.htm") fh1;
    mso-header: url("acuerdo.htm") h1;
    mso-paper-source: 0;
}
div.Section1 { page: Section1; }
p.MsoHeader { margin: 0; font-family: ${FUENTE}; font-size: 12pt; }
body { font-family: ${FUENTE}; font-size: 12pt; }
td, th, p, div { font-family: ${FUENTE}; }
</style>
</head><body>
<div class="Section1">${cuerpo}
${headerPrimera}
${headerResto}
</div>
</body></html>`
}

/** base64 de un string UTF-8 */
function b64Texto(str) {
    const bytes = new TextEncoder().encode(str)
    let bin = ''
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin)
}

/** Parte el base64 en líneas de 76 caracteres (estándar MIME) */
const enLineas = (b64) => (b64.match(/.{1,76}/g) || []).join('\r\n')

/** Descarga la imagen del logo y la devuelve en base64 */
export async function cargarLogoBase64(url) {
    try {
        const resp = await fetch(url)
        const buf = new Uint8Array(await resp.arrayBuffer())
        let bin = ''
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
        return btoa(bin)
    } catch {
        return null
    }
}

/**
 * Descarga el acuerdo como archivo .doc.
 *
 * Si hay logo se arma un MHTML (multipart/related) con la imagen como
 * parte separada: es la única forma en que Word muestra la imagen de
 * manera confiable (los data: URI no los renderiza).
 */
export function descargarWord(html, nombreArchivo, logoBase64) {
    let contenido
    if (logoBase64) {
        const b = '----=_NextPart_HADAD_ACUERDO'
        const base = 'file:///C:/acuerdo/'
        contenido =
            'MIME-Version: 1.0\r\n' +
            `Content-Type: multipart/related; type="text/html"; boundary="${b}"\r\n\r\n` +
            `--${b}\r\n` +
            'Content-Type: text/html; charset="utf-8"\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            `Content-Location: ${base}acuerdo.htm\r\n\r\n` +
            enLineas(b64Texto(html)) + '\r\n\r\n' +
            `--${b}\r\n` +
            'Content-Type: image/png\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            `Content-Location: ${base}${LOGO_NOMBRE}\r\n\r\n` +
            enLineas(logoBase64) + '\r\n\r\n' +
            `--${b}--\r\n`
    } else {
        contenido = '﻿' + html
    }

    const blob = new Blob([contenido], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
