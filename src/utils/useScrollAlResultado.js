import { useEffect, useRef } from 'react'

/**
 * En pantallas angostas el resultado queda DEBAJO del formulario y es fácil
 * no notarlo. Tras cada cálculo (cuando cambia `calcId`) cierra el teclado
 * y lleva la vista hasta el resultado. En escritorio no hace nada, porque
 * el resultado se muestra al lado del formulario.
 */
export function useScrollAlResultado(calcId, maxAncho = 960) {
    const ref = useRef(null)
    useEffect(() => {
        if (calcId === 0 || !ref.current) return
        if (!window.matchMedia(`(max-width: ${maxAncho}px)`).matches) return
        const activo = document.activeElement
        if (activo && activo.tagName === 'INPUT') activo.blur()
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [calcId, maxAncho])
    return ref
}
