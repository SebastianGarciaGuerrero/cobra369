/**
 * Trae la UF del día desde varias fuentes con respaldo automático.
 * Todas permiten CORS, así que funciona directo desde el navegador sin
 * backend. Si la primera fuente falla o se cae, prueba la siguiente.
 *
 * Fuentes (verificadas coincidentes con el SII):
 *   1. mindicador.cl
 *   2. api.boostr.cl
 */

const FUENTES = [
    {
        nombre: 'mindicador.cl',
        url: 'https://mindicador.cl/api/uf',
        extraer: (d) => {
            const s = d && d.serie && d.serie[0]
            return s ? { valor: s.valor, fecha: (s.fecha || '').slice(0, 10) } : null
        },
    },
    {
        nombre: 'boostr.cl',
        url: 'https://api.boostr.cl/economy/indicators.json',
        extraer: (d) => {
            const u = d && d.data && d.data.uf
            return u ? { valor: u.value, fecha: u.date } : null
        },
    },
]

async function pedir(fuente, timeoutMs = 6000) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
        const resp = await fetch(fuente.url, { signal: ctrl.signal })
        if (!resp.ok) return null
        const data = await resp.json()
        const r = fuente.extraer(data)
        return r && r.valor > 0 ? { ...r, fuente: fuente.nombre } : null
    } catch {
        return null
    } finally {
        clearTimeout(t)
    }
}

/** Formatea 40844.79 → "40.844,79" (formato chileno del input) */
export function formatUF(valor) {
    return valor.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Devuelve { valor, fecha, fuente } o null si todas las fuentes fallan */
export async function traerUF() {
    for (const f of FUENTES) {
        const r = await pedir(f)
        if (r) return r
    }
    return null
}
