import { useEffect, useRef } from 'react'

/**
 * En pantallas angostas el resultado queda DEBAJO del formulario y es fácil
 * no notarlo. Tras cada cálculo (cuando cambia `calcId`), si el resultado
 * quedó fuera de la vista, cierra el teclado y desplaza la página hasta él.
 * En escritorio el resultado aparece al lado del formulario (ya visible),
 * así que no hace nada.
 */
export function useScrollAlResultado(calcId) {
    const ref = useRef(null)
    useEffect(() => {
        if (calcId === 0 || !ref.current) return
        const { top } = ref.current.getBoundingClientRect()
        const visible = top >= 0 && top < window.innerHeight * 0.6
        if (visible) return
        const activo = document.activeElement
        if (activo && activo.tagName === 'INPUT') activo.blur()
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [calcId])
    return ref
}
