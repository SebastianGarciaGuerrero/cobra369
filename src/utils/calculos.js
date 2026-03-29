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
 * Genera un acuerdo de pago con cuotas iguales.
 *
 * Interés: simple sobre capital total (misma cuota cada mes)
 * Honorarios por cuota: se aplica 3-6-9 sobre el monto de la cuota capital
 */


export function calcularAcuerdo({ capital, abonoInicial, cuotas, tasaMensual, uf }) {
    let capPIE = 0
    let honPIE = 0
    if (abonoInicial > 0) {
        const pie = calcularCapitalDesdeAbono(abonoInicial, uf)
        capPIE = pie.capital
        honPIE = pie.totalHonorarios
    }

    const capNuevo = capital - capPIE

    // Redondear cada componente individualmente
    const cuotaCap = Math.round(capNuevo / cuotas)
    const interesMes = Math.round(capNuevo * (tasaMensual / 100))
    const { totalHonorarios: honMesRaw, hon1, hon2, hon3,
        monto1, monto2, monto3, capitalUF: cuotaUF } =
        calcularHonorarios369(cuotaCap, uf)
    const honMes = Math.round(honMesRaw)

    // Total es la SUMA de partes redondeadas → siempre cuadra
    const totalCuota = cuotaCap + interesMes + honMes

    const honTotal = honMes * cuotas
    const interesTotal = interesMes * cuotas
    const totalPagare = totalCuota * cuotas

    const filas = Array.from({ length: cuotas }, (_, i) => ({
        nro: i + 1,
        capital: cuotaCap,
        interes: interesMes,
        honorarios: honMes,
        total: totalCuota,
    }))

    return {
        capital, capNuevo, cuotas, tasaMensual, uf,
        abonoInicial, capPIE, honPIE,
        cuotaCap, cuotaUF,
        interesMes, interesTotal,
        honMes, honTotal,
        hon1, hon2, hon3,
        monto1, monto2, monto3,
        totalCuota, totalPagare,
        totalCapital: capNuevo,
        filas,
    }
}