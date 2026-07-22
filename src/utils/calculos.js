/**
 * Calcula honorarios extrajudiciales según tabla 3-6-9
 *
 * Lógica confirmada desde los Excel:
 *  - Se hace floor(capital / UF) para obtener UFs enteras
 *  - Tramo 1: hasta 10 UF → 9%
 *  - Tramo 2: de 11 a 50 UF (máx 40 UF) → 6%
 *  - Resto fraccionario (< 1 UF) → 3%
 *
 * @param {number} capital - Capital en pesos CLP
 * @param {number} uf      - Valor UF del día en pesos CLP
 */

export function calcularHonorarios369(capital, uf) {
    // Límites en pesos, NO en UF enteras
    const limite1 = 10 * uf   // hasta 10 UF
    const limite2 = 40 * uf   // tramo 2: 40 UF de ancho (de 11 a 50 UF)

    let monto1, monto2, monto3

    if (capital <= limite1) {
        // Capital cabe en tramo 1 → "inferior al tramo 1"
        monto1 = capital
        monto2 = 0
        monto3 = 0
    } else if (capital <= limite1 + limite2) {
        // Supera tramo 1, queda dentro de tramo 2 → "inferior al tramo 2"
        monto1 = limite1
        monto2 = capital - limite1
        monto3 = 0
    } else {
        // Supera tramo 1 y tramo 2, el resto va al 3%
        monto1 = limite1
        monto2 = limite2
        monto3 = capital - limite1 - limite2
    }

    const hon1 = monto1 * 0.09
    const hon2 = monto2 * 0.06
    const hon3 = monto3 * 0.03

    const totalHonorarios = hon1 + hon2 + hon3
    const totalDeuda = capital + totalHonorarios

    return {
        capital,
        uf,
        capitalUF: capital / uf,
        monto1, monto2, monto3,
        hon1, hon2, hon3,
        totalHonorarios,
        totalDeuda,
    }
}

/**
 * Calcula honorarios judiciales con tasa plana del 10%
 */
export function calcularHonorariosJudicial(capital, uf) {
    const honorarios = capital * 0.10
    return {
        capital,
        uf,
        capitalUF: uf ? capital / uf : null,
        monto1: capital,
        monto2: 0,
        monto3: 0,
        hon1: honorarios,
        hon2: 0,
        hon3: 0,
        totalHonorarios: honorarios,
        totalDeuda: capital + honorarios,
    }
}

/**
 * Formatea número a pesos chilenos
 */
export function formatCLP(n) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.round(n))
}

/**
 * Parsea string chileno a número
 * Acepta: "7.266.342", "39.731,72", "$39.731,72"
 */
export function parseCLPInput(str) {
    if (!str || str.trim() === '') return NaN
    const clean = str.replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.')
    return parseFloat(clean)
}


/**
 * Dado un abono total, calcula cuánto es capital y cuánto son honorarios.
 * Usa búsqueda binaria porque la función de honorarios no es trivialmente invertible.
 *
 * abono = capital + honorarios(capital, UF)
 */
export function calcularCapitalDesdeAbono(abono, uf) {
    if (abono <= 0 || uf <= 0) return null

    let lo = 0
    let hi = abono

    for (let i = 0; i < 120; i++) {
        const mid = (lo + hi) / 2
        const { totalHonorarios } = calcularHonorarios369(mid, uf)
        const total = mid + totalHonorarios
        if (total < abono) lo = mid
        else hi = mid
    }

    const capital = lo
    const { totalHonorarios, hon1, hon2, hon3, monto1, monto2, monto3, capitalUF } =
        calcularHonorarios369(capital, uf)

    return {
        abono,
        capital,
        capitalUF,
        totalHonorarios,
        hon1, hon2, hon3,
        monto1, monto2, monto3,
    }
}

/**
 * Dado un abono total (judicial 10%), calcula capital y honorarios.
 * abono = capital * 1.10  →  capital = abono / 1.10
 */
export function calcularCapitalDesdeAbonoJudicial(abono, uf) {
    if (abono <= 0) return null
    const capital = abono / 1.10
    const honorarios = capital * 0.10
    return {
        abono,
        capital,
        capitalUF: uf ? capital / uf : null,
        totalHonorarios: honorarios,
        hon1: honorarios,
        hon2: 0,
        hon3: 0,
        monto1: capital,
        monto2: 0,
        monto3: 0,
    }
}

/**
 * Genera un acuerdo de pago con cuotas iguales.
 *
 * Interés: simple sobre capital total (misma cuota cada mes)
 * Honorarios por cuota: se aplica 3-6-9 sobre el monto de la cuota capital
 */


/** Comisión de la pasarela de pago Flow */
export const COMISION_FLOW_PCT = 2.2491

export function calcularAcuerdo({ capital, abonoInicial, cuotas, tasaMensual, uf, modalidad = 'extrajudicial', gastosJudiciales = 0, comisionFlow = false }) {
    const calcHon = modalidad === 'judicial'
        ? (cap) => calcularHonorariosJudicial(cap, uf)
        : (cap) => calcularHonorarios369(cap, uf)

    const calcAbono = modalidad === 'judicial'
        ? (abono) => calcularCapitalDesdeAbonoJudicial(abono, uf)
        : (abono) => calcularCapitalDesdeAbono(abono, uf)

    // Todo se trabaja en pesos ENTEROS para que las columnas sumen exacto
    let capPIE = 0
    let honPIE = 0
    if (abonoInicial > 0) {
        const pie = calcAbono(abonoInicial)
        capPIE = Math.round(pie.capital)
        honPIE = Math.round(abonoInicial) - capPIE   // capPIE + honPIE = abono exacto
    }

    // capPIE + capNuevo = capital exacto (la clínica recibe el capital completo)
    const capNuevo = Math.round(capital) - capPIE

    // Redondear cada componente individualmente
    const cuotaCap = Math.round(capNuevo / cuotas)
    const interesMes = Math.round(capNuevo * (tasaMensual / 100))
    const { totalHonorarios: honMesRaw, hon1, hon2, hon3,
        monto1, monto2, monto3, capitalUF: cuotaUF } =
        calcHon(cuotaCap)
    const honMes = Math.round(honMesRaw)
    const gastosJudPorCuota = (modalidad === 'judicial' && gastosJudiciales > 0)
        ? Math.round(gastosJudiciales / cuotas)
        : 0

    // Comisión Flow: % sobre el saldo capital, repartido en las cuotas
    const comisionFlowTotal = comisionFlow
        ? Math.round(capital * COMISION_FLOW_PCT / 100)
        : 0
    const flowPorCuota = comisionFlow ? Math.round(comisionFlowTotal / cuotas) : 0

    // Total es la SUMA de partes redondeadas → siempre cuadra
    const totalCuota = cuotaCap + interesMes + honMes + gastosJudPorCuota + flowPorCuota

    // La última cuota ABSORBE el resto del capital para que la suma dé
    // EXACTO (la clínica recibe el capital completo, sin perder pesos).
    // Esa diferencia se compensa en el interés de la última cuota, así su
    // total sigue siendo idéntico al del resto.
    const capUltima = capNuevo - cuotaCap * (cuotas - 1)
    const diffCap = capUltima - cuotaCap            // puede ser + o −
    const interesUltima = interesMes - diffCap      // mantiene igual el total

    const honTotal = honMes * cuotas
    const interesTotal = interesMes * (cuotas - 1) + interesUltima
    const totalPagare = totalCuota * cuotas

    const filas = Array.from({ length: cuotas }, (_, i) => {
        const esUltima = i === cuotas - 1
        return {
            nro: i + 1,
            capital: esUltima ? capUltima : cuotaCap,
            interes: esUltima ? interesUltima : interesMes,
            honorarios: honMes,
            gastosJud: gastosJudPorCuota,
            flow: flowPorCuota,
            total: totalCuota,
        }
    })

    return {
        capital, capNuevo, cuotas, tasaMensual, uf,
        abonoInicial, capPIE, honPIE,
        cuotaCap, capUltima, diffCap, cuotaUF,
        interesMes, interesUltima, interesTotal,
        honMes, honTotal,
        hon1, hon2, hon3,
        monto1, monto2, monto3,
        gastosJudiciales, gastosJudPorCuota,
        gastosJudTotal: gastosJudPorCuota * cuotas,
        comisionFlow, comisionFlowPct: COMISION_FLOW_PCT, comisionFlowTotal,
        flowPorCuota, flowTotal: flowPorCuota * cuotas,
        totalCuota, totalPagare,
        totalCapital: capNuevo,
        filas,
    }
}