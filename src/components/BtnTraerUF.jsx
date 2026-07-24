import { useState } from 'react'
import { traerUF, formatUF } from '../utils/fetchUF'

/**
 * Botón que trae la UF del día y la entrega ya formateada por callback.
 * onUF(valorFormateado) — ej: "40.844,79"
 */
export default function BtnTraerUF({ onUF }) {
    const [estado, setEstado] = useState('idle') // idle | cargando | error

    async function handle() {
        if (estado === 'cargando') return
        setEstado('cargando')
        const r = await traerUF()
        if (r) {
            onUF(formatUF(r.valor))
            setEstado('idle')
        } else {
            setEstado('error')
            setTimeout(() => setEstado('idle'), 2500)
        }
    }

    return (
        <button
            type="button"
            className={`btn-traer-uf ${estado}`}
            onClick={handle}
            disabled={estado === 'cargando'}
            title="Traer la UF de hoy automáticamente"
        >
            {estado === 'cargando' ? '···' : estado === 'error' ? 'sin conexión' : '↻ UF hoy'}
        </button>
    )
}
