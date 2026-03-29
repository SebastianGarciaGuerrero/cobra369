const KEY = 'calccobro_uf'

export function guardarUF(valor) {
    const hoy = new Date().toISOString().split('T')[0]
    localStorage.setItem(KEY, JSON.stringify({ valor, fecha: hoy }))
}

export function cargarUF() {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return ''
        const { valor, fecha } = JSON.parse(raw)
        const hoy = new Date().toISOString().split('T')[0]
        return fecha === hoy ? valor : ''   // solo si es de hoy
    } catch {
        return ''
    }
}